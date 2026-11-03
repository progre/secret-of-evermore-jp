import { assertEquals, assertThrows } from "@std/assert";
import { parseScript } from "./script.ts";

Deno.test("三重引用符の件は、直後の改行を除いて改行を本文に残す", () => {
  assertEquals(parseScript('0 = """\nふた\nつめ"""'), new Map([[0, "ふた\nつめ"]]));
});

Deno.test("制御コードの波括弧は表として読まれない", () => {
  assertEquals(parseScript('0 = "{code96}あ"'), new Map([[0, "{code96}あ"]]));
});

Deno.test("文字列でない値は誤りとする", () => {
  assertThrows(() => parseScript("0 = 1"));
});
