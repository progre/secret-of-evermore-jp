/**
 * 原版の 1 バイト符号。
 * 表示文字は `0x20` から `0x7F` で、4 つを除いて ASCII と一致する。
 * 再配置した制御コードは、どれもこの範囲の外にあるため、表示文字とは重ならない。
 * このため、制御コードを再配置した値で書いても、原文の英語はそのまま表示できる。
 */

import type { TextCodec } from "@core";
import { type CharCodec, textCodec } from "./codec.ts";

/** ASCII と異なる割り当て */
const overrides = new Map([
  [0x3c, "«"],
  [0x3e, "»"],
  [0x5e, "▶"],
  [0x5f, "…"],
]);

const reverseOverrides = new Map(Array.from(overrides).map((pair) => [pair[1], pair[0]]));

function isDisplay(byte: number): boolean {
  return byte >= 0x20 && byte <= 0x7f;
}

const chars: CharCodec = {
  encodeChar(char) {
    const byte = reverseOverrides.get(char) ?? char.charCodeAt(0);
    return isDisplay(byte) ? [byte] : null;
  },
  decodeChar(bytes, at) {
    const byte = bytes[at];
    if (!isDisplay(byte)) return null;
    return { char: overrides.get(byte) ?? String.fromCharCode(byte), length: 1 };
  },
};

/** 原版の符号。制御コードは原版の値で読み書きする */
export const originalCodec: TextCodec = textCodec(chars, "original");

/**
 * 表示文字は、原版の 1 バイトのまま読み書きする。
 * 制御コードは、日本語版の値で読み書きする。例えば改ページは `0x86` ではなく `0x06` になる。
 * 訳さずに残す文字列を ROM に置くときに使う
 */
export const relocatedOriginalCodec: TextCodec = textCodec(chars, "relocated");
