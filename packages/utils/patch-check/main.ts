/**
 * 配布用の BPS に元の ROM のデータが入っていないことを確かめる。
 * rom-patcher がパッチに何を入れるかはソースを読んでいないので、パッチを作るたびに測る。
 */

import { reconstruct } from "./bps.ts";
import { findCopiedRuns } from "./copied.ts";

async function main(): Promise<void> {
  const [original, patch, target] = await Promise.all([
    Deno.readFile("Secret of Evermore (USA).sfc"),
    Deno.readFile("build/soe-ja.bps"),
    Deno.readFile("build/soe-ja.sfc"),
  ]);
  const reconstruction = reconstruct(patch);

  // 復元の処理に誤りがあると一致を見逃すので、先に出力と突き合わせる
  const { bytes, known } = reconstruction;
  const mismatch = bytes.findIndex((byte, i) => known[i] === 1 && byte !== target[i]);
  if (bytes.length !== target.length || mismatch !== -1) {
    console.error("Reconstruction does not match build/soe-ja.sfc");
    Deno.exit(1);
  }

  const runs = findCopiedRuns(reconstruction, original);
  const knownCount = known.reduce((sum, flag) => sum + flag, 0);
  console.log("Reconstructable without the original ROM: " + knownCount + " bytes");
  console.log("Runs matching the original ROM (8 bytes or more): " + runs.length);
  if (runs.length > 0) {
    runs.slice(0, 20).forEach(({ offset, length }) => {
      console.error("offset 0x" + offset.toString(16) + ", " + length + " bytes");
    });
    Deno.exit(1);
  }
}

if (import.meta.main) {
  await main();
}
