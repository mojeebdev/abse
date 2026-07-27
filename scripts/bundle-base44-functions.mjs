import { build } from "esbuild";
import { readdir, rm } from "node:fs/promises";
import { resolve } from "node:path";

const sourceRoot = resolve("base44/functions");
const outputRoot = resolve("base44/functions-deploy");
const functionNames = (await readdir(sourceRoot, { withFileTypes: true }))
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name);

await rm(outputRoot, { recursive: true, force: true });

for (const name of functionNames) {
  await build({
    entryPoints: [resolve(sourceRoot, name, "entry.ts")],
    outfile: resolve(outputRoot, name, "entry.ts"),
    bundle: true,
    format: "esm",
    platform: "neutral",
    target: "esnext",
    external: ["npm:@base44/sdk"],
    legalComments: "none",
  });
}

console.log(`Bundled ${functionNames.length} Base44 functions.`);
