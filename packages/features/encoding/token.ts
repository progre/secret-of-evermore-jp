/**
 * トークン付きテキストの走査。
 * 波括弧で囲んだ部分がトークンで、表示文字としての `{` は `{{` と書く。
 */

import type { Piece } from "@core";
import { byToken } from "./control.ts";

/** 書式のまま読んだ部品。トークンは中身の文字列を持つ */
type Token =
  | { kind: "char"; value: string }
  | { kind: "newline" }
  | { kind: "token"; body: string };

export function scan(text: string): Token[] {
  const pieces: Token[] = [];
  const chars = Array.from(text);
  for (let at = 0; at < chars.length; at++) {
    const char = chars[at];
    if (char === "\n") {
      pieces.push({ kind: "newline" });
    } else if (char === "{" && chars[at + 1] === "{") {
      pieces.push({ kind: "char", value: "{" });
      at++;
    } else if (char === "{") {
      const end = chars.indexOf("}", at);
      if (end < 0) {
        throw new Error("閉じていない波括弧がある: " + chars.slice(at, at + 16).join(""));
      }
      pieces.push({ kind: "token", body: chars.slice(at + 1, end).join("") });
      at = end;
    } else {
      pieces.push({ kind: "char", value: char });
    }
  }
  return pieces;
}

/** 話者の印 `{@名前}` の頭の記号 */
const speakerMark = "@";

/** トークンを表示上の役割で見分けて読む。役割の無いトークンと 16 進のトークンは、そのほかの制御コードとする */
export function readPieces(text: string): Piece[] {
  return scan(text).map((token): Piece => {
    if (token.kind !== "token") {
      return token;
    }
    if (token.body.startsWith(speakerMark)) {
      return { kind: "speaker", name: token.body.slice(speakerMark.length) };
    }
    return { kind: byToken.get(token.body)?.role ?? "control" };
  });
}

/**
 * 話者の印 `{@名前}` を取り除く。ビルドは、印を除いた台本を ROM へ書く。
 * 書いた本文を読み直したら、印を除いた台本と照らし合わせる
 */
export function stripSpeakers(text: string): string {
  let out = "";
  const chars = Array.from(text);
  for (let at = 0; at < chars.length; at++) {
    if (chars[at] === "{" && chars[at + 1] === "{") {
      out += "{{";
      at++;
    } else if (chars[at] === "{" && chars[at + 1] === speakerMark) {
      const end = chars.indexOf("}", at);
      if (end < 0) {
        throw new Error("閉じていない話者の印がある: " + chars.slice(at, at + 16).join(""));
      }
      at = end;
    } else {
      out += chars[at];
    }
  }
  return out;
}
