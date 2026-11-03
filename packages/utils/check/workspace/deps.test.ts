import { assertEquals } from "@std/assert";
import { checkImports, checkRelative, layerOf, specifiersIn } from "./deps.ts";

const dirs = ["packages/app", "packages/features/b", "packages/features/c", "packages/core/d"];

Deno.test("layerOf は packages の直下の名前から層を取る", () => {
  assertEquals(layerOf("packages/app"), "app");
  assertEquals(layerOf("packages/utils/check"), "utils");
  assertEquals(layerOf("packages/features/b"), "features");
  assertEquals(layerOf("packages/other/b"), null);
});

Deno.test("checkImports は features 同士の依存を拒む", () => {
  assertEquals(checkImports("packages/features/b", { "@x": "../../core/d/mod.ts" }, dirs), []);
  assertEquals(checkImports("packages/features/b", { "@x": "../c/mod.ts" }, dirs).length, 1);
});

Deno.test("checkImports は core 同士の依存を拒む", () => {
  const withE = [...dirs, "packages/core/e"];
  assertEquals(checkImports("packages/core/d", { "@x": "../e/mod.ts" }, withE).length, 1);
});

Deno.test("checkImports は utils に features への依存を許し、app への依存を拒む", () => {
  const utils = "packages/utils/check";
  const withUtils = [...dirs, utils];
  assertEquals(checkImports(utils, { "@x": "../../features/b/mod.ts" }, withUtils), []);
  assertEquals(checkImports(utils, { "@x": "../../app/mod.ts" }, withUtils).length, 1);
});

Deno.test("checkImports は下の層から上の層への依存を拒む", () => {
  assertEquals(checkImports("packages/app", { "@x": "../features/b/mod.ts" }, dirs), []);
  assertEquals(checkImports("packages/core/d", { "@x": "../../app/mod.ts" }, dirs).length, 1);
});

Deno.test("checkImports は mod.ts 以外を指す宣言を拒む", () => {
  assertEquals(checkImports("packages/app", { "@x/": "../core/d/" }, dirs).length, 1);
  assertEquals(checkImports("packages/app", { "@x": "../core/d/y.ts" }, dirs).length, 1);
});

Deno.test("checkImports は外部の指定子を見ない", () => {
  assertEquals(checkImports("packages/core/d", { "@std/assert": "jsr:@std/assert@^1" }, dirs), []);
});

Deno.test("checkRelative はパッケージの外を指す相対 import を拒む", () => {
  const file = "packages/features/b/x.ts";
  assertEquals(checkRelative("packages/features/b", file, ["./y.ts", "@x"]), []);
  assertEquals(checkRelative("packages/features/b", file, ["../c/y.ts"]).length, 1);
});

Deno.test("specifiersIn は静的と動的の import を拾い、文字列の中は拾わない", async () => {
  const source = [
    'import { a } from "./a.ts";',
    'import type { B } from "@x/b.ts";',
    'await import("./c.ts");',
    "const text = 'from \"./d.ts\"';",
  ].join("\n");
  assertEquals(await specifiersIn("x.ts", source), ["./a.ts", "@x/b.ts", "./c.ts"]);
});
