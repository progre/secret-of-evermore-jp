/** 訳文の機械検査 */

import {
  checkGlossary,
  checkPunctuation,
  parseGlossary,
  todoMarker,
  unmarkedSpeakers,
} from "@features/dialog";
import { readScriptPieces } from "../shared/script.ts";

/** 訳文が用語集に従っているか調べる。原文に原語があり、訳文に訳語が無い件を報告する */
export async function reviewGlossary(): Promise<void> {
  const glossaryPath = "data/check/glossary.tsv";
  const englishPath = "build/dialog-en.toml";
  const japanesePath = "data/dialog-ja.toml";

  const terms = parseGlossary(await Deno.readTextFile(glossaryPath));
  const english = await readScriptPieces(englishPath);
  const japanese = await readScriptPieces(japanesePath);
  const report = checkGlossary(terms, english, japanese);

  console.log("用語 " + terms.length + " 件で、訳済み " + report.checked + " 件を調べた");
  if (report.undecided.length > 0) {
    console.log("訳語が未定の用語: " + report.undecided.join(", "));
  }
  if (report.todo.length > 0) {
    console.log(report.todo.length + " 件に " + todoMarker + " が残る: " + report.todo.join(", "));
  }
  if (report.missing.length > 0) {
    console.log(report.missing.length + " 箇所で訳語が使われていない");
    console.log(report.missing.slice(0, 20).join("\n"));
  }
}

export async function reviewSpeakers(): Promise<void> {
  const japanesePath = "data/dialog-ja.toml";

  const unmarked = unmarkedSpeakers(await readScriptPieces(japanesePath));
  console.log("話者の印のない件 " + unmarked.length + " 件");
}

/** 訳文の末尾の終止符が原文と食い違う件を報告する */
export async function reviewPunctuation(): Promise<void> {
  const englishPath = "build/dialog-en.toml";
  const japanesePath = "data/dialog-ja.toml";

  const english = await readScriptPieces(englishPath);
  const japanese = await readScriptPieces(japanesePath);
  const report = checkPunctuation(english, japanese);

  console.log(report.checked + " 件の末尾を突き合わせた");
  if (report.ellipsis.length > 0) {
    console.log(report.ellipsis.length + " 件で省略記号が食い違う");
    console.log(report.ellipsis.join("\n"));
  }
  if (report.others.length > 0) {
    console.log(report.others.length + " 件で終止符が食い違う（参考）");
    console.log(report.others.join("\n"));
  }
}
