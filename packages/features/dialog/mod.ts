/**
 * ダイアログを扱う。
 * 原版から取り出す処理、台本ファイルを読む処理、日本語を ROM の形にする処理、訳文を機械で検査する処理がある
 */

export { continuedInto } from "./extract/original.ts";
export { readAll } from "./extract/pointer.ts";
export { encodeScript } from "./insert/script.ts";
export { dialogPointers, dialogRegion } from "./layout.ts";
export {
  checkGlossary,
  checkPunctuation,
  parseGlossary,
  todoMarker,
} from "./review/translation.ts";
export { unmarkedSpeakers } from "./review/speaker.ts";
export { parseScript } from "./script.ts";
