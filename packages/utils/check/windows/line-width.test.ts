import { assertEquals } from "@std/assert";
import type { Piece } from "@core";
import { lineLimit, lineWidths, wideLines } from "./line-width.ts";
import type { WindowSite } from "./event/walk.ts";

const widthOf = new Map([["あ", 10], ["1", 3]]);

const chars = (text: string): Piece[] => Array.from(text, (value) => ({ kind: "char", value }));

function site(width: number, messages: number[]): WindowSite {
  return {
    kind: "preset",
    patchAt: width,
    window: { opcode: 0x44, slot: 0, x: 2, y: 2, width, height: 7 },
    messages: new Set(messages),
  };
}

Deno.test("幅 20 のウィンドウの 1 行は 152 ドットで、送り幅 10 の字が 13 字入る", () => {
  assertEquals(lineLimit(20), 152);
  assertEquals(lineWidths(chars("あ".repeat(13)), widthOf), [143]);
});

Deno.test("字ごとに字間を足し、改行と改ページで行を切り、差し込みは数えない", () => {
  const pieces: Piece[] = [
    ...chars("あ1"),
    { kind: "newline" },
    { kind: "embed" },
    ...chars("あ"),
    { kind: "pageBreak" },
    ...chars("1"),
  ];
  assertEquals(lineWidths(pieces, widthOf), [15, 11, 4]);
});

Deno.test("複数のウィンドウに出る文は最も狭いウィンドウで比べ、ウィンドウの無い文は調べない", () => {
  const dialog = new Map([[1, chars("あ".repeat(13))], [2, chars("あ".repeat(14))]]);
  const survey = { sites: [site(20, [1]), site(18, [1])], queued: new Set<number>() };
  assertEquals(wideLines(survey, dialog, widthOf), [{
    message: 1,
    line: 1,
    width: 143,
    limit: 136,
  }]);
});

Deno.test("知らせは幅 30 のウィンドウで比べる", () => {
  const dialog = new Map([[1, chars("あ".repeat(21))], [2, chars("あ".repeat(22))]]);
  const survey = { sites: [], queued: new Set([1, 2]) };
  assertEquals(wideLines(survey, dialog, widthOf).map((line) => line.message), [2]);
});
