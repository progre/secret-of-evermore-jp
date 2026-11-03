/** フォントから読んだグリフ */

export type Glyph = {
  /** 次の文字までの送り幅 */
  advance: number;
  width: number;
  /** グリフの左端をセル左端から測った位置 */
  left: number;
  /** グリフの上端をセル上端から測った位置 */
  top: number;
  /** 1 行 1 要素。最上位ビットが左端 */
  rows: number[];
};

/** キーは文字 */
export type Font = Map<string, Glyph>;
