/**
 * ダイアログの展開。DTE と 2 段の辞書を組み合わせた方式で、辞書は ROM 内にある。
 * 先頭から 1 バイトずつ読み、値の範囲で処理を分ける。
 */

import { tables } from "../layout.ts";

function word(rom: Uint8Array, at: number): number {
  return rom[at] | (rom[at + 1] << 8);
}

function pushString(rom: Uint8Array, out: number[], at: number) {
  for (let head = at; rom[head] !== 0; head++) out.push(rom[head]);
}

/**
 * 圧縮された 1 件を展開する。
 * 展開は散らしテーブルが `0x00` を返すまで進むが、
 * 文字列の終端は展開後に現れる最初の `0x00` で決まる。
 * 写しや辞書が終端の先まで書き出すため、この 2 つは一致しない。
 */
export function decompress(rom: Uint8Array, offset: number): Uint8Array {
  const out: number[] = [];
  let at = offset;
  for (;;) {
    const code = rom[at++];
    if (code < 0x40) {
      const byte = rom[tables.scatter + code];
      out.push(byte);
      if (byte === 0) break;
    } else if (code < 0x80) {
      for (let count = code & 0x3f; count > 0; count--) out.push(rom[at++]);
    } else if (code < 0xc0) {
      const pair = tables.dte + (code - 0x80) * 2;
      out.push(rom[pair], rom[pair + 1]);
    } else if (code === 0xc0) {
      const index = rom[at++];
      pushString(rom, out, tables.dict16Strings + word(rom, tables.dict16Pointers + index * 2));
    } else {
      const index = code - 0xc1;
      pushString(rom, out, tables.dict8Strings + word(rom, tables.dict8Pointers + index * 2));
    }
  }
  const end = out.indexOf(0);
  return Uint8Array.from(end < 0 ? out : out.slice(0, end));
}

/** 非圧縮の 1 件を読む。`0x00` が終端になる */
export function readPlain(rom: Uint8Array, offset: number): Uint8Array {
  let end = offset;
  while (rom[end] !== 0) end++;
  return rom.slice(offset, end);
}
