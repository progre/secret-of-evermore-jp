/** 訳文に付けた話者の印 `{@名前}` の検査 */

import type { Piece } from "@core";

/** 表示文字があるのに話者の印がない件 */
export function unmarkedSpeakers(dialog: Map<number, Piece[]>): number[] {
  return Array.from(dialog)
    .filter(([, pieces]) =>
      pieces.some((piece) => piece.kind === "char") &&
      !pieces.some((piece) => piece.kind === "speaker")
    )
    .map(([index]) => index);
}
