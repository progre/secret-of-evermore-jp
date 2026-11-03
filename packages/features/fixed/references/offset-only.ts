/**
 * 組の参照の後ろで、バンクを積み直さずにオフセットだけを `$22` へ積む参照。
 * 行動の画面は、組で 1 本を出した後、数字の文字列をオフセットだけ積み替えて出す。
 * バンクは組の参照のものを使い回すため、組と同じく移した先のバンクを読む。
 * 命令の境界は辿らず、次にバンクを積むまでのバイト列から形で探す。
 */

import { readU16 } from "../bytes.ts";
import { direct, jsl, matches, type PairedReference, type Reference } from "./paired.ts";

/** 組の参照の後ろで、オフセットだけの参照を探す範囲 */
const reach = 0x200;

/** オフセットを積んでから `Display_mes` を呼ぶまでの範囲 */
const displayReach = 0x20;

const displayCall = jsl(0x8c9e03);

function storesImmediate(rom: Uint8Array, at: number, store: number): boolean {
  return rom[at] === 0xa9 && rom[at + 3] === 0x85 && rom[at + 4] === store;
}

function storesBank(rom: Uint8Array, at: number): boolean {
  return storesImmediate(rom, at, direct.bankStore) && rom[at + 2] === 0x00;
}

/** `Display_mes` を呼ぶまでにバンクを積むなら、それは組の参照である */
function rebanks(rom: Uint8Array, at: number): boolean {
  const call = Array.from({ length: displayReach }, (_, index) => at + 5 + index)
    .find((next) => matches(rom, next, displayCall)) ?? at + 5 + displayReach;
  return Array.from({ length: call - at - 5 }, (_, index) => at + 5 + index)
    .some((next) => rom[next] === 0x85 && rom[next + 1] === direct.bankStore);
}

export function findOffsetOnly(
  rom: Uint8Array,
  pairs: PairedReference[],
  order: number,
): Reference[] {
  const paired = new Set(pairs.map((reference) => reference.offsetAt - 1));
  const found = new Map<number, Reference>();
  for (const pair of pairs) {
    const from = pair.bankAt + 5;
    const span = Array.from({ length: reach }, (_, index) => from + index);
    const end = span.find((at) => storesBank(rom, at)) ?? from + reach;
    span
      .filter((at) => at < end && storesImmediate(rom, at, direct.offsetStore))
      .filter((at) => !paired.has(at) && !found.has(at) && !rebanks(rom, at))
      .forEach((at) => {
        found.set(at, {
          shape: order,
          bankAt: null,
          offsetAt: at + 1,
          base: pair.base,
          offset: readU16(rom, at + 1),
        });
      });
  }
  return Array.from(found.values());
}
