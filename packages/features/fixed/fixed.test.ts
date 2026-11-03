import { assertEquals, assertThrows } from "@std/assert";
import { base, block, readStrings, relocate, retargetBank, tables } from "./fixed.ts";
import { redirectTable } from "./install.ts";

/** 区画に文字列を並べ、呪文名の表の先頭 2 つをそこへ向けた ROM を作る */
function romWithStrings(texts: string[]): Uint8Array {
  const rom = new Uint8Array(0x100000);
  let at = block.start;
  for (let index = 0; index < texts.length; index += 1) {
    const body = new TextEncoder().encode(texts[index]);
    rom.set(body, at);
    const offset = at - base;
    rom[tables.spellNames.at + index * 2] = offset & 0xff;
    rom[tables.spellNames.at + index * 2 + 1] = offset >> 8;
    at += body.length + 1;
  }
  return rom;
}

/** 試験の文字列は ASCII だけなので、そのまま読める */
const textOf = (entry: { bytes: Uint8Array }) => new TextDecoder().decode(entry.bytes);

/** 訳さずに残す文字列はそのまま置く */
const keep = (bytes: Uint8Array) => bytes;

function offsetInTable(rom: Uint8Array, index: number): number {
  return rom[tables.spellNames.at + index * 2] + rom[tables.spellNames.at + index * 2 + 1] * 256;
}

Deno.test("終端 0x00 で区切って区画の文字列を順に読む", () => {
  const rom = romWithStrings(["Heal", "Flash"]);
  assertEquals(readStrings(rom).map(textOf), ["Heal", "Flash"]);
});

Deno.test("英字を含まない並びは詰め物とみなして読み飛ばす", () => {
  const rom = romWithStrings(["Heal", "??", "Flash"]);
  assertEquals(readStrings(rom).map(textOf), ["Heal", "Flash"]);
});

Deno.test("差し替えずに詰め直すと元の並びに戻る", () => {
  const rom = romWithStrings(["Heal", "Flash"]);
  const before = offsetInTable(rom, 1);
  relocate(rom, new Map(), keep);
  assertEquals(readStrings(rom).map(textOf), ["Heal", "Flash"]);
  assertEquals(offsetInTable(rom, 1), before);
});

Deno.test("短くすると後ろの文字列が繰り上がり、表もそこへ向く", () => {
  const rom = romWithStrings(["Heal", "Flash"]);
  relocate(rom, new Map([[0, new TextEncoder().encode("HP")]]), keep);
  const moved = readStrings(rom);
  assertEquals(moved.map(textOf), ["HP", "Flash"]);
  assertEquals(offsetInTable(rom, 0), moved[0].offset);
  assertEquals(offsetInTable(rom, 1), moved[1].offset);
});

Deno.test("使った量と区画の大きさを返す", () => {
  const rom = romWithStrings(["Heal", "Flash"]);
  const result = relocate(rom, new Map(), keep);
  assertEquals(result.used, "Heal".length + 1 + "Flash".length + 1);
  assertEquals(result.capacity, block.end - block.start);
});

Deno.test("メッセージポインタのバンクを積む直値だけを書き換える", () => {
  const rom = new Uint8Array(0x10000);
  rom.set([0xa9, 0xc4, 0x00, 0x85, 0x24], 0x1000);
  rom.set([0xa9, 0xc4, 0x00, 0x85, 0x28], 0x2000);
  assertEquals(retargetBank(rom, 0xff), 1);
  assertEquals(rom[0x1001], 0xff);
  assertEquals(rom[0x2001], 0xc4);
});

Deno.test("16bit で積む形は上位バイトだけを書き換える", () => {
  const rom = new Uint8Array(0x10000);
  rom.set([0xa9, 0x60, 0xc4, 0x85, 0x23], 0x1000);
  rom.set([0xa9, 0xa0, 0x8c, 0x85, 0x23], 0x2000);
  assertEquals(retargetBank(rom, 0xff), 1);
  assertEquals(rom[0x1001], 0x60);
  assertEquals(rom[0x1002], 0xff);
  assertEquals(rom[0x2002], 0x8c);
});

Deno.test("区画に入らない量を渡すと例外にする", () => {
  const rom = romWithStrings(["Heal"]);
  const huge = new Uint8Array(block.end - block.start + 1);
  huge.fill(0x41);
  assertThrows(() => relocate(rom, new Map([[0, huge]]), keep), Error, "置き場所に入らない");
});

Deno.test("読み替え表は、文字列の範囲の旧位置を移した先の先頭へ向け、外は 0xFFFF にする", () => {
  const table = redirectTable(
    [{ offset: 0x100, length: 1 }, { offset: 0x102, length: 2 }],
    new Map([[0x100, 0x0000], [0x102, 0x0040]]),
    { start: 0x100, end: 0x105 },
  );
  assertEquals(Array.from(new Uint16Array(table.buffer)), [0, 0xffff, 0x40, 0x40, 0xffff]);
});
