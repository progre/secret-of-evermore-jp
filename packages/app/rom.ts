import { parseScript } from "@features/dialog";
import { originalCodec, relocatedOriginalCodec, shiftJisCodec } from "@features/encoding";
import { installFixedText } from "@features/fixed";
import { copyOriginalFont } from "@features/font";
import { applyPatch, writeChecksum } from "@features/rom";
import { layOut, regionOf, writeDefines } from "./layout.ts";

/**
 * 日本語データを適用した ROM を作る。
 * 拡張領域の番地を決めてパッチの定義 `layout.s` を書き、`packages/app/patch/main.s` を xkas で適用する。
 * その後、固定テキストを組み込み、チェックサムを書き込む。
 * 訳文がウィンドウに収まるかは `deno task check` で調べる。
 */
export async function buildRom(basePath: string): Promise<void> {
  const outPath = "build/soe-ja.sfc";
  const patchPath = "packages/app/patch/main.s";
  const xkasPath = await defaultXkas();
  const scriptPath = "data/fixed-ja.toml";
  const buildDir = "build";

  const layout = await layOut(buildDir, (await Deno.stat(buildDir + "/text.bin")).size);
  await writeDefines(layout, buildDir + "/layout.s");

  await Deno.copyFile(basePath, outPath);
  await applyPatch(xkasPath, outPath, patchPath);

  const rom = await Deno.readFile(outPath);
  copyOriginalFont(rom, regionOf(layout, "original_font").start);

  const installed = installFixedText(
    rom,
    parseScript(await Deno.readTextFile(scriptPath)),
    { original: originalCodec, relocated: relocatedOriginalCodec, japanese: shiftJisCodec },
    regionOf(layout, "fixed_text"),
    regionOf(layout, "fixed_redirect"),
  );
  console.log(
    "固定テキスト " + installed.count + " 本、" + installed.used + " / " + installed.capacity +
      " バイトをバンク " + installed.bank.toString(16) + " へ移した" +
      "（バンクを積む直値 " + installed.retargeted + " 箇所を向け直した）",
  );
  for (const [index, chars] of installed.missing) {
    console.log("第 " + index + " 件に収録外の文字: " + chars.join(""));
  }

  writeChecksum(rom);
  await Deno.writeFile(outPath, rom);

  console.log("ROM を書き出した: " + outPath + "（" + rom.length + " バイト）");
}

/** Linux 向けにビルドした xkas があれば使い、無ければ Windows 版の exe を使う */
async function defaultXkas(): Promise<string> {
  const native = "vendor/xkas-plus/xkas";
  try {
    await Deno.stat(native);
    return native;
  } catch (error) {
    if (!(error instanceof Deno.errors.NotFound)) {
      throw error;
    }
    return native + ".exe";
  }
}
