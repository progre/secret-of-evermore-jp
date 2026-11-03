/** 固定テキストの訳文を ROM の拡張領域へ組み込む */

import type { TextCodec } from "@core";
import { base, block, readStrings, relocate, retargetBank } from "./fixed.ts";
import type { Untranslated } from "./place.ts";
import { move as moveInline } from "./references/mod.ts";

/** 固定テキストの組み込みに使う符号 */
interface FixedCodecs {
  /** 原版の文字列を読む */
  original: TextCodec;
  /** 訳さずに残す文字列を書き直す。字は原版のまま、制御コードは再配置した値で書く */
  relocated: TextCodec;
  /** 訳文を書く */
  japanese: TextCodec;
}

/**
 * 描画ルーチンは `0x81`-`0x9F` と `0xE0`-`0xEF` を Shift-JIS の第 1 バイトとして読む。
 * 訳さずに残す文字列の制御コードも、元の値のままでは文字として解釈される。
 */
function relocateControls(codecs: FixedCodecs): Untranslated {
  return (bytes) => codecs.relocated.encode(codecs.original.decode(bytes)).bytes;
}

/** 原版の区画を指す 16bit オフセットの範囲 */
const originalRange = { start: block.start - base, end: block.end - base };

const fixedBank = 0x3f0000;

/**
 * 固定テキストの移設先。
 * 原版の区画は前後を別のデータに挟まれ、空きが 2 バイトしかない。
 * 日本語は入らないため拡張領域へ移す。
 * 16bit オフセットで参照されるためバンクの先頭に置き、原版の区画にあたる範囲の手前で止める。
 */
export const fixedTextRegion = { name: "fixed_text", size: originalRange.start, at: fixedBank };

/**
 * 原版のオフセットのまま移設先のバンクを読む参照を、表示ルーチンが新しい位置へ読み替える表
 * （`packages/app/patch/base/fixed-redirect.s`）。移設先のバンクの外に置く。
 * バンクを積み直さずにオフセットだけ替えて読む参照が `$781E` 以降を指すため、
 * 移設先のバンクの空きは 0 のまま残し、空の文字列として読ませる。
 */
export const fixedRedirectRegion = {
  name: "fixed_redirect",
  size: (originalRange.end - originalRange.start) * 2,
};

/**
 * 数の後ろに後半をつなぐ知らせの件（`packages/app/patch/options/notice-tail.s`）。
 * パッチは最初の終端の次を後半として読むため、訳文に終端 `{00}` が要る。
 * 無いと、次の文字列を後半としてつないでしまう。
 */
const splitNotices = [497, 498, 499, 500, 501, 502];

function checkSplitNotices(bodies: Map<number, Uint8Array>): void {
  const unsplit = splitNotices.filter((index) => !(bodies.get(index)?.includes(0) ?? false));
  if (unsplit.length > 0) {
    throw new Error("前半と後半を {00} で分けていない知らせ: 第 " + unsplit.join("、") + " 件");
  }
}

/** 置き場所。`start` と `end` はファイルオフセット、`address` は先頭の SNES アドレス */
type Area = { start: number; end: number; address: number };

/**
 * 原版のオフセットごとに、移した先のオフセットを 16bit で並べる。
 * 文字列の途中を指すオフセットも、その文字列の先頭へ読み替える。
 * 文字列の外は 0xFFFF にし、読み替えない。0 は移した先の先頭の文字列を指すため印に使えない。
 */
export function redirectTable(
  strings: { offset: number; length: number }[],
  moved: Map<number, number>,
  range: { start: number; end: number },
): Uint8Array {
  const table = new Uint8Array((range.end - range.start) * 2).fill(0xff);
  const view = new DataView(table.buffer);
  for (const entry of strings) {
    const to = moved.get(entry.offset);
    if (to == null) continue;
    for (let at = entry.offset; at < entry.offset + entry.length; at += 1) {
      view.setUint16((at - range.start) * 2, to, true);
    }
  }
  return table;
}

/**
 * 固定テキストの訳文を Shift-JIS のバイト列にする。
 * 空の件は未訳とみなして対象から外す。原文をそのまま残せるようにするためである。
 */
function encodeFixed(script: Map<number, string>, japanese: TextCodec) {
  const bodies = new Map<number, Uint8Array>();
  const missing = new Map<number, string[]>();
  for (const [index, text] of script) {
    if (text === "") continue;
    const encoded = japanese.encode(text);
    bodies.set(index, encoded.bytes);
    if (encoded.missing.length > 0) missing.set(index, encoded.missing);
  }
  return { bodies, missing };
}

interface Installed {
  /** 移した文字列の本数 */
  count: number;
  used: number;
  capacity: number;
  bank: number;
  /** 向け直した、バンクを積む直値の数 */
  retargeted: number;
  /** 文字集合に無い字。件ごとにまとめる */
  missing: Map<number, string[]>;
}

/**
 * 固定テキストの訳文 `translations` を ROM に組み込む。
 * 訳文を `area` に置き、固定テキストを参照するコードのバンクの値を `area` のバンクに書き換える。
 * 最後に、読み替え表を `redirect` に書く
 */
export function installFixedText(
  rom: Uint8Array,
  translations: Map<number, string>,
  codecs: FixedCodecs,
  area: Area,
  redirect: Area,
): Installed {
  const script = encodeFixed(translations, codecs.japanese);
  const untranslated = relocateControls(codecs);
  checkSplitNotices(script.bodies);
  // バンクの書き換えは ROM 全体を走査するため、訳文を置く前に済ませる。
  // 逆順にすると、訳文のバイト列がたまたま同じ並びになったとき壊してしまう。
  const bank = (area.address >> 16) & 0xff;
  const strings = readStrings(rom);
  const retargeted = retargetBank(rom, bank);
  const placed = relocate(rom, script.bodies, untranslated, {
    start: area.start,
    end: area.end,
    base: area.start,
  });
  const lengths = strings.map((entry) => ({ offset: entry.offset, length: entry.bytes.length }));
  rom.set(redirectTable(lengths, placed.moved, originalRange), redirect.start);
  // 直値で参照される分は件の番号が区画の後ろに続くため、置き場所も後ろへ続ける
  const inlineBodies = new Map(
    Array.from(script.bodies).flatMap((pair) =>
      pair[0] >= strings.length ? [[pair[0] - strings.length, pair[1]] as const] : []
    ),
  );
  const inline = moveInline(rom, inlineBodies, untranslated, {
    start: placed.next,
    end: area.end,
    base: area.start,
    bank,
  });
  return {
    count: strings.length + inline.count,
    used: placed.used + inline.used,
    capacity: placed.capacity,
    bank,
    retargeted,
    missing: script.missing,
  };
}
