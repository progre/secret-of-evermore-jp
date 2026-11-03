/**
 * 収録した文字を Shift-JIS が定める位置へ並べ、
 * ゲームのフォント形式のグリフデータ、幅テーブル、第 1 バイトの先頭位置表を作る。
 */

import { parseBdf } from "../bdf.ts";
import { type Built, cellHeight, encodeFont, type Placement } from "./format.ts";
import {
  buildLayout,
  encodeLeadTable,
  type GlyphChars,
  type Layout,
  orderedChars,
} from "./layout.ts";
import { fusionFont } from "./fusion.ts";

interface GameFont {
  chars: string[];
  layout: Layout;
  placements: Placement[];
  built: Built;
  leadTable: Uint8Array;
}

/**
 * 字の形と送り幅は Fusion Pixel 10px の BDF `bdf` から取る。
 * 字の高さが升目の 12 行に満たないので、行のあいだが空く。
 * グリフを用意する字は `glyphChars` で受け取る
 */
export function buildGameFont(bdf: string, glyphChars: GlyphChars): GameFont {
  const source = fusionFont(parseBdf(bdf, cellHeight), glyphChars);
  const chars = orderedChars(glyphChars);
  const layout = buildLayout(Array.from(glyphChars.values()));
  const placements: Placement[] = chars.map((char) => ({
    char,
    slot: layout.slots.get(glyphChars.get(char) ?? 0) ?? 0,
  }));
  const built = encodeFont(placements, layout.slotCount, source);
  return { chars, layout, placements, built, leadTable: encodeLeadTable(layout.leadOffsets) };
}
