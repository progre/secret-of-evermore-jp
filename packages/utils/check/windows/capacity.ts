/** 訳文の 1 ページの行数と 1 行の幅が、表示するウィンドウに収まるかを調べる */

import type { Piece } from "@core";
import { type WideLine, wideLines } from "./line-width.ts";
import { survey, type WindowSite } from "./event/walk.ts";

/** 1 行目は Y = 4 に置かれ、行ごとに 12 進む。Y が `高さ * 8 - 12` を超えるとページを送る */
export function linesFor(height: number): number {
  return Math.floor((height * 8 - 16) / 12) + 1;
}

/** ページごとの行数の最大。空のページは数えない */
export function maxPageLines(pieces: Piece[]): number {
  const pages = [[0]];
  for (const piece of pieces) {
    const page = pages[pages.length - 1];
    if (piece.kind === "pageBreak") {
      pages.push([0]);
    } else if (piece.kind === "newline") {
      page.push(0);
    } else if (piece.kind === "char" || piece.kind === "embed") {
      page[page.length - 1]++;
    }
  }
  return Math.max(
    0,
    ...pages.map((lines) => {
      const filled = lines.flatMap((count, index) => count > 0 ? [index] : []);
      return filled.length === 0 ? 0 : filled[filled.length - 1] - filled[0] + 1;
    }),
  );
}

type Overflow = { message: number; lines: number; capacity: number; site: WindowSite };

/** 複数の箇所に出る文は、入る行数が最も少ないウィンドウで比べる */
export function overflows(
  sites: WindowSite[],
  linesOf: (message: number) => number | null,
): Overflow[] {
  const worst = new Map<number, Overflow>();
  sites
    .flatMap((site) =>
      Array.from(site.messages, (message) => ({
        message,
        lines: linesOf(message) ?? 0,
        capacity: linesFor(site.window.height),
        site,
      }))
    )
    .filter((overflow) => overflow.lines > overflow.capacity)
    .forEach((overflow) => {
      const known = worst.get(overflow.message);
      if (known == null || overflow.capacity < known.capacity) {
        worst.set(overflow.message, overflow);
      }
    });
  return Array.from(worst.values()).sort((a, b) => a.message - b.message);
}

interface WindowCheck {
  overflows: Overflow[];
  unknownInstructions: number;
  /** 1 行のウィンドウに表示する知らせのうち、2 行以上あるもの */
  tallNotices: number[];
  wideLines: WideLine[];
}

/** ROM は書き替えない。ウィンドウの高さは原版のまま使う。`widthOf` は字の幅 */
export function checkWindows(
  rom: Uint8Array,
  dialog: Map<number, Piece[]>,
  widthOf: Map<string, number>,
): WindowCheck {
  const scripts = survey(rom);
  const linesOf = (message: number) => {
    const pieces = dialog.get(message);
    return pieces == null ? null : maxPageLines(pieces);
  };
  return {
    overflows: overflows(scripts.sites, linesOf),
    unknownInstructions: scripts.unknownInstructions,
    tallNotices: Array.from(scripts.queued)
      .filter((message) => (linesOf(message) ?? 0) > 1)
      .sort((a, b) => a - b),
    wideLines: wideLines(scripts, dialog, widthOf),
  };
}
