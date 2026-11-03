/**
 * ゲームのフォント形式との相互変換。
 * 1 グリフは 24 バイトで、左半分 8x12 の 12 バイトに右半分 8x12 の 12 バイトが続く。
 * 各バイトは最上位ビットが左端にあたる。
 */

import type { Font, Glyph } from "../glyph.ts";

const glyphBytes = 24;

/**
 * 拡張領域でグリフを並べる間隔。中身は 24 バイトで、残りは詰め物になる。
 * 描画ルーチンはグリフを 16bit の添字で辿り、バンクをまたげない。
 * 2 の冪にするとバンクの切れ目がグリフの切れ目と重なり、
 * 1 文字が 2 つのバンクに割れることがなくなる。
 */
const glyphStride = 32;
const cellWidth = 16;
export const cellHeight = 12;

/** 文字とその置き場所。グリフ番号は Shift-JIS から決まるため飛び飛びになる */
export type Placement = { char: string; slot: number };

export type Built = { glyphs: Uint8Array; widths: Uint8Array; missing: string[] };

/** グリフを升目に置いた 12 行分のビット列に均す。ビット 15 が左端 */
function toCellRows(glyph: Glyph): number[] {
  const cell = new Array(cellHeight).fill(0);
  glyph.rows.forEach((bits, row) => {
    const y = glyph.top + row;
    if (y < 0 || y >= cellHeight) return;
    const shift = cellWidth - glyph.left - glyph.width;
    cell[y] |= shift >= 0 ? bits << shift : bits >> -shift;
  });
  return cell;
}

export function encodeGlyph(glyph: Glyph): Uint8Array {
  const bytes = new Uint8Array(glyphBytes);
  toCellRows(glyph).forEach((bits, row) => {
    bytes[row] = (bits >> 8) & 0xff;
    bytes[row + cellHeight] = bits & 0xff;
  });
  return bytes;
}

/** グリフ番号の位置へ順に置く。どの文字も割り当たらない番号は 0 のまま残る */
export function encodeFont(placements: Placement[], slotCount: number, font: Font): Built {
  const glyphs = new Uint8Array(slotCount * glyphStride);
  const widths = new Uint8Array(slotCount);
  const missing: string[] = [];
  for (const placement of placements) {
    const glyph = font.get(placement.char);
    if (!glyph) {
      missing.push(placement.char);
      continue;
    }
    glyphs.set(encodeGlyph(glyph), placement.slot * glyphStride);
    widths[placement.slot] = glyph.advance;
  }
  return { glyphs, widths, missing };
}
