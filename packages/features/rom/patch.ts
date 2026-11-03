/** xkas でパッチを当てる。xkas はチェックサムを更新しないため、書き込みは呼び出し側で行う */
export async function applyPatch(
  xkasPath: string,
  outPath: string,
  patchPath: string,
): Promise<void> {
  const xkas = new Deno.Command(xkasPath, {
    args: ["-o", outPath, patchPath],
    stdout: "piped",
    stderr: "piped",
  });
  const result = await xkas.output();
  const stdout = new TextDecoder().decode(result.stdout);
  const stderr = new TextDecoder().decode(result.stderr);
  if (stdout) console.log(stdout);
  if (stderr) console.error(stderr);
  if (!result.success) {
    throw new Error("xkas がエラー終了した: code " + result.code);
  }
}
