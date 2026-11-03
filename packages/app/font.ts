import { shiftJisTable } from "@features/encoding";
import { buildGameFont } from "@features/font";

/**
 * ゲームのフォント形式のグリフデータ `font.bin`、幅テーブル `width.bin`、
 * 第 1 バイトの先頭位置表 `lead-offset.bin` を書き出す。
 */
export async function buildFont(): Promise<void> {
  const bdfPath = "vendor/fusion-pixel-font/fusion-pixel-10px-proportional-ja.bdf";
  const outDir = "build";

  const font = buildGameFont(await Deno.readTextFile(bdfPath), shiftJisTable);
  await Deno.writeFile(outDir + "/font.bin", font.built.glyphs);
  await Deno.writeFile(outDir + "/width.bin", font.built.widths);
  await Deno.writeFile(outDir + "/lead-offset.bin", font.leadTable);

  const spare = font.layout.slotCount - font.placements.length;
  console.log(font.chars.length + " 文字、グリフ " + font.built.glyphs.length + " バイト");
  console.log("第 1 バイト " + font.layout.leadOffsets.size + " 個、空き " + spare + " 文字分");
  if (font.built.missing.length > 0) {
    console.log("グリフがない文字: " + font.built.missing.join(""));
  }
}
