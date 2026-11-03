/**
 * 台本ファイルの読み込み。件番号を鍵、本文を値とする TOML である。
 * 固定テキストの訳文も同じ形式で書く。
 * 台本ファイルを書き出すのは、検査の工程で原文を `build/` へ書き出すときだけである。
 * そのため、書き出しの処理は `packages/utils/check/script.ts` に置いている。
 */

import { parse as parseToml } from "@std/toml";

export function parseScript(source: string): Map<number, string> {
  const table = parseToml(source);
  return new Map(
    Object.entries(table).map((pair) => {
      if (typeof pair[1] !== "string") {
        throw new Error("第 " + pair[0] + " 件が文字列ではない");
      }
      return [Number(pair[0]), pair[1]];
    }),
  );
}
