import { assertEquals } from "@std/assert";
import type { TextCodec } from "@core";
import { buildLayout, encodeLeadTable, orderedChars, trailIndex, widthTable } from "./layout.ts";

Deno.test("第 2 バイトは 0 から 187 の連番になる", () => {
  assertEquals(trailIndex(0x40), 0);
  assertEquals(trailIndex(0x7e), 62);
  assertEquals(trailIndex(0x80), 63);
  assertEquals(trailIndex(0xfc), 187);
});

Deno.test("使う第 1 バイトだけを詰めて番号を割り当てる", () => {
  const layout = buildLayout([0x8140, 0x889f]);
  assertEquals(Array.from(layout.leadOffsets), [[0x81, 0], [0x88, 188]]);
  assertEquals(layout.slots.get(0x8140), 0);
  assertEquals(layout.slots.get(0x889f), 282);
  assertEquals(layout.slotCount, 376);
});

Deno.test("先頭位置の表は使わない第 1 バイトを 0xFFFF で埋める", () => {
  const table = encodeLeadTable(buildLayout([0x8140, 0x889f]).leadOffsets);
  assertEquals(table.length, 16);
  assertEquals(Array.from(table.subarray(0, 2)), [0x00, 0x00]);
  assertEquals(Array.from(table.subarray(2, 4)), [0xff, 0xff]);
  assertEquals(Array.from(table.subarray(14, 16)), [0xbc, 0x00]);
});

Deno.test("Shift-JIS の順に並べる", () => {
  const chars = new Map([["あ", 0x82a0], ["　", 0x8140], ["亜", 0x889f]]);
  assertEquals(orderedChars(chars), ["　", "あ", "亜"]);
});

/** 英数字と空白だけを 1 バイトで書く、試験用の符号 */
const japanese: TextCodec = {
  encode: (text) => ({
    bytes: /^[ 0-9A-Za-z]$/.test(text) ? Uint8Array.of(text.charCodeAt(0)) : Uint8Array.of(),
    missing: [],
  }),
  decode: () => "",
};

Deno.test("収録した文字は width.bin から、1 バイトの英数字は原版の幅テーブルから引く", () => {
  const original = new Uint8Array(0x60).map((_, index) => index);
  const chars = new Map([["あ", 0x82a0]]);
  const widths = widthTable(chars, japanese, new Uint8Array(188).fill(12), original);
  assertEquals(widths.get("あ"), 12);
  assertEquals(widths.get("A"), 0x41 - 0x20);
  assertEquals(widths.get(" "), 0);
  assertEquals(widths.has(","), false);
});
