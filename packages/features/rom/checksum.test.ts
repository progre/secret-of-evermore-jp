import { assertEquals } from "@std/assert";
import { checksumComplementOffset, computeChecksum, writeChecksum } from "./checksum.ts";

/** 3MB（2MB + 1MB）の最小限の ROM を組み立てる。中身は先頭バイトだけ変えて重みの効きを見る */
function buildRom3mb(fill: number): Uint8Array {
  const rom = new Uint8Array(0x300000).fill(fill);
  rom.set(Uint8Array.of(0x00, 0x00, 0x00, 0x00), checksumComplementOffset);
  return rom;
}

Deno.test("2MB と 1MB の余りを 1:2 の重みで加算する", () => {
  const rom = buildRom3mb(0x01);
  // ヘッダーの 4 バイトは計算前に 0xff, 0xff, 0x00, 0x00 へ揃えられる
  const base = (0x01 * (0x200000 - 4) + 0xff + 0xff) & 0xffff;
  const remaining = (0x01 * 0x100000) & 0xffff;
  const expected = (base + remaining * 2) & 0xffff;
  assertEquals(computeChecksum(rom), expected);
});

Deno.test("べき乗サイズの ROM は単純な合計になる", () => {
  const rom = new Uint8Array(0x400000).fill(0x03);
  rom.set(Uint8Array.of(0x00, 0x00, 0x00, 0x00), checksumComplementOffset);
  const expected = (0x03 * (0x400000 - 4) + 0xff + 0xff) & 0xffff;
  assertEquals(computeChecksum(rom), expected);
});

Deno.test("writeChecksum はチェックサムと 1 の補数を書き込む", () => {
  const rom = new Uint8Array(0x400000).fill(0x05);
  writeChecksum(rom);
  const checksumOffset = checksumComplementOffset + 2;
  const checksum = rom[checksumOffset] | (rom[checksumOffset + 1] << 8);
  const complement = rom[checksumComplementOffset] | (rom[checksumComplementOffset + 1] << 8);
  assertEquals(checksum ^ complement, 0xffff);
  assertEquals(computeChecksum(rom), checksum);
});
