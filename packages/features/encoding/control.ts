/**
 * 制御コードとトークンの対応。
 * 原文の取り出しと日本語の書き込みで同じトークンを使い、バイト値だけを読み替える。
 * 日本語版では、Shift-JIS の第 1 バイトと重なる制御コードを `0x00`-`0x1F` へ移して書く。
 */

/** 表示上の役割。改ページと、名前・アイテム名・数量などの差し込み */
type Role = "pageBreak" | "embed";

type Control = { token: string; original: number; relocated: number; role?: Role };

/**
 * 再配置は高位ビットを落とすだけとする。
 * `0x8B` だけは落とし先が垂直タブと重なるため `0x0C` へ逃がす。
 * `0xA1` 以降は Shift-JIS の第 1 バイトではないため据え置く。
 * 用途の分からないコードは元の値をそのまま名前にする。
 */
export const controls: readonly Control[] = [
  { token: "choice", original: 0x8b, relocated: 0x0c },
  { token: "code85", original: 0x85, relocated: 0x05 },
  { token: "code87", original: 0x87, relocated: 0x07, role: "pageBreak" },
  { token: "code92", original: 0x92, relocated: 0x12 },
  { token: "code93", original: 0x93, relocated: 0x13 },
  { token: "code94", original: 0x94, relocated: 0x14 },
  { token: "code96", original: 0x96, relocated: 0x16 },
  { token: "code97", original: 0x97, relocated: 0x17 },
  { token: "codeA3", original: 0xa3, relocated: 0xa3, role: "embed" },
  { token: "dog", original: 0x82, relocated: 0x02, role: "embed" },
  { token: "hero", original: 0x81, relocated: 0x01, role: "embed" },
  { token: "item", original: 0xa2, relocated: 0xa2, role: "embed" },
  { token: "member3", original: 0x83, relocated: 0x03, role: "embed" },
  { token: "member4", original: 0x84, relocated: 0x04, role: "embed" },
  { token: "page", original: 0x86, relocated: 0x06, role: "pageBreak" },
  { token: "qty", original: 0xa1, relocated: 0xa1, role: "embed" },
  { token: "vtab", original: 0x0b, relocated: 0x0b },
];

export const byToken = new Map(controls.map((control) => [control.token, control]));
export const byOriginal = new Map(controls.map((control) => [control.original, control]));
export const byRelocated = new Map(controls.map((control) => [control.relocated, control]));

/** 改行はトークンにせず、そのまま行を分ける */
export const newline = 0x0a;

/**
 * 用途の分からない可変長シーケンスの先頭。
 * 次のバイトから読み進め、`0x80` から `0x82` のいずれかに達すると終わる。
 */
export const sequenceStart = 0x80;

function endsSequence(byte: number): boolean {
  return byte >= 0x80 && byte <= 0x82;
}

/**
 * `0x80` から始まるシーケンスを、終端のバイトまで含めて読む。
 * 先頭の次の 1 バイトは終端の判定にかけない。
 * そこに `0x81` が入る件があり、判定にかけると切り上げて以降の分解がずれる。
 */
export function readSequence(bytes: Uint8Array, start: number): number[] {
  const taken = [bytes[start]];
  for (let at = start + 1; at < bytes.length; at++) {
    taken.push(bytes[at]);
    if (at > start + 1 && endsSequence(bytes[at])) break;
  }
  return taken;
}

/** 意味を割り当てていないバイトは 16 進 2 桁で書く。空白区切りで並べてもよい */
export function isRawToken(body: string): boolean {
  return /^[0-9A-F]{2}( [0-9A-F]{2})*$/.test(body);
}

export function toRawToken(bytes: number[]): string {
  return bytes.map((byte) => byte.toString(16).toUpperCase().padStart(2, "0")).join(" ");
}

export function fromRawToken(body: string): number[] {
  return body.split(" ").map((part) => parseInt(part, 16));
}
