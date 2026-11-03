import { encodeScript, parseScript } from "@features/dialog";
import { shiftJisCodec, stripSpeakers } from "@features/encoding";
import { checkFits, dialogAddress } from "./layout.ts";

/**
 * 日本語の台本を ROM へ書き込む形へ変換し、本文 `text.bin` とポインタ `ptr.bin` を書き出す。
 * 話者の印は書き込まない。書き出した後に読み直し、印を除いた台本と一致することを確かめる。
 */
export async function insertDialog(): Promise<void> {
  const scriptPath = "data/dialog-ja.toml";
  const outDir = "build";

  const marked = parseScript(await Deno.readTextFile(scriptPath));
  const script = new Map(Array.from(marked, ([index, text]) => [index, stripSpeakers(text)]));
  const address = await dialogAddress(outDir);
  const result = encodeScript(script, address, shiftJisCodec);
  await checkFits(outDir, result.packed.text.length);

  await Deno.writeFile(outDir + "/text.bin", result.packed.text);
  await Deno.writeFile(outDir + "/ptr.bin", result.packed.pointers);

  console.log(
    result.count + " 件、本文 " + result.packed.text.length + " バイト、末尾 " +
      result.packed.end.toString(16),
  );
  console.log(
    result.checked + " 件を読み直し、" + (result.checked - result.mismatched.length) +
      " 件が往復した",
  );
  if (result.missing.size > 0) {
    console.log("収録外の文字: " + Array.from(result.missing).join(""));
  }
  if (result.mismatched.length > 0) {
    console.log("往復しない件: " + result.mismatched.slice(0, 10).join(", "));
  }
}
