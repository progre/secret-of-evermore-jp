/**
 * 訳文とワークスペースを検査する。原版の ROM は、リポジトリーの直下に No-Intro の名前で置く。
 * 先に原文を `build/` へ取り出し、検査はそれを読む。
 * 依存の検査は違反があると終了コード 1 で止まるため、最後に置く。
 */

import { extractDialog, listContinued } from "./translation/dialog.ts";
import { checkFixed, extractFixed } from "./translation/fixed.ts";
import { reviewGlossary, reviewPunctuation, reviewSpeakers } from "./translation/review.ts";
import { reviewWindows } from "./windows/windows.ts";
import { checkDeps } from "./workspace/check.ts";

async function main(): Promise<void> {
  const basePath = "Secret of Evermore (USA).sfc";
  await Deno.mkdir("build", { recursive: true });
  const steps: [string, () => Promise<void>][] = [
    ["会話の原文の取り出し", () => extractDialog(basePath)],
    ["固定テキストの原文の取り出し", () => extractFixed(basePath)],
    ["文が次の件へ続く箇所", () => listContinued(basePath)],
    ["固定テキスト", () => checkFixed(basePath)],
    ["用語集", reviewGlossary],
    ["終止符", reviewPunctuation],
    ["話者", reviewSpeakers],
    ["ウィンドウ", () => reviewWindows(basePath)],
    ["パッケージ間の依存", checkDeps],
  ];
  for (const [name, step] of steps) {
    console.log("## " + name);
    await step();
  }
}

if (import.meta.main) {
  await main();
}
