/** 拡張領域に置くフォントのデータ。番地は `packages/app/patch/base/glyph.s` のグリフと幅の読み出しが前提にする */

import { fontBlocksSize } from "./original.ts";

type FontSizes = { glyphs: number; widths: number; leadOffset: number };

export function fontRegions(sizes: FontSizes): { name: string; size: number; at?: number }[] {
  return [
    /**
     * 原版のフォントブロック 2 つ（1 つ `0xC82` バイト）の複製。
     * グリフの参照はバンクを直に書くため（`cca60c`）、原版のぶんも拡張領域へ写す。
     * 複製先を `c4` バンク内と同じオフセットに置くことで、
     * 実行時に設定されるフォント基点 `!$0b41` の値をそのまま使える。
     */
    { name: "original_font", size: fontBlocksSize, at: 0x300000 },
    /**
     * グリフ番号には `0x800` を上乗せして渡す（`packages/app/patch/base/wide-char.s`）。
     * 1 グリフ 32 バイト間隔なので上乗せぶんはちょうど 1 バンクにあたり、
     * グリフの位置が「原版フォントの次のバンクの先頭 + グリフ番号 * 32」で求まる。
     */
    { name: "glyphs", size: sizes.glyphs, at: 0x310000 },
    { name: "widths", size: sizes.widths },
    /** 第 1 バイトの先頭位置表 */
    { name: "lead_offset", size: sizes.leadOffset },
  ];
}
