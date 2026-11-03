import { assertEquals } from "@std/assert";
import { tables } from "../layout.ts";
import { decompress, readPlain } from "./decompress.ts";

/** 表を実際の位置に置いた最小限の ROM を組み立てる */
function buildRom(stream: number[]): Uint8Array {
  const rom = new Uint8Array(0x120000);
  rom[tables.scatter] = 0x41;
  rom[tables.scatter + 1] = 0x00;
  rom.set([0x42, 0x43], tables.dte);
  rom.set([0x00, 0x00], tables.dict8Pointers);
  rom.set([0x68, 0x69, 0x00], tables.dict8Strings);
  rom.set([0x00, 0x00], tables.dict16Pointers);
  rom.set([0x79, 0x6f, 0x00], tables.dict16Strings);
  rom.set(stream, 0x100000);
  return rom;
}

Deno.test("散らしと写しと DTE と 2 つの辞書を展開する", () => {
  const rom = buildRom([0x00, 0x41, 0x5a, 0x80, 0xc0, 0x00, 0xc1, 0x01]);
  assertEquals(new TextDecoder().decode(decompress(rom, 0x100000)), "AZBCyohi");
});

Deno.test("展開後に現れる最初の 0x00 で文字列が終わる", () => {
  /** 3 バイトの写しが終端の先まで書き出すが、切り詰めで消える */
  const rom = buildRom([0x43, 0x41, 0x00, 0x42, 0x01]);
  assertEquals(new TextDecoder().decode(decompress(rom, 0x100000)), "A");
});

Deno.test("非圧縮は 0x00 までを読む", () => {
  const rom = buildRom([]);
  rom.set([0x41, 0x42, 0x00, 0x43], 0x100000);
  assertEquals(new TextDecoder().decode(readPlain(rom, 0x100000)), "AB");
});
