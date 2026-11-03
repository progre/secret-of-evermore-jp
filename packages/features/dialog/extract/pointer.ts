/**
 * 原版のダイアログのポインタテーブル。
 * 3 バイトに 15bit のバンク内位置と 8bit のバンク番号を詰め込む。
 * バンク内位置が 15bit しかないため、各バンクの前半 32KB しか指せない。
 */

import { dialogCount, dialogPointers } from "../layout.ts";
import { decompress, readPlain } from "./decompress.ts";

type Pointer = { offset: number; compressed: boolean };

export function readPointer(rom: Uint8Array, index: number): Pointer {
  const head = dialogPointers + index * 3;
  const low = rom[head] | (rom[head + 1] << 8);
  const high = rom[head + 1] | (rom[head + 2] << 8);
  return {
    offset: (low & 0x7fff) | ((high & 0x7f80) << 9),
    compressed: (rom[head + 2] & 0x80) !== 0,
  };
}

/** 1 件分のバイト列を取り出す。圧縮の有無はポインタの最上位ビットが示す */
function readEntry(rom: Uint8Array, index: number): Uint8Array {
  const pointer = readPointer(rom, index);
  return pointer.compressed ? decompress(rom, pointer.offset) : readPlain(rom, pointer.offset);
}

export function readAll(rom: Uint8Array): Uint8Array[] {
  return Array.from({ length: dialogCount }, (_, index) => readEntry(rom, index));
}
