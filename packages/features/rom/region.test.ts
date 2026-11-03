import { assertEquals, assertThrows } from "@std/assert";
import { allocate, formatDefines } from "./region.ts";

Deno.test("番地を省いた領域は直前の領域に続く", () => {
  const placed = allocate([
    { name: "a", size: 0x10, at: 0x310000 },
    { name: "b", size: 0x20 },
  ]);
  assertEquals(placed.get("b"), { name: "b", start: 0x310010, end: 0x310030, address: 0xf10010 });
});

Deno.test("重なる領域は拒む", () => {
  assertThrows(() =>
    allocate([
      { name: "a", size: 0x20, at: 0x310000 },
      { name: "b", size: 0x10, at: 0x310010 },
    ])
  );
});

Deno.test("拡張領域の外は拒む", () => {
  assertThrows(() => allocate([{ name: "a", size: 0x10, at: 0x2ffff8 }]));
  assertThrows(() => allocate([{ name: "a", size: 0x10, at: 0x3ffff8 }]));
});

Deno.test("定義は 6 桁の 16 進で書く", () => {
  const defines = formatDefines(new Map([["glyphs", 0xf10000], ["pointers", 0xd1d000]]));
  assertEquals(defines.split("\n").slice(1, 3), [
    "define glyphs $F10000",
    "define pointers $D1D000",
  ]);
});
