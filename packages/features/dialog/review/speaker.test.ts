import { assertEquals } from "@std/assert";
import type { Piece } from "@core";
import { unmarkedSpeakers } from "./speaker.ts";

const speaker = (name: string): Piece => ({ kind: "speaker", name });
const char: Piece = { kind: "char", value: "あ" };

Deno.test("印のない件を挙げる。表示文字のない件は挙げない", () => {
  const dialog = new Map([
    [1, [speaker("主人公"), char]],
    [2, [char]],
    [3, [{ kind: "control" } as Piece]],
  ]);
  assertEquals(unmarkedSpeakers(dialog), [2]);
});
