/** 固定テキスト（メニュー・品名など）の取り出し・検査と、ROM への組み込み */

export { readStrings } from "./fixed.ts";
export { fixedRedirectRegion, fixedTextRegion, installFixedText } from "./install.ts";
export { readInlineStrings } from "./references/mod.ts";
export { measureGroups } from "./width.ts";
