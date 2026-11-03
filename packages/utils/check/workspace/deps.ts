/**
 * パッケージ間の依存の向きを調べる。
 * 依存は各パッケージの `deno.json` の `imports` で宣言し、宣言外の名前は `deno check` が落とす。
 * ただし相対パスの import は宣言なしで境界を越えられるため、ここで拾う。
 */

import { parseModule } from "@deno/graph";
import { join } from "@std/path/posix";

/** utils には検査など、組み立て以外のエントリーポイントを置く。依存してよい層は app と同じ */
type Layer = "app" | "utils" | "features" | "core";

/** 層ごとに、`imports` で指してよい層 */
const allowed: Record<Layer, Layer[]> = {
  app: ["features", "core"],
  utils: ["features", "core"],
  features: ["core"],
  core: [],
};

/** `packages/<層>` の直下にあるパッケージの層 */
export function layerOf(packageDir: string): Layer | null {
  const layer = packageDir.split("/").at(1);
  return Object.hasOwn(allowed, layer ?? "") ? layer as Layer : null;
}

/** パッケージの中のパスから、それを含むパッケージを引く */
function packageOf(path: string, packageDirs: string[]): string | null {
  return packageDirs.find((dir) => path === dir || path.startsWith(dir + "/")) ?? null;
}

/**
 * `imports` のうち、ワークスペース内を指す宣言が規則に反していないか。
 * 指す先はパッケージの公開口 `mod.ts` に限り、層は `allowed` に従う。
 */
export function checkImports(
  packageDir: string,
  imports: Record<string, string>,
  packageDirs: string[],
): string[] {
  const layer = layerOf(packageDir);
  if (layer == null) return [packageDir + " は packages/<層> の下にない"];
  return Object.entries(imports).flatMap(([name, target]) => {
    if (!target.startsWith(".")) return [];
    const targetPath = join(packageDir, target);
    const targetDir = packageOf(targetPath, packageDirs);
    if (targetDir == null) return [packageDir + " の " + name + " がパッケージの外を指す"];
    if (targetPath !== targetDir + "/mod.ts") {
      return [packageDir + " の " + name + " が " + targetDir + " の mod.ts 以外を指す"];
    }
    const targetLayer = layerOf(targetDir);
    if (targetLayer != null && allowed[layer].includes(targetLayer)) return [];
    return [
      packageDir + " の " + name + " が " + targetDir + " を指す（" + layer + " → " +
      targetLayer + " は禁止）",
    ];
  });
}

/** ファイルの相対 import が、自分のパッケージの外を指していないか */
export function checkRelative(packageDir: string, file: string, specifiers: string[]): string[] {
  const fileDir = file.split("/").slice(0, -1).join("/");
  return specifiers.flatMap((specifier) => {
    if (!specifier.startsWith(".")) return [];
    const target = join(fileDir, specifier);
    if (target.startsWith(packageDir + "/")) return [];
    return [file + " の " + specifier + " がパッケージの外を指す"];
  });
}

/** import 文と動的 import の指定子を拾う。`path` は解析の際にモジュールを識別する名前 */
export async function specifiersIn(path: string, source: string): Promise<string[]> {
  const parsed = await parseModule("file:///" + path, new TextEncoder().encode(source));
  return (parsed.dependencies ?? []).flatMap((dependency) =>
    dependency.specifier == null ? [] : [dependency.specifier]
  );
}
