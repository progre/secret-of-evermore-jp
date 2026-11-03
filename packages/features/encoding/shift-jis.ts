/**
 * 日本語版の符号。表示文字は Shift-JIS の 2 バイト、制御コードは再配置した 1 バイトで表す。
 * 制御コードの値と第 1 バイトの範囲は重ならないため、境界は先頭バイトだけで決まる。
 * 表示文字と Shift-JIS の対応は `encoding-japanese` に任せる。
 *
 * 英数字と空白とハイフンは、原版フォントの 1 バイトで書く。原版の英字と見た目をそろえるため。
 * ほかの半角の記号は収録しない。訳文に混ざっていれば、収録外の文字として報告される。
 */

import Encoding from "encoding-japanese";
import type { TextCodec } from "@core";
import { type CharCodec, textCodec } from "./codec.ts";

const singleByte = /^[ 0-9A-Za-z-]$/;

/** 描画ルーチンが 2 バイト文字の第 1 バイトとして読む範囲（`packages/app/patch/base/control-code.s`） */
function isLead(byte: number): boolean {
  return (byte >= 0x81 && byte <= 0x9f) || (byte >= 0xe0 && byte <= 0xef);
}

/** 表せない字は `?` の 1 バイトになるため、2 バイトでなければ収録外とする */
function encodeWide(char: string): number[] | null {
  const bytes = Encoding.convert(Encoding.stringToCode(char), { to: "SJIS", from: "UNICODE" });
  return bytes.length === 2 ? bytes : null;
}

/** 字の割り当てのない符号は `?` になる */
function decodeWide(lead: number, trail: number): string | null {
  const char = Encoding.codeToString(
    Encoding.convert([lead, trail], { to: "UNICODE", from: "SJIS" }),
  );
  return char === "?" ? null : char;
}

const chars: CharCodec = {
  encodeChar(char) {
    return singleByte.test(char) ? [char.charCodeAt(0)] : encodeWide(char);
  },
  decodeChar(bytes, at) {
    const single = String.fromCharCode(bytes[at]);
    if (singleByte.test(single)) {
      return { char: single, length: 1 };
    }
    if (!isLead(bytes[at]) || at + 1 >= bytes.length) {
      return null;
    }
    const char = decodeWide(bytes[at], bytes[at + 1]);
    return char == null ? null : { char, length: 2 };
  },
};

/** 日本語版の符号。収録していない文字は落として `missing` に積み、呼び出し側が誤りとして扱う */
export const shiftJisCodec: TextCodec = textCodec(chars, "relocated");

/**
 * JIS X 0208 の字がある第 1 バイト（区 1 から区 8 と、区 16 から区 84）。
 * 区 9 から区 15 と、区 85 以降にある Windows の拡張文字は、グリフを用意しないので含めない
 */
const jisLeads = [
  ...Array.from({ length: 0x84 - 0x81 + 1 }, (_, index) => 0x81 + index),
  ...Array.from({ length: 0x9f - 0x88 + 1 }, (_, index) => 0x88 + index),
  ...Array.from({ length: 0xea - 0xe0 + 1 }, (_, index) => 0xe0 + index),
];

const trails = Array.from({ length: 0xfc - 0x40 + 1 }, (_, index) => 0x40 + index)
  .filter((trail) => trail !== 0x7f);

/** グリフを用意する字から Shift-JIS の 2 バイトを引く。値は `第 1 バイト << 8 | 第 2 バイト` */
export const shiftJisTable: ReadonlyMap<string, number> = new Map(
  jisLeads.flatMap((lead) =>
    trails.flatMap((trail): [string, number][] => {
      const char = decodeWide(lead, trail);
      return char == null ? [] : [[char, (lead << 8) | trail]];
    })
  ),
);
