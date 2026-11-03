/**
 * ダイアログ本体の ROM 配置。
 * `LDA [ptr],Y` がバンクをまたげないため、1 件がバンク境界を越えないように詰める。
 */

const bankSize = 0x10000;
const padding = 0xff;

/**
 * 書き戻し用のポインタ。24bit のリトルエンディアンをそのまま置く。
 * パッチは `Get_mes0` と `Get_mes1` を、3 バイトをロングアドレスとして読む処理に差し替える。
 * このため、原版のポインタにあった 15bit の制約はなく、バンク内のどの位置も指せる。
 */
export function writePointer(address: number): Uint8Array {
  return Uint8Array.of(address & 0xff, (address >> 8) & 0xff, (address >> 16) & 0xff);
}

export type Packed = {
  text: Uint8Array;
  pointers: Uint8Array;
  /** 各件の本文先頭。`text` の先頭からの位置で、書き戻しての照合に使う */
  heads: number[];
  /** 詰め終わりの SNES アドレス */
  end: number;
};

/** SNES アドレス `address` から、各件の後ろに終端の `0x00` を足して詰める */
export function pack(entries: Uint8Array[], address: number): Packed {
  const text: number[] = [];
  const pointers: number[] = [];
  const heads: number[] = [];
  let at = address;

  for (const entry of entries) {
    const terminated = [...entry, 0];
    if ((at & 0xffff) + terminated.length > bankSize) {
      const next = (at & 0xff0000) + bankSize;
      while (at < next) {
        text.push(padding);
        at++;
      }
    }
    pointers.push(...writePointer(at));
    heads.push(at - address);
    text.push(...terminated);
    at += terminated.length;
  }

  return { text: Uint8Array.from(text), pointers: Uint8Array.from(pointers), heads, end: at };
}
