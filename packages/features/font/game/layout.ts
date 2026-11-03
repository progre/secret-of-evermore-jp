/**
 * ROM 内でのグリフ番号の割り当て。
 * 第 2 バイトの取りうる値は 0x40-0x7E と 0x80-0xFC の 188 個で、ちょうど 2 区分にあたる。
 * この性質のおかげで、グリフ番号は第 1 バイトごとの先頭位置に第 2 バイトの連番を足すだけで求まる。
 */

import type { TextCodec } from "@core";

/** グリフを用意する字から、Shift-JIS の 2 バイト（`第 1 バイト << 8 | 第 2 バイト`）を引く表 */
export type GlyphChars = ReadonlyMap<string, number>;

/** 第 1 バイト 1 つが受け持つグリフの数 */
const trailsPerLead = 188;

/** 第 2 バイトを 0 から 187 の連番に直す。`0x7F` は使わないのでそこだけ詰める */
export function trailIndex(trail: number): number {
  return trail - 0x40 - (trail > 0x7f ? 1 : 0);
}

export type Layout = {
  /** 第 1 バイトから先頭グリフ番号を引く。使わない第 1 バイトは持たない */
  leadOffsets: Map<number, number>;
  /** Shift-JIS の 2 バイト（`第 1 バイト << 8 | 第 2 バイト`）からグリフ番号を引く */
  slots: Map<number, number>;
  slotCount: number;
};

/** 使う第 1 バイトだけを詰めて並べ、グリフ番号を割り当てる */
export function buildLayout(codes: number[]): Layout {
  const leads = Array.from(new Set(codes.map((code) => code >> 8))).sort((a, b) => a - b);
  const leadOffsets = new Map(leads.map((lead, index) => [lead, index * trailsPerLead]));
  const slots = new Map(
    codes.map((code) => [code, (leadOffsets.get(code >> 8) ?? 0) + trailIndex(code & 0xff)]),
  );
  return { leadOffsets, slots, slotCount: leads.length * trailsPerLead };
}

/**
 * 描画ルーチンが引く先頭位置の表を作る。
 * `0x81` から順に 1 語 2 バイトで並べ、使わない第 1 バイトには `0xFFFF` を置く。
 */
export function encodeLeadTable(leadOffsets: Map<number, number>): Uint8Array {
  const last = Math.max(...leadOffsets.keys());
  const table = new Uint8Array((last - 0x81 + 1) * 2).fill(0xff);
  for (const [lead, offset] of leadOffsets) {
    const head = (lead - 0x81) * 2;
    table[head] = offset & 0xff;
    table[head + 1] = offset >> 8;
  }
  return table;
}

/** 収録した文字を Shift-JIS の順に並べる */
export function orderedChars(chars: GlyphChars): string[] {
  return Array.from(chars)
    .sort((a, b) => a[1] - b[1])
    .map((pair) => pair[0]);
}

/** 原版の 1 バイトの表示文字 `0x20`-`0x7E` */
const displayChars = Array.from({ length: 0x5f }, (_, index) => String.fromCharCode(0x20 + index));

/**
 * 文字ごとの表示幅。`chars` の字はフォントの生成で書き出した幅テーブル `widths` から引く。
 * 日本語版の符号 `japanese` が 1 バイトで書く英数字は、原版フォントの幅テーブル `originalWidths` から引く
 */
export function widthTable(
  chars: GlyphChars,
  japanese: TextCodec,
  widths: Uint8Array,
  originalWidths: Uint8Array,
): Map<string, number> {
  const layout = buildLayout(Array.from(chars.values()));
  const wide = Array.from(chars, ([char, code]): [string, number] => {
    return [char, widths[layout.slots.get(code) ?? 0]];
  });
  // `{` はトークンの書き始めとして読まれるため、符号化する前に除く
  const single = displayChars
    .filter((char) => char !== "{" && japanese.encode(char).bytes.length === 1)
    .map((char): [string, number] => [char, originalWidths[char.charCodeAt(0) - 0x20]]);
  return new Map(wide.concat(single));
}
