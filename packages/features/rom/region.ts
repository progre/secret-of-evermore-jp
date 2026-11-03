/**
 * 拡張領域への割り付け。
 * 元の ROM は `c0`-`ef` の 48 バンク（3MB、ファイルオフセット `0x000000`-`0x2fffff`）を使い、
 * `f0` 以降が 4MB への拡張で新たに使える領域になる。
 */

const expansionStart = 0x300000;
const expansionEnd = 0x400000;

/** HiROM では、ファイルオフセットに `0xC00000` を足すと SNES アドレスになる */
export function snesAddress(offset: number): number {
  return offset + 0xc00000;
}

/** 置き場所の宣言。`at` を省くと直前の領域のすぐ後ろに置く */
type Region = { name: string; size: number; at?: number };

/** `start` と `end` はファイルオフセット、`address` は先頭の SNES アドレス */
export type Placed = { name: string; start: number; end: number; address: number };

function hex(offset: number): string {
  return "0x" + offset.toString(16);
}

function assertSeparate(placed: Placed[]): void {
  const sorted = placed.toSorted((a, b) => a.start - b.start);
  sorted.slice(1).forEach((region, index) => {
    const previous = sorted[index];
    if (previous.end > region.start) {
      throw new Error(
        previous.name + "（末尾 " + hex(previous.end) + "）が " + region.name + "（先頭 " +
          hex(region.start) + "）に重なる",
      );
    }
  });
}

function assertInside(region: Placed): void {
  if (region.start < expansionStart || region.end > expansionEnd) {
    throw new Error(
      region.name + "（" + hex(region.start) + "-" + hex(region.end) + "）が拡張領域の外にある",
    );
  }
}

/** 宣言の順に番地を決める。重なる領域や拡張領域からはみ出す領域があれば例外にする */
export function allocate(regions: Region[]): Map<string, Placed> {
  let next = expansionStart;
  const placed = regions.map((region) => {
    const start = region.at ?? next;
    next = start + region.size;
    return { name: region.name, start, end: next, address: snesAddress(start) };
  });
  placed.forEach(assertInside);
  assertSeparate(placed);
  return new Map(placed.map((region) => [region.name, region]));
}

/**
 * パッチから番地を `{名前}` で参照するための定義。
 * xkas が読み込めるよう、1 行に 1 つ `define` を並べる。
 */
export function formatDefines(addresses: Map<string, number>): string {
  const lines = Array.from(
    addresses,
    (pair) => "define " + pair[0] + " $" + pair[1].toString(16).toUpperCase().padStart(6, "0"),
  );
  return "// packages/app/layout.ts が書き出す。手で直さないこと\n" + lines.join("\n") + "\n";
}

/**
 * フックのコード（`packages/app/patch/main.s`）の置き場所。
 * ダイアログ本体が可変長で伸びるため、衝突を避けて拡張領域の末尾寄りに固定する。
 */
export const hooksRegion: Region = { name: "hooks", size: 0x1000, at: 0x3ff000 };
