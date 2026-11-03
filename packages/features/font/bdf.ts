/** X11 の BDF を読む。BITMAP 行は 16 進数で、1 行がバイト単位に右詰めされている */

import type { Glyph } from "./glyph.ts";

function numbersAfter(block: string, name: string): number[] {
  const line = block.split("\n").find((text) => text.startsWith(name + " ")) ?? "";
  return line.trim().split(/ +/).slice(1).map(Number);
}

/**
 * キーは ENCODING の値。
 * フォントの高さ（FONT_ASCENT + FONT_DESCENT）を `cellHeight` 行の升目の上下中央に置く。
 */
export function parseBdf(source: string, cellHeight: number): Map<number, Glyph> {
  const [header, ...blocks] = source.split("\nSTARTCHAR");
  const ascent = numbersAfter(header, "FONT_ASCENT")[0];
  const descent = numbersAfter(header, "FONT_DESCENT")[0];
  const offset = Math.floor((cellHeight - ascent - descent) / 2);
  const glyphs = new Map<number, Glyph>();
  for (const block of blocks) {
    const [width, height, left, bottom] = numbersAfter(block, "BBX");
    const hex = block.split("\nBITMAP\n")[1].split("ENDCHAR")[0].split("\n").filter(Boolean);
    const padding = (hex[0]?.length ?? 0) * 4 - width;
    glyphs.set(numbersAfter(block, "ENCODING")[0], {
      advance: numbersAfter(block, "DWIDTH")[0],
      width,
      left,
      top: offset + ascent - height - bottom,
      rows: hex.map((row) => parseInt(row, 16) >> padding),
    });
  }
  return glyphs;
}
