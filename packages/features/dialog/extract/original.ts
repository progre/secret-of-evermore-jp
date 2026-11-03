/** 原版のダイアログで、1 つの文が次の件へ続く箇所 */

import type { Piece } from "@core";
import { displayText } from "../review/translation.ts";

/**
 * 前の件が終止符で終わらず、次の件が小文字で始まる箇所を候補とする。
 * 英語と日本語では語順が違うため、候補は 2 件をまとめて訳さないと文が壊れる。
 */
export function continuedInto(texts: Piece[][]): number[] {
  const shown = texts.map(displayText);
  const found: number[] = [];
  for (let index = 0; index + 1 < shown.length; index++) {
    const before = shown[index];
    const after = shown[index + 1];
    if (before === "" || after === "") continue;
    if (".!?:".includes(before.slice(-1))) continue;
    const head = after.slice(0, 1);
    if (head >= "a" && head <= "z") found.push(index);
  }
  return found;
}
