import { assertEquals } from "@std/assert";
import type { Glyph } from "../glyph.ts";
import { fusionFont } from "./fusion.ts";

const glyph = (top: number): Glyph => ({ advance: 10, width: 4, left: 0, top, rows: [0b1] });

const chars = new Map([["　", 0x8140], ["、", 0x8141], ["亜", 0x889f]]);

Deno.test("Unicode で字を引き、字の無い文字は含めない", () => {
  const font = fusionFont(new Map([[0x3001, glyph(2)], [0x4e9c, glyph(2)]]), chars);
  assertEquals(Array.from(font.keys()), ["、", "亜"]);
});

Deno.test("升目の 1 行上へ置く", () => {
  const font = fusionFont(new Map([[0x3001, glyph(3)]]), chars);
  assertEquals(font.get("、")?.top, 2);
});
