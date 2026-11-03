import { assertEquals, assertThrows } from "@std/assert";
import { readPieces, scan, stripSpeakers } from "./token.ts";

Deno.test("文字と改行とトークンに分ける", () => {
  assertEquals(scan("あ\n{page}"), [
    { kind: "char", value: "あ" },
    { kind: "newline" },
    { kind: "token", body: "page" },
  ]);
});

Deno.test("波括弧を重ねると表示文字になる", () => {
  assertEquals(scan("{{a"), [
    { kind: "char", value: "{" },
    { kind: "char", value: "a" },
  ]);
});

Deno.test("閉じない波括弧は誤りとして知らせる", () => {
  assertThrows(() => scan("{page"));
});

Deno.test("話者の印は名前を持つ部品として読む", () => {
  assertEquals(
    readPieces("{@主人公}あ"),
    Array.of({ kind: "speaker", name: "主人公" }, { kind: "char", value: "あ" }),
  );
});

Deno.test("話者の印だけを取り除き、ほかのトークンと重ねた波括弧は残す", () => {
  assertEquals(stripSpeakers("{@主人公}{code96}{{あ\n{@博士}い{page}"), "{code96}{{あ\nい{page}");
});

Deno.test("トークンを表示上の役割で見分ける", () => {
  assertEquals(
    readPieces("{page}{hero}{code96}{80 3D 80}"),
    Array.of(
      { kind: "pageBreak" },
      { kind: "embed" },
      { kind: "control" },
      { kind: "control" },
    ),
  );
});
