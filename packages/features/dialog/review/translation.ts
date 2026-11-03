/**
 * 訳文の機械検査。用語集の訳語と、文末の終止符を原文と突き合わせる。
 * 訳語のブレや終止符の食い違いは読み返しでは取りこぼすため、機械で拾う。
 */

import { parse } from "@std/csv";
import { escape } from "@std/regexp";
import type { Piece } from "@core";

/** 話者を決めかねた件の末尾に付けていた印。ゲーム内にそのまま出るため、訳文に残っていないか調べる */
export const todoMarker = "※";

/** 制御コードを落とし、改行を空白に変えて表示文字だけを並べる */
export function displayText(pieces: Piece[]): string {
  const texts = pieces.map((piece) => {
    if (piece.kind === "char") return piece.value;
    return piece.kind === "newline" ? " " : "";
  });
  return texts.join("").replace(/\s+/g, " ").trim();
}

/** 表示文字だけを、改行も挟まずに並べる */
function charsOf(pieces: Piece[]): string {
  return pieces.map((piece) => piece.kind === "char" ? piece.value : "").join("");
}

/** 表示文字以外を空白にする。英単語のあいだに改行や制御コードがあっても、2 語が 1 語につながらない */
function wordsOf(pieces: Piece[]): string {
  return pieces.map((piece) => piece.kind === "char" ? piece.value : " ").join("");
}

interface Term {
  kind: string;
  source: string;
  target: string;
}

/** 1 行目は見出し（種別・原語・訳語・備考）で、列はタブで区切る */
export function parseGlossary(text: string): Term[] {
  return parse(text, { separator: "\t", fieldsPerRecord: -1 }).slice(1).map((columns) => ({
    kind: columns[0],
    source: columns[1],
    target: columns[2] ?? "",
  }));
}

/** 単語の途中に埋もれた一致を除く。複数形の `s` と `es` は同じ語として扱う */
function matcher(source: string): RegExp {
  return new RegExp("(?<![A-Za-z])" + escape(source) + "(?:es|s)?(?![A-Za-z])", "g");
}

/** 表示文字が 1 つも無い件は未着手とみなし、検査から外す */
function isTranslated(pieces: Piece[]): boolean {
  return pieces.some((piece) => piece.kind === "char");
}

/**
 * 原文に現れる用語を長い順に取り、当たった範囲を潰す。
 * `Fire Eyes` が当たった箇所を `Eyes` が二重に拾うのを防ぐ。
 */
function termsIn(english: string, terms: Term[]): Term[] {
  let rest = english;
  return terms.flatMap((term) => {
    if (!matcher(term.source).test(rest)) return [];
    rest = rest.replace(matcher(term.source), " ");
    return [term];
  });
}

interface GlossaryReport {
  checked: number;
  /** 訳語が未定の用語 */
  undecided: string[];
  /** 話者を決めかねた印が残る件 */
  todo: number[];
  /** 訳語が使われていない箇所 */
  missing: string[];
}

export function checkGlossary(
  glossary: Term[],
  english: Map<number, Piece[]>,
  japanese: Map<number, Piece[]>,
): GlossaryReport {
  const byLength = glossary.slice().sort((a, b) => b.source.length - a.source.length);
  const undecided = glossary.filter((term) => term.target === "").map((term) => term.source);
  const missing: string[] = [];
  const todo: number[] = [];
  let checked = 0;

  for (const [index, translated] of japanese) {
    if (!isTranslated(translated)) continue;
    checked++;
    /** 1 行に入らない長い名前は行をまたぐため、改行を除いて探す */
    const joined = charsOf(translated);
    if (joined.includes(todoMarker)) todo.push(index);

    const source = english.get(index);
    if (source == null) throw new Error("原文に第 " + index + " 件がない");
    for (const term of termsIn(wordsOf(source), byLength)) {
      if (term.target === "" || joined.includes(term.target)) continue;
      missing.push("第 " + index + " 件: " + term.source + " → " + term.target);
    }
  }
  return { checked, undecided, todo, missing };
}

/** 原文の末尾と、訳文に期待する終止符。省略記号を `.` より先に見る */
const tails = [
  { source: "…", expected: "…" },
  { source: "...", expected: "…" },
  { source: ".", expected: "。" },
  { source: "!", expected: "！" },
  { source: "?", expected: "？" },
] as const;

const marks = "。！？…";

interface PunctuationReport {
  checked: number;
  /** 省略記号が食い違う件 */
  ellipsis: string[];
  /** そのほかの終止符が食い違う件 */
  others: string[];
}

export function checkPunctuation(
  english: Map<number, Piece[]>,
  japanese: Map<number, Piece[]>,
): PunctuationReport {
  const ellipsis: string[] = [];
  const others: string[] = [];
  let checked = 0;

  for (const [index, text] of japanese) {
    const translated = displayText(text);
    if (translated === "") continue;

    // 訳文が終止符で終わらない件は外す。件をまたぐ文の割り直しと、原文の略語がここに入る
    const actual = translated.slice(-1);
    if (!marks.includes(actual)) continue;

    const source = english.get(index);
    if (source == null) throw new Error("原文に第 " + index + " 件がない");
    const tail = tails.find((candidate) => displayText(source).endsWith(candidate.source));
    if (tail == null) continue;

    checked++;
    if (tail.expected === actual) continue;
    const report = "第 " + index + " 件: 原文の " + tail.source + " に対し訳文は " + actual;
    if (tail.expected === "…" || actual === "…") ellipsis.push(report);
    else others.push(report);
  }
  return { checked, ellipsis, others };
}
