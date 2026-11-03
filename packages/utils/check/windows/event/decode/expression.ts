/**
 * スクリプトの式。1 バイトの要素を並べ、最上位ビットの立った要素で終わる。
 * 要素によっては後ろに 1 か 2 バイトの値を持つ。
 */

/** 下位 7 ビットが値を表す要素の上位 3 ビット（0x30 は正、0x40 は負、0x60 は 0x10 以上） */
const valueGroups = [0x30, 0x40, 0x60];
/** 主人公・犬など、エンティティを表す要素 */
const entities = [0x2d, 0x2e, 0x50, 0x51, 0x52, 0x53];
const withByte = [0x01, 0x02, 0x0f, 0x10, 0x11, 0x12, 0x13];
const withWord = [0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b, 0x0c, 0x0d, 0x0e];
/** 演算・乱数・選択肢の結果など、値を持たない要素 */
const bare = [
  0x00,
  ...Array.from({ length: 0x2c - 0x14 + 1 }, (_, i) => 0x14 + i).filter((c) => c !== 0x19),
  ...Array.from({ length: 0x5c - 0x54 + 1 }, (_, i) => 0x54 + i),
];

function operandLength(element: number): number | null {
  const code = element & 0x7f;
  if (valueGroups.includes(code & 0x70) || entities.includes(code) || bare.includes(code)) {
    return 0;
  }
  if (withByte.includes(code)) {
    return 1;
  }
  if (withWord.includes(code)) {
    return 2;
  }
  return null;
}

/** 式を読み終えた位置。知らない要素に当たったら null */
export function expressionEnd(read8: (at: number) => number, start: number): number | null {
  let at = start;
  for (let count = 0; count < 64; count++) {
    const element = read8(at);
    const length = operandLength(element);
    if (length == null) {
      return null;
    }
    at += 1 + length;
    if (element & 0x80) {
      return at;
    }
  }
  return null;
}
