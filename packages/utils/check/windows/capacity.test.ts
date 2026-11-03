import { assertEquals } from "@std/assert";
import type { Piece } from "@core";
import { linesFor, maxPageLines, overflows } from "./capacity.ts";
import type { WindowSite } from "./event/walk.ts";

function site(patchAt: number, height: number, messages: number[]): WindowSite {
  return {
    kind: "preset",
    patchAt,
    window: { opcode: 0x44, slot: 0, x: 10, y: 2, width: 20, height },
    messages: new Set(messages),
  };
}

Deno.test("高さと入る行数は原版の型の組と対応する", () => {
  assertEquals([3, 4, 6, 7, 8].map(linesFor), [1, 2, 3, 4, 5]);
});

const char = (value: string): Piece => ({ kind: "char", value });
const newline: Piece = { kind: "newline" };
const pageBreak: Piece = { kind: "pageBreak" };

Deno.test("ページごとの最大行数を数える。名前を差し込むだけの行も 1 行に数える", () => {
  assertEquals(maxPageLines([char("あ"), newline, char("い"), pageBreak, char("う")]), 2);
  assertEquals(
    maxPageLines([{ kind: "control" }, char("あ"), newline, { kind: "embed" }, newline, pageBreak]),
    2,
  );
  assertEquals(maxPageLines([pageBreak]), 0);
});

Deno.test("入る行数を超える文だけを挙げ、訳文の無い文は挙げない", () => {
  const lines = new Map([[1, 3], [2, 4]]);
  const result = overflows([site(0x100, 6, [1, 2, 3])], (m) => lines.get(m) ?? null);
  assertEquals(result.map((o) => [o.message, o.lines, o.capacity]), [[2, 4, 3]]);
});

Deno.test("複数の箇所に出る文は、入る行数が最も少ないウィンドウで挙げる", () => {
  const result = overflows([site(0x100, 6, [1]), site(0x200, 4, [1])], () => 4);
  assertEquals(result.map((o) => [o.message, o.site.patchAt]), [[1, 0x200]]);
});
