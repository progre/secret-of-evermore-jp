/**
 * 拡張領域の並び。各 feature が宣言した領域を集めて割り付け、
 * 決まった番地を各処理の引数と、パッチの定義 `build/layout.s` へ渡す。
 */

import { dialogPointers, dialogRegion } from "@features/dialog";
import { fixedRedirectRegion, fixedTextRegion } from "@features/fixed";
import { fontRegions } from "@features/font";
import { nameTableRegions } from "@features/name-entry";
import { allocate, formatDefines, hooksRegion, type Placed, snesAddress } from "@features/rom";

export type Layout = Map<string, Placed>;

async function sizeOf(path: string): Promise<number> {
  return (await Deno.stat(path)).size;
}

/**
 * `buildDir` にある生成物の大きさから番地を決める。
 * ダイアログ本体は詰める前に先頭の番地が要るため、大きさを呼び出し側から受け取る。
 */
export async function layOut(buildDir: string, dialogSize: number): Promise<Layout> {
  return allocate([
    ...fontRegions({
      glyphs: await sizeOf(buildDir + "/font.bin"),
      widths: await sizeOf(buildDir + "/width.bin"),
      leadOffset: await sizeOf(buildDir + "/lead-offset.bin"),
    }),
    dialogRegion(dialogSize),
    fixedRedirectRegion,
    fixedTextRegion,
    ...nameTableRegions(
      await sizeOf(buildDir + "/name-table.bin"),
      await sizeOf(buildDir + "/name-voice.bin"),
    ),
    hooksRegion,
  ]);
}

export function regionOf(layout: Layout, name: string): Placed {
  const region = layout.get(name);
  if (region == null) throw new Error("割り付けに無い領域: " + name);
  return region;
}

/**
 * ダイアログ本体の先頭の SNES アドレス。
 * 詰め終えた後に、`checkFits` で後ろの領域へ届いていないことを確かめる。
 */
export async function dialogAddress(buildDir: string): Promise<number> {
  return regionOf(await layOut(buildDir, 0), "dialog_text").address;
}

export async function checkFits(buildDir: string, dialogSize: number): Promise<void> {
  await layOut(buildDir, dialogSize);
}

/** 拡張領域の外にあるポインタテーブルも、パッチが書き戻すので定義に含める */
export async function writeDefines(layout: Layout, path: string): Promise<void> {
  const addresses = new Map(Array.from(layout.values(), (region) => [region.name, region.address]));
  addresses.set("dialog_pointers", snesAddress(dialogPointers));
  await Deno.writeTextFile(path, formatDefines(addresses));
}
