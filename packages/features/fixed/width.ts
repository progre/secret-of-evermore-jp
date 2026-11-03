/**
 * 固定テキストの訳文の幅。
 * 画面の桁幅は実行時の WRAM にあり読めないため、原文の最大幅を上限の目安として使う。
 * 原版がその幅で収まっている以上、それを超えなければ崩れないとみなせる。
 */

import type { TextCodec } from "@core";

/** 同じ枠に並ぶ件のまとまり。番号は `build/fixed-en.toml` の並び順にあたる */
const groups = [
  { name: "武器", from: 4, to: 19 },
  { name: "武器の説明", from: 20, to: 32 },
  { name: "防具", from: 33, to: 72 },
  { name: "メニューの見出し", from: 95, to: 103 },
  { name: "呪文", from: 104, to: 142 },
  { name: "呪文の説明", from: 143, to: 181 },
  { name: "材料", from: 182, to: 203 },
  { name: "味方の術", from: 208, to: 224 },
  { name: "人物と敵", from: 225, to: 327 },
  { name: "品", from: 328, to: 372 },
  { name: "品の説明", from: 373, to: 386 },
  { name: "画面の見出しと案内", from: 404, to: 426 },
  { name: "ステータスの見出し", from: 427, to: 450 },
  { name: "錬金術の画面", from: 451, to: 454 },
  { name: "セーブ画面", from: 455, to: 472 },
] as const;

interface GroupWidth {
  name: string;
  limit: number;
  /** 上限を超えた件の報告 */
  wide: string[];
}

/**
 * 原文を原版の符号 `original` に戻し、表示文字（`0x20`-`0x7F`）の幅だけを足す。制御コードは幅を持たない。
 * `originalWidths` は原版フォントの幅テーブルで、添字は文字コードから `0x20` を引いた値。
 */
function englishDots(original: TextCodec, originalWidths: Uint8Array, text: string): number {
  return original.encode(text).bytes.reduce(
    (total, byte) => byte >= 0x20 && byte <= 0x7f ? total + originalWidths[byte - 0x20] : total,
    0,
  );
}

function japaneseDots(widthOf: Map<string, number>, text: string): number {
  let total = 0;
  for (const char of text) total += widthOf.get(char) ?? 0;
  return total;
}

export function measureGroups(
  original: TextCodec,
  originalWidths: Uint8Array,
  english: Map<number, string>,
  japanese: Map<number, string>,
  widthOf: Map<string, number>,
): GroupWidth[] {
  return groups.map((group) => {
    let limit = 0;
    for (let index = group.from; index <= group.to; index += 1) {
      limit = Math.max(limit, englishDots(original, originalWidths, english.get(index) ?? ""));
    }
    const wide: string[] = [];
    for (let index = group.from; index <= group.to; index += 1) {
      const text = japanese.get(index) ?? "";
      if (text === "") continue;
      const dots = japaneseDots(widthOf, text);
      if (dots > limit) wide.push("第 " + index + " 件 " + text + "（" + dots + "）");
    }
    return { name: group.name, limit, wide };
  });
}
