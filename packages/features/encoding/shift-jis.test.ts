import { assertEquals } from "@std/assert";
import { shiftJisCodec, shiftJisTable } from "./shift-jis.ts";

const { decode: decodeShiftJis, encode: encodeShiftJis } = shiftJisCodec;

Deno.test("表示文字を Shift-JIS の 2 バイトにする", () => {
  assertEquals(encodeShiftJis("あい隕").bytes, Uint8Array.of(0x82, 0xa0, 0x82, 0xa2, 0xe8, 0xa6));
});

Deno.test("制御コードは再配置した 1 バイトになる", () => {
  assertEquals(encodeShiftJis("{page}{hero}").bytes, Uint8Array.of(0x06, 0x01));
});

Deno.test("収録していない文字を知らせる", () => {
  const encoded = encodeShiftJis("あ😀");
  assertEquals(encoded.missing, ["😀"]);
  assertEquals(encoded.bytes, Uint8Array.of(0x82, 0xa0));
});

Deno.test("英数字と空白とハイフンは 1 バイトになる", () => {
  assertEquals(encodeShiftJis("A z9-").bytes, Uint8Array.of(0x41, 0x20, 0x7a, 0x39, 0x2d));
});

Deno.test("ほかの半角の記号は収録外として知らせる", () => {
  assertEquals(encodeShiftJis("A!").missing, ["!"]);
});

Deno.test("書き込みと読み取りが往復する", () => {
  const text = "あ\nい{page}{80 3D 80}{item}AB C";
  assertEquals(decodeShiftJis(encodeShiftJis(text).bytes), text);
});

Deno.test("グリフを用意する字は JIS X 0208 の 6879 字で、第二水準も本来の符号になる", () => {
  assertEquals(shiftJisTable.size, 6879);
  assertEquals(shiftJisTable.get("隕"), 0xe8a6);
});
