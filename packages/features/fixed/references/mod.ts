/**
 * 直値でポインタを組み立てて固定テキストを参照する箇所。
 *
 * ステータス画面の見出しや操作の案内、名前を差し込む結末の文がこれにあたる。
 * コードは `LDA #<オフセット> / STA $22` の後に `LDA #$00<バンク> / STA $24` を置いて参照する。
 * 文字列そのものは区画にまとめられず、コードの合間に置かれている。
 * 表を通らないため `fixed.ts` の仕組みでは拾えない。
 */

import { endOfString, writeU16 } from "../bytes.ts";
import { type Destination, placeStrings, type Untranslated } from "../place.ts";
import { findOffsetOnly } from "./offset-only.ts";
import { concatenated, direct, findPaired, findTable, type Reference } from "./paired.ts";

export type InlineString = { base: number; offset: number; bytes: Uint8Array };

export function findReferences(rom: Uint8Array): Reference[] {
  const displayed = findPaired(rom, direct, 0);
  return [
    ...displayed,
    ...findPaired(rom, concatenated, 1),
    ...findTable(rom, 2),
    // 件の番号を変えないよう、後から見つけた形は末尾に並べる
    ...findOffsetOnly(rom, displayed, 3),
  ];
}

function key(base: number, offset: number): string {
  return base.toString(16) + ":" + offset.toString(16);
}

/** 参照されている文字列を重複なく、参照の形ごとに置き場所の順で並べて返す */
export function readInlineStrings(rom: Uint8Array): InlineString[] {
  const seen = new Map<string, InlineString & { shape: number }>();
  for (const reference of findReferences(rom)) {
    const id = key(reference.base, reference.offset);
    if (seen.has(id)) continue;
    const at = reference.base + reference.offset;
    const bytes = rom.slice(at, endOfString(rom, at));
    seen.set(id, {
      shape: reference.shape,
      base: reference.base,
      offset: reference.offset,
      bytes,
    });
  }
  return Array.from(seen.values())
    .sort((a, b) => a.shape - b.shape || a.base - b.base || a.offset - b.offset)
    .map(({ shape: _shape, ...entry }) => entry);
}

/**
 * 文字列を置き場所へ写し、参照するバンクとオフセットの直値を向け直す。
 * 元の位置はコードの合間にあるため消さずに残す。
 */
export function move(
  rom: Uint8Array,
  bodies: Map<number, Uint8Array>,
  untranslated: Untranslated,
  dest: Destination & { bank: number },
): { used: number; count: number } {
  const strings = readInlineStrings(rom);
  const originals = strings.map((entry) => entry.bytes);
  const placed = placeStrings(rom, originals, bodies, untranslated, dest);
  const moved = new Map(
    strings.map((entry, index) => [key(entry.base, entry.offset), placed.offsets[index]]),
  );

  for (const reference of findReferences(rom)) {
    const to = moved.get(key(reference.base, reference.offset));
    if (to === undefined) continue;
    writeU16(rom, reference.offsetAt, to);
    if (reference.bankAt != null) {
      rom[reference.bankAt + 1] = dest.bank;
    }
  }
  return { used: placed.next - dest.start, count: strings.length };
}
