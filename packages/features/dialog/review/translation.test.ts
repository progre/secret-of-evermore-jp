import { assertEquals } from "@std/assert";
import type { Piece } from "@core";
import { checkGlossary } from "./translation.ts";

const glossary = [{
  kind: "人名",
  source: "Blue Lantern",
  target: "青いランタン",
}];

/** 字と改行だけの文を部品にする */
const pieces = (text: string): Piece[] =>
  Array.from(text, (value) => value === "\n" ? { kind: "newline" } : { kind: "char", value });

Deno.test("訳語が改行をまたいでいても、使われているとみなす", () => {
  const english = new Map([[0, pieces("Take the Blue Lantern home.")]]);
  const japanese = new Map([[0, pieces("青い\nランタンを持って帰れ。")]]);
  assertEquals(checkGlossary(glossary, english, japanese).missing, []);
});

Deno.test("訳語が無ければ挙げる", () => {
  const english = new Map([[0, pieces("Take the Blue Lantern home.")]]);
  const japanese = new Map([[0, pieces("ランタンを持って帰れ。")]]);
  assertEquals(checkGlossary(glossary, english, japanese).missing, [
    "第 0 件: Blue Lantern → 青いランタン",
  ]);
});
