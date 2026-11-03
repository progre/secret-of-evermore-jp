import { assertEquals } from "@std/assert";
import { encodeFont, encodeGlyph } from "./format.ts";
import type { Glyph } from "../glyph.ts";

/** 読点の形の字。3x3 を升目の左から 1、上から 9 の位置に置く */
const comma: Glyph = { advance: 7, width: 3, left: 1, top: 9, rows: [0b100, 0b010, 0b010] };

/** 全角の升目いっぱいに広がるグリフ。12 ドット幅は升目 16 の左に寄る */
const block: Glyph = { advance: 12, width: 12, left: 0, top: 0, rows: new Array(12).fill(0xfff) };

Deno.test("グリフを左半分 12 バイトと右半分 12 バイトに分ける", () => {
  const bytes = encodeGlyph(comma);
  assertEquals(bytes.length, 24);
  assertEquals(bytes[9], 0x40);
  assertEquals(bytes[10], 0x20);
  assertEquals(bytes[11], 0x20);
  assertEquals(bytes.subarray(12).every((byte) => byte === 0), true);
});

Deno.test("12 ドット幅は升目の左に寄り、右の 4 ビットが空く", () => {
  const bytes = encodeGlyph(block);
  assertEquals(bytes[0], 0xff);
  assertEquals(bytes[12], 0xf0);
});

Deno.test("グリフ番号の位置へ置き、割り当たらない番号は空けておく", () => {
  const font = new Map([["、", comma]]);
  const placements = [{ char: "、", slot: 3 }, { char: "。", slot: 4 }];
  const built = encodeFont(placements, 8, font);
  assertEquals(built.widths.length, 8);
  assertEquals(built.widths[3], 7);
  assertEquals(built.widths[0], 0);
  assertEquals(built.missing, ["。"]);
});
