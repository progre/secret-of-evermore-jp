import { assertEquals } from "@std/assert";
import { parseBdf } from "./bdf.ts";

const source = `STARTFONT 2.1
FONT_ASCENT 9
FONT_DESCENT 1
CHARS 1
STARTCHAR 3021
ENCODING 12321
DWIDTH 12 0
BBX 11 2 0 6
BITMAP
FFE0
8020
ENDCHAR
ENDFONT
`;

Deno.test("16 進数の行を幅に合わせて右へ詰め、高さ 10 のフォントを升目 12 行の中央に置く", () => {
  const glyph = parseBdf(source, 12).get(0x3021);
  assertEquals(glyph, {
    advance: 12,
    width: 11,
    left: 0,
    top: 2,
    rows: [0b11111111111, 0b10000000001],
  });
});
