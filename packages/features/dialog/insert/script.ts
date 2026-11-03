/**
 * 日本語の台本を ROM へ書き込む形へ変換する。
 * 詰めた本文を読み直して台本と一致することも確かめる。
 * 1 行の幅はここでは調べず、`deno task check` で調べる。
 * 文ごとにどのウィンドウに出るかは、原版の ROM のスクリプトを読んで調べる。
 */

import type { TextCodec } from "@core";
import { readPlain } from "../extract/decompress.ts";
import { dialogCount } from "../layout.ts";
import { pack, type Packed } from "./pack.ts";

interface EncodedScript {
  /** 書き込んだ件の数 */
  count: number;
  packed: Packed;
  /** 収録外の文字 */
  missing: Set<string>;
  /** 読み直して照合した件の数 */
  checked: number;
  /** 読み直すと台本と一致しない件 */
  mismatched: number[];
}

/** `address` は本文を置く先頭の SNES アドレス。`japanese` は日本語版の符号 */
export function encodeScript(
  script: Map<number, string>,
  address: number,
  japanese: TextCodec,
): EncodedScript {
  const missing = new Set<string>();
  const clean: number[] = [];
  const entries: Uint8Array[] = [];

  for (let index = 0; index < dialogCount; index++) {
    const text = script.get(index);
    if (text == null) throw new Error("台本に第 " + index + " 件がない");

    const encoded = japanese.encode(text);
    for (const char of encoded.missing) missing.add(char);
    if (encoded.missing.length === 0) clean.push(index);
    entries.push(encoded.bytes);
  }

  const packed = pack(entries, address);
  /** 収録外の文字を落とした件は一致しなくて当然なので、照合から外す */
  const mismatched = clean.filter((index) => {
    const body = readPlain(packed.text, packed.heads[index]);
    return japanese.decode(body) !== script.get(index);
  });
  return { count: entries.length, packed, missing, checked: clean.length, mismatched };
}
