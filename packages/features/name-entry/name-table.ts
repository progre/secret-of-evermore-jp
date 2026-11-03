/**
 * 名前入力で選べる文字の表を作る。
 * 原版は 1 バイトの ASCII を並べていたが、かなは Shift-JIS の 2 バイトなので置き換える。
 * 升目は固定ピッチで折り返す作りのため、並べた順がそのまま画面の並びになる。
 */

import type { TextCodec } from "@core";

/**
 * 並べる文字。濁点と半濁点は 1 つの升に置き、付いた字は並べない。
 * 付いた字を並べると 26 升増えて、升の数の上限を超えるためである。
 */
const rows = [
  "アイウエオカキクケコ",
  "サシスセソタチツテト",
  "ナニヌネノハヒフヘホ",
  "マミムメモヤユヨラリ",
  "ルレロワヲンァィゥェ",
  "ォッャュョー゛゜",
];

/**
 * 原版から引き継ぐ操作キー。
 * `0x7F` と `0x7E` は表示文字ではなく、選ぶと専用の処理へ分岐する（`cc:b93c`）。
 * 2 バイトの表でも値を小さいまま残せば、既存の比較がそのまま効く。
 */
const actionKeys = [0x7f, 0x7e];

/**
 * 濁点と半濁点で置き換わる字。左から基本・濁音・半濁音の順に並べる。
 * 半濁音が無い行は空白で埋め、表では `0x0000` になる。
 * Shift-JIS では濁音が基本字の隣とは限らないため、算術ではなく表で引く。
 */
const voiced = [
  "カガ ",
  "キギ ",
  "クグ ",
  "ケゲ ",
  "コゴ ",
  "サザ ",
  "シジ ",
  "スズ ",
  "セゼ ",
  "ソゾ ",
  "タダ ",
  "チヂ ",
  "ツヅ ",
  "テデ ",
  "トド ",
  "ハバパ",
  "ヒビピ",
  "フブプ",
  "ヘベペ",
  "ホボポ",
  "ウヴ ",
];

/**
 * 画面の升の並び。`packages/app/patch/options/name-entry/grid.s` の列数（`cd:81b3`）と行数、
 * および初期カーソル（`cd:82cb`）と揃える。
 * 升が余ると、末尾を指す初期カーソルが決定のキーからずれる。
 */
const columns = 15;
const rowCount = 4;

/**
 * 原版の升の数。
 * 折り返しは「現在位置 + 文字幅の半分」が枠幅を超えたら改行する作りで、
 * かなは英字の倍の幅があるため 1 行に入る数が減る。
 * そこへ升も増やすと行が枠の外へ伸びる。
 */
const cellLimit = 72;

/**
 * 拡張領域での置き場所。フックの手前の空きに置く。
 * `packages/app/patch/options/name-entry/grid.s` と `packages/app/patch/options/name-entry/input.s` は、どちらの表も番地に添字を足して引く。
 */
export function nameTableRegions(
  tableSize: number,
  voiceSize: number,
): { name: string; size: number; at: number }[] {
  return [
    { name: "name_table", size: tableSize, at: 0x3fe000 },
    { name: "name_voice", size: voiceSize, at: 0x3fe100 },
  ];
}

interface NameTables {
  /** 升に並ぶ文字。終端は `0x0000`。升目を描くループはここで止まる */
  table: Uint8Array;
  /** 濁点の対応。終端は `0x0000`。基本・濁音・半濁音の 3 つ組が並ぶ */
  voiceTable: Uint8Array;
  charCount: number;
  keyCount: number;
  voicedRows: number;
}

/** `japanese` は日本語版の符号 */
export function buildNameTables(japanese: TextCodec): NameTables {
  const chars = Array.from(rows.join(""));
  const encoded = japanese.encode(chars.join(""));
  if (encoded.missing.length > 0) {
    throw new Error("文字集合に無い字がある: " + encoded.missing.join(""));
  }
  if (encoded.bytes.length !== chars.length * 2) {
    throw new Error("2 バイトで表せない字が混ざっている");
  }
  if (columns * rowCount > cellLimit) {
    throw new Error(
      "枠が " + columns * rowCount + " 升あり、上限の " + cellLimit + " を超える",
    );
  }
  if (chars.length + actionKeys.length !== columns * rowCount) {
    throw new Error(
      "升が " + (chars.length + actionKeys.length) + " 個で、" + columns + " × " + rowCount +
        " と合わない。packages/app/patch/options/name-entry/grid.s も直すこと",
    );
  }

  const table = new Uint8Array((chars.length + actionKeys.length + 1) * 2);
  table.set(encoded.bytes, 0);
  actionKeys.forEach((key, index) => {
    table[(chars.length + index) * 2] = key;
  });

  /** 1 文字を 2 バイトの符号にする。空白は「その欄は無い」を表す `0x0000` にする */
  function codeOf(char: string): number {
    if (char === " ") return 0;
    const one = japanese.encode(char);
    if (one.missing.length > 0 || one.bytes.length !== 2) {
      throw new Error("2 バイトで表せない字がある: " + char);
    }
    return one.bytes[0] + one.bytes[1] * 256;
  }

  const voiceTable = new Uint8Array((voiced.length * 3 + 1) * 2);
  voiced.forEach((row, index) => {
    if (Array.from(row).length !== 3) throw new Error("濁点の行は 3 文字にする: " + row);
    Array.from(row).forEach((char, column) => {
      const code = codeOf(char);
      voiceTable[(index * 3 + column) * 2] = code & 0xff;
      voiceTable[(index * 3 + column) * 2 + 1] = code >> 8;
    });
  });

  return {
    table,
    voiceTable,
    charCount: chars.length,
    keyCount: actionKeys.length,
    voicedRows: voiced.length,
  };
}
