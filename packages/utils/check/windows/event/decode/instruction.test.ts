import { assertEquals } from "@std/assert";
import { decode } from "./instruction.ts";

function romWith(bytes: number[]): Uint8Array {
  const rom = new Uint8Array(0x200);
  rom.set(bytes, 0x100);
  return rom;
}

Deno.test("ウィンドウの設定は 5 バイトの引数を持つ", () => {
  const instruction = decode(romWith([0x44, 0x00, 0x0a, 0x02, 0x14, 0x06]), 0x100);
  assertEquals(instruction.next, 0x106);
  assertEquals(instruction.window, {
    opcode: 0x44,
    slot: 0,
    x: 0x0a,
    y: 0x02,
    width: 0x14,
    height: 0x06,
  });
});

Deno.test("文の番号は表のバイト位置を 3 で割った値になる", () => {
  const text = decode(romWith([0x51, 0x0c, 0x00]), 0x100);
  assertEquals(text.next, 0x103);
  assertEquals(text.text, { slot: 0, message: 4, queued: false });
  assertEquals(decode(romWith([0x52, 0x03, 0x00]), 0x100).text?.queued, true);
  assertEquals(decode(romWith([0x50, 0x02, 0x06, 0x00]), 0x100).text?.slot, 2);
});

Deno.test("条件分岐は式の後ろの 16bit を分岐先として持つ", () => {
  const instruction = decode(romWith([0x08, 0x85, 0x10, 0x00, 0x05, 0x00]), 0x100);
  assertEquals(instruction.next, 0x106);
  assertEquals(instruction.branches, [0x10b]);
});

Deno.test("終端は次の命令を持たない", () => {
  assertEquals(decode(romWith([0x00]), 0x100).next, null);
  assertEquals(decode(romWith([0x00]), 0x100).known, true);
});

Deno.test("知らない命令は読めないものとして扱う", () => {
  assertEquals(decode(romWith([0x01]), 0x100).known, false);
});
