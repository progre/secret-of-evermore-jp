/** 固定テキストの文字列を置き場所へ詰めて置く */

/** 訳さずに残す文字列を、置く前に書き直す処理 */
export type Untranslated = (bytes: Uint8Array) => Uint8Array;

/** 置き場所。`base` は 16bit オフセットの起点で、バンクの先頭にあたる */
export type Destination = { start: number; end: number; base: number };

/**
 * `originals` の順に文字列を置く。訳文のある文字列は、訳文を置く。
 * 訳文のない文字列は、原文を `untranslated` で書き直して置く。
 * どちらも終端 `0x00` を付けて詰める。
 * 各文字列を置いた `base` からのオフセットと、詰め終わりの位置を返す。
 * 入りきらない場合は例外を投げる。
 */
export function placeStrings(
  rom: Uint8Array,
  originals: Uint8Array[],
  translated: Map<number, Uint8Array>,
  untranslated: Untranslated,
  dest: Destination,
): { offsets: number[]; next: number } {
  let at = dest.start;
  const offsets = originals.map((bytes, index) => {
    const body = translated.get(index) ?? untranslated(bytes);
    if (at + body.length + 1 > dest.end) {
      throw new Error(
        "固定テキストが置き場所に入らない: " + (at + body.length + 1 - dest.start) +
          " バイトあり、収まるのは " + (dest.end - dest.start) + " バイト",
      );
    }
    rom.set(body, at);
    rom[at + body.length] = 0;
    const offset = at - dest.base;
    at += body.length + 1;
    return offset;
  });
  return { offsets, next: at };
}
