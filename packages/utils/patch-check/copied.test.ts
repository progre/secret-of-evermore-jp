import { assertEquals } from "@std/assert";
import { findCopiedRuns } from "./copied.ts";

const original = Uint8Array.from({ length: 64 }, (_, i) => i);

Deno.test("元のデータと 8 バイト以上一致する範囲を返す", () => {
  const bytes = new Uint8Array([0xf0, ...original.subarray(10, 20), 0xf1]);
  const known = new Uint8Array(bytes.length).fill(1);
  assertEquals(findCopiedRuns({ bytes, known }, original), [{ offset: 1, length: 10 }]);
});

Deno.test("8 バイト未満の一致は返さない", () => {
  const bytes = new Uint8Array([0xf0, ...original.subarray(10, 17), 0xf1]);
  const known = new Uint8Array(bytes.length).fill(1);
  assertEquals(findCopiedRuns({ bytes, known }, original), []);
});

Deno.test("未知のバイトは一致に数えない", () => {
  const bytes = original.subarray(10, 20);
  const known = new Uint8Array(bytes.length).fill(1);
  known.set([0], 5);
  assertEquals(findCopiedRuns({ bytes, known }, original), []);
});
