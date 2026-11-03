import { assertEquals } from "@std/assert";
import { originalCodec, relocatedOriginalCodec } from "./original.ts";

const { decode, encode } = originalCodec;

Deno.test("表示文字と改行と制御コードを読み分ける", () => {
  assertEquals(decode(Uint8Array.of(0x41, 0x0a, 0x86)), "A\n{page}");
});

Deno.test("ASCII と異なる 4 つを読み替える", () => {
  assertEquals(decode(Uint8Array.of(0x3c, 0x3e, 0x5e, 0x5f)), "«»▶…");
});

Deno.test("用途の分からないコードは 16 進で書く", () => {
  assertEquals(decode(Uint8Array.of(0xa5)), "{A5}");
});

Deno.test("可変長シーケンスは終端まで 1 つのトークンにする", () => {
  assertEquals(decode(Uint8Array.of(0x80, 0x3d, 0x80, 0x41)), "{80 3D 80}A");
});

Deno.test("表示文字の波括弧は重ねて書く", () => {
  assertEquals(decode(Uint8Array.of(0x7b)), "{{");
});

Deno.test("読み取りと書き戻しが往復する", () => {
  const bytes = Uint8Array.of(0x41, 0x7b, 0x0a, 0x86, 0x5f, 0x80, 0x3d, 0x80, 0xa5, 0x8b);
  assertEquals(encode(decode(bytes)).bytes, bytes);
});

Deno.test("再配置した符号は表示文字を変えずに制御コードだけ移す", () => {
  const bytes = Uint8Array.of(0x41, 0x86, 0x8b, 0x5f);
  assertEquals(
    relocatedOriginalCodec.encode(decode(bytes)).bytes,
    Uint8Array.of(0x41, 0x06, 0x0c, 0x5f),
  );
});
