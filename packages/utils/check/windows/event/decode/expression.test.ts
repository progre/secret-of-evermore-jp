import { assertEquals } from "@std/assert";
import { expressionEnd } from "./expression.ts";

const reader = (bytes: number[]) => (at: number) => bytes[at];

Deno.test("値 1 つの式は 1 バイトで終わる", () => {
  assertEquals(expressionEnd(reader([0xb1]), 0), 1);
});

Deno.test("後ろに値を持つ要素は、その値の分だけ進む", () => {
  assertEquals(expressionEnd(reader([0x82, 0x12]), 0), 2);
  assertEquals(expressionEnd(reader([0x85, 0x34, 0x12]), 0), 3);
});

Deno.test("最上位ビットの立った要素まで読み進める", () => {
  assertEquals(expressionEnd(reader([0x08, 0x10, 0x00, 0x29, 0x31, 0xa2]), 0), 6);
});

Deno.test("知らない要素に当たると null を返す", () => {
  assertEquals(expressionEnd(reader([0x19, 0xb1]), 0), null);
});
