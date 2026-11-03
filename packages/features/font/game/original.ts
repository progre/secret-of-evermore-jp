/**
 * 原版のフォント。フォントブロックは 2 つあり、それぞれ 2 バイトの見出しと
 * 24 バイトのグリフ 128 個の後ろに、幅テーブル 128 バイトが続く。
 */

const largeFont = 0x40000;
const blockSize = 0xc82;
export const fontBlocksSize = blockSize * 2;

/** 幅テーブルの添字は文字コードから `0x20` を引いた値になる（`cca53a` の `SBC #$0x20`） */
export function originalWidths(rom: Uint8Array): Uint8Array {
  const start = largeFont + 2 + 128 * 24;
  return rom.slice(start, start + 128);
}

/**
 * 原版フォントを拡張領域の `to` へ写す。日本語と同じバンクに置くことで、
 * グリフ参照のバンクを書き換えてもメニューなどの英語表示が壊れない。
 */
export function copyOriginalFont(rom: Uint8Array, to: number): void {
  rom.set(rom.subarray(largeFont, largeFont + fontBlocksSize), to);
}
