/**
 * トークン付きテキストとバイト列の相互変換。
 * 改行・制御コード・可変長シーケンス・16 進のトークンはどの符号でも同じに扱い、
 * 表示文字の読み書きだけを符号ごとに差し替える。
 */

import {
  byOriginal,
  byRelocated,
  byToken,
  fromRawToken,
  isRawToken,
  newline,
  readSequence,
  sequenceStart,
  toRawToken,
} from "./control.ts";
import type { TextCodec } from "@core";
import { scan } from "./token.ts";

type Encoded = ReturnType<TextCodec["encode"]>;

/**
 * 制御コードに書くバイト値の選び方。
 * `original` は原版の値、`relocated` は日本語版で再配置した値。
 */
type ControlValue = "original" | "relocated";

export type CharCodec = {
  /** 表示文字 1 つをバイト列にする。表せない文字は `null` */
  encodeChar(char: string): number[] | null;
  /** `at` から表示文字を 1 つ読む。表示文字でなければ `null` */
  decodeChar(bytes: Uint8Array, at: number): { char: string; length: number } | null;
};

export function textCodec(chars: CharCodec, value: ControlValue): TextCodec {
  return {
    encode: (text) => encodeText(text, chars, value),
    decode: (bytes) => decodeText(bytes, chars, value),
  };
}

/** 表せない文字は落として `missing` に積む。呼び出し側が誤りとして扱う */
function encodeText(text: string, chars: CharCodec, value: ControlValue): Encoded {
  const out: number[] = [];
  const missing: string[] = [];
  for (const piece of scan(text)) {
    if (piece.kind === "newline") {
      out.push(newline);
    } else if (piece.kind === "char") {
      const bytes = chars.encodeChar(piece.value);
      if (bytes == null) missing.push(piece.value);
      else out.push(...bytes);
    } else if (isRawToken(piece.body)) {
      out.push(...fromRawToken(piece.body));
    } else {
      const control = byToken.get(piece.body);
      if (control == null) throw new Error("知らないトークン: " + piece.body);
      out.push(control[value]);
    }
  }
  return { bytes: Uint8Array.from(out), missing };
}

/** 意味の分からないバイトは 16 進のトークンにする。表示文字の `{` は `{{` と書く */
function decodeText(bytes: Uint8Array, chars: CharCodec, value: ControlValue): string {
  const controls = value === "original" ? byOriginal : byRelocated;
  let out = "";
  for (let at = 0; at < bytes.length; at++) {
    const byte = bytes[at];
    if (byte === newline) {
      out += "\n";
      continue;
    }
    if (byte === sequenceStart) {
      const taken = readSequence(bytes, at);
      at += taken.length - 1;
      out += "{" + toRawToken(taken) + "}";
      continue;
    }
    const control = controls.get(byte);
    if (control != null) {
      out += "{" + control.token + "}";
      continue;
    }
    const decoded = chars.decodeChar(bytes, at);
    if (decoded == null) {
      out += "{" + toRawToken([byte]) + "}";
      continue;
    }
    out += decoded.char === "{" ? "{{" : decoded.char;
    at += decoded.length - 1;
  }
  return out;
}
