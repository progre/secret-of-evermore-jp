/** 固定テキスト（メニュー・品名など）の取り出しと検査 */

import { parseScript } from "@features/dialog";
import { originalCodec, shiftJisCodec } from "@features/encoding";
import { measureGroups, readInlineStrings, readStrings } from "@features/fixed";
import { originalWidths } from "@features/font";
import { format } from "../shared/script.ts";
import { readWidths } from "../shared/width.ts";

/**
 * ROM から固定テキストを取り出し、UTF-8 のテキストとして書き出す。
 * 対訳の参照に使う原文は原版の文章そのものなので `build/` へ置き、リポジトリには含めない。
 */
export async function extractFixed(romPath: string): Promise<void> {
  const outPath = "build/fixed-en.toml";

  const rom = await Deno.readFile(romPath);
  const strings = readStrings(rom);
  /** 区画の文字列に続けて、直値で参照される文字列を並べる。件の番号は前から順に振る */
  const inline = readInlineStrings(rom);
  const entries = [...strings, ...inline];
  const all = entries.map((entry) => originalCodec.decode(entry.bytes));
  const bytes = entries.reduce((total, entry) => total + entry.bytes.length + 1, 0);

  await Deno.writeTextFile(outPath, format(new Map(all.map((text, index) => [index, text]))));
  console.log(
    all.length + " 本（" + bytes + " バイト）を " + outPath + " へ取り出した。" +
      "うち直値で参照されるものが " + inline.length + " 本",
  );
}

/** 固定テキストの訳文を検査する。未訳、収録外の文字、枠ごとの幅の超過を報告する */
export async function checkFixed(romPath: string): Promise<void> {
  const englishPath = "build/fixed-en.toml";
  const scriptPath = "data/fixed-ja.toml";

  const rom = await Deno.readFile(romPath);
  const widthOf = await readWidths(rom);
  const english = parseScript(await Deno.readTextFile(englishPath));
  const japanese = parseScript(await Deno.readTextFile(scriptPath));

  const untranslated: number[] = [];
  const unknown = new Map<number, string[]>();
  for (const index of english.keys()) {
    const translated = japanese.get(index) ?? "";
    if (translated === "") {
      untranslated.push(index);
      continue;
    }
    const absent = shiftJisCodec.encode(translated).missing;
    if (absent.length > 0) unknown.set(index, absent);
  }

  console.log(english.size + " 本中 " + (english.size - untranslated.length) + " 本を訳した");
  if (untranslated.length > 0) console.log("未訳の件: " + untranslated.join(", "));
  for (const [index, absent] of unknown) {
    console.log("第 " + index + " 件に収録外の文字: " + absent.join(""));
  }

  const groups = measureGroups(originalCodec, originalWidths(rom), english, japanese, widthOf);
  for (const group of groups) {
    const head = group.name + " 上限 " + group.limit + " ドット";
    console.log(
      group.wide.length === 0 ? head + " 超過なし" : head + " 超過 " + group.wide.join("、"),
    );
  }
  const over = groups.reduce((sum, group) => sum + group.wide.length, 0);
  console.log("原文の最大幅を超える件: " + over);
}
