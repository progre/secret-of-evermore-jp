import { shiftJisCodec } from "@features/encoding";
import { buildNameTables } from "@features/name-entry";

/** 名前入力で選べる文字の表 `name-table.bin` と、濁点の対応 `name-voice.bin` を書き出す */
export async function buildNameTable(): Promise<void> {
  const outPath = "build/name-table.bin";
  const voicePath = "build/name-voice.bin";

  const tables = buildNameTables(shiftJisCodec);

  await Deno.writeFile(voicePath, tables.voiceTable);
  await Deno.writeFile(outPath, tables.table);
  console.log(
    tables.charCount + " 文字と操作キー " + tables.keyCount + " 個、計 " +
      (tables.charCount + tables.keyCount) + " 升を " + outPath + " へ書き出した（" +
      tables.table.length + " バイト）",
  );
  console.log(
    "濁点の対応 " + tables.voicedRows + " 行を " + voicePath + " へ書き出した（" +
      tables.voiceTable.length + " バイト）",
  );
}
