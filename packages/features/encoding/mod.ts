/**
 * トークン付きテキストの書式と、原版と日本語版の codec の実装。
 * 書式と codec を使う features は、`@core` の型だけに依存する。
 * ここの実装は、app と utils が各 feature に渡す。
 */

export { originalCodec, relocatedOriginalCodec } from "./original.ts";
export { shiftJisCodec, shiftJisTable } from "./shift-jis.ts";
export { readPieces, stripSpeakers } from "./token.ts";
