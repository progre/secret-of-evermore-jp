/** 字の幅の表。日本語の字は BDF から、1 バイトの字は原版の ROM から求める */

import { shiftJisCodec, shiftJisTable } from "@features/encoding";
import { buildGameFont, originalWidths, widthTable } from "@features/font";

export async function readWidths(rom: Uint8Array): Promise<Map<string, number>> {
  const bdfPath = "vendor/fusion-pixel-font/fusion-pixel-10px-proportional-ja.bdf";

  const font = buildGameFont(await Deno.readTextFile(bdfPath), shiftJisTable);
  return widthTable(shiftJisTable, shiftJisCodec, font.built.widths, originalWidths(rom));
}
