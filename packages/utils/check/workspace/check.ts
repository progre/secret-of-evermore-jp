/** ワークスペースのパッケージ間の依存が、app → features → core の向きに従っているか調べる */

import { expandGlob, walk } from "@std/fs";
import { checkImports, checkRelative, specifiersIn } from "./deps.ts";

async function readJson(path: string): Promise<Record<string, unknown>> {
  return JSON.parse(await Deno.readTextFile(path));
}

/** `packages/features/*` のようなパターンを、ルートからの相対パスのフォルダーへ展開する */
async function expandMembers(patterns: string[]): Promise<string[]> {
  const root = Deno.cwd().replaceAll("\\", "/") + "/";
  const members = await Promise.all(patterns.map(async (pattern) => {
    const entries = await Array.fromAsync(expandGlob(pattern, { includeDirs: true }));
    return entries
      .filter((entry) => entry.isDirectory)
      .map((entry) => entry.path.replaceAll("\\", "/").replace(root, ""));
  }));
  return members.flat().sort();
}

export async function checkDeps(): Promise<void> {
  const rootPath = "deno.json";
  const members = await expandMembers((await readJson(rootPath)).workspace as string[]);

  const problems: string[] = [];
  for (const dir of members) {
    const config = await readJson(dir + "/deno.json");
    const imports = (config.imports ?? {}) as Record<string, string>;
    problems.push(...checkImports(dir, imports, members));
    for await (const entry of walk(dir, { exts: [".ts"], includeDirs: false })) {
      const file = entry.path.replaceAll("\\", "/");
      const specifiers = await specifiersIn(file, await Deno.readTextFile(file));
      problems.push(...checkRelative(dir, file, specifiers));
    }
  }

  console.log(members.length + " パッケージを調べた");
  if (problems.length > 0) {
    console.log(problems.length + " 件が依存の規則に反する");
    console.log(problems.join("\n"));
    Deno.exit(1);
  }
}
