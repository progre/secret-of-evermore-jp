/**
 * 台本ファイルの読み書き。件番号を鍵、本文を値とする TOML である。
 * 読み込みは `@features/dialog` の `parseScript` が `@std/toml` で行う。
 * 書き出しには `@iarna/toml` を使う。改行を含む値を `"""` で囲み、改行をそのまま残すためである。
 * `@std/toml` の `stringify` は改行を `\n` に置き換えるので、訳す人が読みにくくなる。
 */

import TOML from "@iarna/toml";
import { parseScript } from "@features/dialog";
import { readPieces } from "@features/encoding";

export function format(entries: Map<number, string>): string {
  const sorted = Array.from(entries).sort((a, b) => a[0] - b[0]);
  return TOML.stringify(Object.fromEntries(sorted.map((pair) => [String(pair[0]), pair[1]])));
}

/** 台本ファイルを読み、各件をトークン付きテキストの部品の並びにする */
export async function readScriptPieces(path: string) {
  const script = parseScript(await Deno.readTextFile(path));
  return new Map(Array.from(script, ([index, text]) => [index, readPieces(text)]));
}
