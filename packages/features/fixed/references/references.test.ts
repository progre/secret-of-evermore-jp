import { assertEquals } from "@std/assert";
import { findReferences, readInlineStrings } from "./mod.ts";

const lda = (value: number) => [0xa9, value & 0xff, value >> 8];
const sta = (dp: number) => [0x85, dp];
const concat = [0x22, 0x49, 0xb1, 0x80];
const allocate = [0x22, 0x7a, 0xb3, 0x80];

/** 操作設定の表の位置まで届く大きさにする */
function romWith(pieces: [number, number[]][]): Uint8Array {
  const rom = new Uint8Array(0x100000);
  pieces.forEach(([at, bytes]) => rom.set(bytes, at));
  return rom;
}

const directCode = [...lda(0x9000), ...sta(0x22), ...lda(0x8f), ...sta(0x24)];
const concatCode = [...lda(0x9100), ...sta(0x26), ...lda(0x80), ...sta(0x28)];

Deno.test("Display_mes へ渡す直値は、バンクから起点を決める", () => {
  const references = findReferences(romWith([[0x100, directCode]]))
    .filter((reference) => reference.shape === 0);
  assertEquals(references, [
    { shape: 0, bankAt: 0x105, offsetAt: 0x101, base: 0x0f0000, offset: 0x9000 },
  ]);
});

Deno.test("$26-$28 の直値は、つなぐ処理を呼ぶものだけを拾う", () => {
  const shapeOf = (rom: Uint8Array) =>
    findReferences(rom).filter((reference) => reference.shape === 1).length;
  assertEquals(shapeOf(romWith([[0x100, [...concatCode, ...concat]]])), 1);
  assertEquals(shapeOf(romWith([[0x100, [...concatCode, ...allocate, ...concat]]])), 1);
  assertEquals(shapeOf(romWith([[0x100, concatCode]])), 0);
});

Deno.test("操作設定の表は、表の各件をオフセットの位置とする", () => {
  const rom = romWith([[0x0d9fb2, [0x43, 0x9f, 0x53, 0x9f]]]);
  const offsets = findReferences(rom)
    .filter((reference) => reference.shape === 2)
    .map((reference) => [reference.offsetAt, reference.offset]);
  assertEquals(offsets, [[0x0d9fb2, 0x9f43], [0x0d9fb4, 0x9f53]]);
});

const display = [0x22, 0x03, 0x9e, 0x8c];

Deno.test("組の後でオフセットだけを積む参照は、組のバンクを起点にする", () => {
  const rom = romWith([[0x100, [
    ...directCode,
    ...display,
    ...lda(0x9010),
    ...sta(0x22),
    ...display,
  ]]]);
  const references = findReferences(rom).filter((reference) => reference.shape === 3);
  assertEquals(references, [
    { shape: 3, bankAt: null, offsetAt: 0x10f, base: 0x0f0000, offset: 0x9010 },
  ]);
});

Deno.test("表示を呼ぶまでにバンクを積み直す参照は、オフセットだけの参照としない", () => {
  const rebanked = [...lda(0x2ff4), ...sta(0x22), ...lda(0x7e), ...sta(0x24), ...display];
  const rom = romWith([[0x100, [...directCode, ...display, ...rebanked]]]);
  assertEquals(findReferences(rom).filter((reference) => reference.shape === 3), []);
});

Deno.test("件は参照の形ごとにまとめて並べ、置き場所の順は形の中で使う", () => {
  const rom = romWith([
    [0x100, directCode],
    [0x200, [...concatCode, ...concat]],
    [0x0f9000, [0x41, 0x00]],
    [0x009100, [0x42, 0x00]],
  ]);
  const texts = readInlineStrings(rom).map((entry) => new TextDecoder().decode(entry.bytes));
  assertEquals(texts.slice(0, 2), ["A", "B"]);
});
