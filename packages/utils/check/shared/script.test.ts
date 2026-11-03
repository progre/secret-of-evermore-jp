import { assertEquals, assertStringIncludes } from "@std/assert";
import { parseScript } from "@features/dialog";
import { format } from "./script.ts";

Deno.test("改行を含む件と末尾が改行の件をそのまま往復する", () => {
  const entries = new Map([[0, "ひとつめ"], [1, "ふた\nつめ"], [2, ""], [3, "あ\n"]]);
  assertEquals(parseScript(format(entries)), entries);
});

Deno.test("改行を含む件は三重引用符で書き、改行をそのまま残す", () => {
  const text = format(new Map([[0, "ふた\nつめ"]]));
  assertStringIncludes(text, '"""\nふた\nつめ"""');
});

Deno.test("件は番号の順に並ぶ", () => {
  const text = format(new Map([[10, "あ"], [2, "い"]]));
  assertStringIncludes(text, '2 = "い"\n10 = "あ"');
});
