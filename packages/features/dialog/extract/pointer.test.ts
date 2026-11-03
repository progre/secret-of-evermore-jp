import { assertEquals } from "@std/assert";
import { dialogPointers } from "../layout.ts";
import { readPointer } from "./pointer.ts";

function romWithPointer(bytes: number[]): Uint8Array {
  const rom = new Uint8Array(0x120000);
  rom.set(bytes, dialogPointers);
  return rom;
}

Deno.test("15bit のバンク内位置と 8bit のバンク番号を組み立てる", () => {
  const rom = romWithPointer([0x56, 0x34, 0x09]);
  assertEquals(readPointer(rom, 0), { offset: 0x123456, compressed: false });
});

Deno.test("3 バイト目の最上位ビットが圧縮を表す", () => {
  const rom = romWithPointer([0x56, 0x34, 0x89]);
  assertEquals(readPointer(rom, 0).compressed, true);
});
