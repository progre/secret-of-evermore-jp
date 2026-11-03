import { endOfString, readU16, writeU16 } from "./bytes.ts";
import { type Destination, placeStrings, type Untranslated } from "./place.ts";

/**
 * 固定テキスト（メニュー項目・アイテム名・説明文）の格納。
 * ダイアログと違って圧縮されず、終端 `0x00` の ASCII として 1 つの区画に並ぶ。
 */

/** 文字列を指す 16bit オフセットの基準 */
export const base = 0x040000;

/**
 * 文字列が並ぶ区画。
 * 手前は参照表、直後は画像データで、末尾の空きは 2 バイトしかない。
 */
export const block = { start: 0x0460ae, end: 0x04781e } as const;

/** `base` からの 16bit オフセットが並ぶ表 */
export const tables = {
  weaponDescriptions: { at: 0x0459fa, count: 12 },
  spellNames: { at: 0x045d09, count: 35 },
  spellDescriptions: { at: 0x045d51, count: 35 },
  alchemyNames: { at: 0x045fc5, count: 45 },
  itemNames: { at: 0x0cbc00, count: 33 },
  itemDescriptions: { at: 0x0cc3d0, count: 20 },
} as const;

/**
 * メニュー項目は 3 段で辿る。
 * 1 段目の値が構造体の位置を指し、構造体の先頭 16bit が文字列を指す。
 * 構造体の残り 6 バイトの意味は分かっていない。
 */
const menu = { pointers: 0x0e8000, structs: 0x0e0000, count: 162 } as const;

type FixedString = { offset: number; bytes: Uint8Array };

/** 文字だけの詰め物と区別するため、英字を 1 つも含まない並びは文字列とみなさない */
function looksLikeText(bytes: Uint8Array): boolean {
  if (bytes.length < 2) return false;
  return bytes.some((byte) => /[A-Za-z]/.test(String.fromCharCode(byte)));
}

/** 区画に並ぶ文字列を先頭から順に読む。並び順がそのまま件の番号になる */
export function readStrings(rom: Uint8Array): FixedString[] {
  const found: FixedString[] = [];
  let at = block.start;
  while (at < block.end) {
    if (rom[at] === 0) {
      at += 1;
      continue;
    }
    /** 詰め直しで元の位置を上書きしうるため、生のバイト列は写しておく */
    const bytes = rom.slice(at, endOfString(rom, at));
    if (looksLikeText(bytes)) {
      found.push({ offset: at - base, bytes });
    }
    at += bytes.length + 1;
  }
  return found;
}

/**
 * コード中に直値で積まれる文字列オフセットの位置を探す。
 * `LDA #imm`（`0xA9`）に `STA $22`（`0x85 0x22`）が続く形だけを見る。
 * 武器名を旗から引く分岐に並んでおり、文字列を並べ替えるとここも書き換えが要る。
 */
function findImmediates(rom: Uint8Array, offsets: Set<number>): number[] {
  const found: number[] = [];
  for (let at = 0; at + 4 < rom.length; at += 1) {
    if (rom[at] !== 0xa9 || rom[at + 3] !== 0x85 || rom[at + 4] !== 0x22) continue;
    if (offsets.has(readU16(rom, at + 1))) found.push(at);
  }
  return found;
}

/**
 * 文字列ポインタのバンクを差し替える。
 * `$22`-`$24` はダイアログと共用のメッセージポインタで（`packages/app/patch/main.s` の `message`）、
 * バンクを直値で積むのは固定テキストを読むときだけである。
 * ダイアログ側は実行時にバンクを組み立てるため、この書き換えの影響を受けない。
 *
 * 積み方は 2 通りある。
 * `LDA #$00C4 / STA $24` はバンクだけを置く。
 * `LDA #$C4xx / STA $23` は 16bit で書くため上位バイトが `$24` に落ちる。
 * 後者は直後に `STA $22` で下位を上書きするので、効くのは上位バイトだけである。
 */
export function retargetBank(rom: Uint8Array, bank: number): number {
  let count = 0;
  for (let at = 0; at + 4 < rom.length; at += 1) {
    if (rom[at] !== 0xa9) continue;
    if (rom[at + 3] !== 0x85) continue;
    if (rom[at + 4] === 0x24 && rom[at + 1] === 0xc4 && rom[at + 2] === 0x00) {
      rom[at + 1] = bank;
      count += 1;
    } else if (rom[at + 4] === 0x23 && rom[at + 2] === 0xc4) {
      rom[at + 2] = bank;
      count += 1;
    }
  }
  return count;
}

/** 既定の置き場所は原版と同じ区画で、拡張領域へ移すときは別の値を渡す */
const inPlace: Destination = { start: block.start, end: block.end, base };

/**
 * 差し替えた文字列を置き場所へ詰め直し、表と直値を新しい位置へ向ける。
 * 入りきらない場合は例外を投げる。
 */
export function relocate(
  rom: Uint8Array,
  bodies: Map<number, Uint8Array>,
  untranslated: Untranslated,
  dest: Destination = inPlace,
): { used: number; capacity: number; next: number; moved: Map<number, number> } {
  const strings = readStrings(rom);
  const originals = strings.map((entry) => entry.bytes);
  const placed = placeStrings(rom, originals, bodies, untranslated, dest);
  const moved = new Map(strings.map((entry, index) => [entry.offset, placed.offsets[index]]));
  rom.fill(0, placed.next, dest.end);

  const immediates = findImmediates(rom, new Set(moved.keys()));
  for (const site of immediates) {
    writeU16(rom, site + 1, moved.get(readU16(rom, site + 1)) ?? 0);
  }
  const retarget = (site: number) => {
    const old = readU16(rom, site);
    writeU16(rom, site, moved.get(old) ?? old);
  };
  for (const table of Object.values(tables)) {
    for (let index = 0; index < table.count; index += 1) retarget(table.at + index * 2);
  }
  for (let index = 0; index < menu.count; index += 1) {
    retarget(menu.structs + readU16(rom, menu.pointers + index * 2));
  }
  return {
    used: placed.next - dest.start,
    capacity: dest.end - dest.start,
    next: placed.next,
    moved,
  };
}
