/** ダイアログの原文の取り出しと、文が次の件へ続く箇所の一覧 */

import { continuedInto, readAll } from "@features/dialog";
import { originalCodec, readPieces } from "@features/encoding";
import { format } from "../shared/script.ts";

/**
 * ROM から全ダイアログを取り出し、トークン付きの UTF-8 テキストとして書き出す。
 * 対訳の参照に使う原文は原版の文章そのものなので `build/` へ置き、リポジトリには含めない。
 */
export async function extractDialog(romPath: string): Promise<void> {
  const outPath = "build/dialog-en.toml";

  const entries = readAll(await Deno.readFile(romPath)).map((bytes) => originalCodec.decode(bytes));

  await Deno.writeTextFile(outPath, format(new Map(entries.map((text, index) => [index, text]))));
  console.log(entries.length + " 件を " + outPath + " へ取り出した");
}

/** 原文で、1 つの文が次の件へ続く箇所を一覧する。2 件をまとめて訳す手がかりにする */
export async function listContinued(romPath: string): Promise<void> {
  const entries = readAll(await Deno.readFile(romPath));
  const continued = continuedInto(entries.map((bytes) => readPieces(originalCodec.decode(bytes))));

  console.log(continued.length + " 箇所で文が次の件へ続くとみられる");
  console.log(continued.map((index) => index + "→" + (index + 1)).join(" "));
}
