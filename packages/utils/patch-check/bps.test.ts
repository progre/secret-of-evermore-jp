import { assertEquals, assertThrows } from "@std/assert";
import { reconstruct } from "./bps.ts";

const SOURCE_READ = 0;
const TARGET_READ = 1;
const SOURCE_COPY = 2;
const TARGET_COPY = 3;

function encodeNumber(value: number): number[] {
  const low = value & 0x7f;
  const rest = value >>> 7;
  return rest === 0 ? [0x80 | low] : [low, ...encodeNumber(rest - 1)];
}

function command(action: number, length: number): number[] {
  return encodeNumber(((length - 1) << 2) | action);
}

function bps(targetSize: number, metadata: number[], actions: number[]): Uint8Array {
  return new Uint8Array([
    ...new TextEncoder().encode("BPS1"),
    ...encodeNumber(100),
    ...encodeNumber(targetSize),
    ...encodeNumber(metadata.length),
    ...metadata,
    ...actions,
    ...new Array(12).fill(0),
  ]);
}

Deno.test("TargetRead の出力はパッチだけで決まる", () => {
  const { bytes, known } = reconstruct(bps(2, [], [...command(TARGET_READ, 2), 0xaa, 0xbb]));
  assertEquals(Array.from(bytes), [0xaa, 0xbb]);
  assertEquals(Array.from(known), [1, 1]);
});

Deno.test("元の ROM を読むアクションの出力は未知のままにする", () => {
  const patch = bps(3, [], [
    ...command(SOURCE_READ, 1),
    ...command(SOURCE_COPY, 2),
    ...encodeNumber(10 << 1),
  ]);
  assertEquals(Array.from(reconstruct(patch).known), [0, 0, 0]);
});

Deno.test("TargetCopy は未知かどうかも引き継ぐ", () => {
  const patch = bps(4, [], [
    ...command(SOURCE_READ, 1),
    ...command(TARGET_READ, 1),
    0xaa,
    ...command(TARGET_COPY, 2),
    ...encodeNumber(0),
  ]);
  const { bytes, known } = reconstruct(patch);
  assertEquals(Array.from(bytes), [0, 0xaa, 0, 0xaa]);
  assertEquals(Array.from(known), [0, 1, 0, 1]);
});

Deno.test("メタデータを読み飛ばす", () => {
  const patch = bps(1, [1, 2, 3], [...command(TARGET_READ, 1), 0xaa]);
  assertEquals(Array.from(reconstruct(patch).bytes), [0xaa]);
});

Deno.test("BPS でなければ例外を投げる", () => {
  assertThrows(() => reconstruct(new Uint8Array(16)));
});
