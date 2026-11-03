/** ダイアログの配置。番地はファイルオフセットで表す */

/** ポインタテーブル。日本語版も同じ場所へ書き戻し、圧縮テーブル群は使わなくなるため上書きする */
export const dialogPointers = 0x11d000;
export const dialogCount = 3002;

/**
 * ダイアログの圧縮に使う表。
 * DTE から 16bit 辞書の文字列まで、隙間なく続けて置かれている。
 */
export const tables = {
  /** 64 組の 2 文字 */
  dte: 0x11f32e,
  /** 64 バイトの 1 文字。頻度順に並ぶ */
  scatter: 0x11f3ae,
  /** 63 個の 16bit 値。`dict8Strings` からの相対位置を指す */
  dict8Pointers: 0x11f3ee,
  /** 256 個の 16bit 値。`dict16Strings` からの相対位置を指す */
  dict16Pointers: 0x11f46c,
  dict8Strings: 0x11f66c,
  dict16Strings: 0x11f7d5,
} as const;

/** 拡張領域に置く非圧縮の日本語ダイアログ本体。可変長で、直前の領域に続けて置く */
export function dialogRegion(size: number): { name: string; size: number } {
  return { name: "dialog_text", size };
}
