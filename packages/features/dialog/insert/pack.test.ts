import { assertEquals } from "@std/assert";
import { writePointer } from "./pack.ts";

Deno.test("書き戻しは 24bit のリトルエンディアンにする", () => {
  assertEquals(writePointer(0xf00123), Uint8Array.of(0x23, 0x01, 0xf0));
});
