/**
 * 訳文の 1 行が、表示するウィンドウの 1 行の幅に収まるかを調べる。
 * ゲームは字の幅に字間を足して積み、1 行の幅を超える字を次の行へ送る（`cc9f4f`）。
 */

import type { Piece } from "@core";
import type { Survey } from "./event/walk.ts";

/** 字間（`+0x06`）。ウィンドウを設定する命令の共通の続き（`ccd941`）が置く */
const spacing = 1;
/**
 * 左の余白（`+0x0a`）。会話のウィンドウでは、`ccd941` が 4 を書き込む。
 * 知らせのウィンドウは `ccd941` を通らない。余白を書き込む処理は確かめておらず、会話と同じ 4 と仮定する
 */
const margin = 4;
/** 知らせのウィンドウの幅（タイル） */
const noticeWidth = 30;

/** ウィンドウの 1 行の幅。左右に余白を取る（`cc9e07`） */
export function lineLimit(width: number): number {
  return width * 8 - margin * 2;
}

/** 行ごとの幅。名前などを表示するトークンは中身で幅が変わるため数えない */
export function lineWidths(pieces: Piece[], widthOf: Map<string, number>): number[] {
  const lines = [0];
  for (const piece of pieces) {
    if (piece.kind === "newline" || piece.kind === "pageBreak") {
      lines.push(0);
    } else if (piece.kind === "char") {
      lines[lines.length - 1] += (widthOf.get(piece.value) ?? 0) + spacing;
    }
  }
  return lines;
}

export type WideLine = { message: number; line: number; width: number; limit: number };

/** 文ごとの 1 行の幅の上限。複数のウィンドウに出る文は最も狭いもので比べる */
function limits(survey: Pick<Survey, "sites" | "queued">): Map<number, number> {
  const limitOf = new Map<number, number>();
  const narrow = (message: number, limit: number) => {
    limitOf.set(message, Math.min(limitOf.get(message) ?? limit, limit));
  };
  survey.sites.forEach((site) => {
    site.messages.forEach((message) => narrow(message, lineLimit(site.window.width)));
  });
  survey.queued.forEach((message) => narrow(message, lineLimit(noticeWidth)));
  return limitOf;
}

/** ウィンドウの分からない文は調べない */
export function wideLines(
  survey: Pick<Survey, "sites" | "queued">,
  dialog: Map<number, Piece[]>,
  widthOf: Map<string, number>,
): WideLine[] {
  return Array.from(limits(survey))
    .sort(([a], [b]) => a - b)
    .flatMap(([message, limit]) =>
      lineWidths(dialog.get(message) ?? [], widthOf).flatMap((width, line) =>
        width > limit ? [{ message, line: line + 1, width, limit }] : []
      )
    );
}
