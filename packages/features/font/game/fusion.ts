/**
 * 文字集合の字を Fusion Pixel 10px から引く。
 * Fusion の BDF の字は Unicode の符号位置で並んでいるため、区点ではなく文字そのもので引く。
 */

import type { Font, Glyph } from "../glyph.ts";
import type { GlyphChars } from "./layout.ts";

/**
 * 字を升目の上下中央に置くと、字の下端は原版の英大文字の下端より 2 行下になる。
 * 画面で見比べて、字を 1 行だけ上げる位置に決めた。下端は英大文字より 1 行下に残る
 */
const raise = 1;

/** `glyphs` は Fusion の BDF を Unicode で引く表。`chars` のうち字の無い文字は含めない */
export function fusionFont(glyphs: Map<number, Glyph>, chars: GlyphChars): Font {
  return new Map(
    Array.from(chars.keys()).flatMap((char) => {
      const glyph = glyphs.get(char.codePointAt(0) ?? 0);
      return glyph == null ? [] : [[char, { ...glyph, top: glyph.top - raise }] as const];
    }),
  );
}
