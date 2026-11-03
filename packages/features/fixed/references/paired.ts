/** オフセットとバンクを直値で積む参照と、操作設定の名前の表 */

import { readU16 } from "../bytes.ts";

/**
 * 直値を積む 2 箇所の位置。バンクとオフセットの両方を書き換える必要がある。
 * オフセットだけを積む参照は `bankAt` を持たない。
 * `shape` は参照の形の順位で、件の番号は形ごとにまとめて振る。
 */
export type Reference = {
  shape: number;
  bankAt: number | null;
  offsetAt: number;
  base: number;
  offset: number;
};

export type PairedReference = Reference & { bankAt: number };

/** オフセットとバンクを直値で積む参照の形 */
type PairedShape = {
  offsetStore: number;
  bankStore: number;
  banks: number[];
  /** バンクを積んだ直後の命令が満たす条件 */
  follows: (rom: Uint8Array, at: number) => boolean;
};

export const jsl = (target: number) => [0x22, target & 0xff, (target >> 8) & 0xff, target >> 16];
const concat = jsl(0x80b149);
const allocate = jsl(0x80b37a);

export function matches(rom: Uint8Array, at: number, bytes: number[]): boolean {
  return bytes.every((byte, index) => rom[at + index] === byte);
}

/** `Display_mes` へ渡す参照。`$22` にオフセット、`$24` にバンクを積む */
export const direct: PairedShape = {
  offsetStore: 0x22,
  bankStore: 0x24,
  banks: [0x8c, 0x8d, 0x8e, 0x8f, 0x91],
  follows: () => true,
};

/**
 * 知らせを組み立てる処理（`$80B149`）へ渡す参照。`$26` にオフセット、`$28` にバンクを積む。
 * `$26`-`$28` は画像の転送などにも使われるため、つなぐ処理を呼ぶものに限る。
 */
export const concatenated: PairedShape = {
  offsetStore: 0x26,
  bankStore: 0x28,
  banks: [0x80, 0x8e, 0x8f, 0x91],
  follows: (rom, at) =>
    matches(rom, at, concat) || (matches(rom, at, allocate) && matches(rom, at + 4, concat)),
};

/** 操作設定の名前の表。`$0B21` を添字に引き、バンクは手前の直値で積む */
const configurationTable = { bankAt: 0x0d9f23, at: 0x0d9fb2, count: 2, base: 0x0d0000 };

/** バンクを積む直値の手前 12 バイトから、対になるオフセットの直値を探す */
export function findPaired(
  rom: Uint8Array,
  shape: PairedShape,
  order: number,
): PairedReference[] {
  const found: PairedReference[] = [];
  for (let at = 0; at + 4 < rom.length; at += 1) {
    if (rom[at] !== 0xa9 || rom[at + 2] !== 0x00) continue;
    if (rom[at + 3] !== 0x85 || rom[at + 4] !== shape.bankStore) continue;
    if (!shape.banks.includes(rom[at + 1]) || !shape.follows(rom, at + 5)) continue;
    const site = Array.from({ length: 8 }, (_, index) => at - 5 - index)
      .find((back) =>
        back >= 0 && rom[back] === 0xa9 && rom[back + 3] === 0x85 &&
        rom[back + 4] === shape.offsetStore
      );
    if (site == null) continue;
    found.push({
      shape: order,
      bankAt: at,
      offsetAt: site + 1,
      base: (rom[at + 1] & 0x3f) << 16,
      offset: readU16(rom, site + 1),
    });
  }
  return found;
}

export function findTable(rom: Uint8Array, order: number): Reference[] {
  const table = configurationTable;
  return Array.from({ length: table.count }, (_, index) => {
    const offsetAt = table.at + index * 2;
    return {
      shape: order,
      bankAt: table.bankAt,
      offsetAt,
      base: table.base,
      offset: readU16(rom, offsetAt),
    };
  });
}
