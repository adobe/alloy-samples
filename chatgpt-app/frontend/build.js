import * as esbuild from "esbuild";
import fg from "fast-glob";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isWatch = process.argv.includes("--watch");

const files = fg.sync(`${__dirname}/src/views/**/*.jsx`, { dot: false });

/** @type {Record<string, string>} */
const entryPoints = Object.fromEntries(
  files.map((f) => [path.basename(path.dirname(f)), path.resolve(f)])
);

console.log("Building entry points:", Object.keys(entryPoints));

const buildOptions = {
  entryPoints,
  bundle: true,
  outdir: "dist/",
  splitting: false,
  format: "esm",
  loader: {
    ".css": "css",
  },
  entryNames: "[name]",
  assetNames: "[name]",
  chunkNames: "[name]",
  minify: !isWatch,
  sourcemap: false,
};

if (isWatch) {
  const ctx = await esbuild.context(buildOptions);
  await ctx.watch();
  console.log("Watching for changes...");
} else {
  await esbuild.build(buildOptions);
  console.log("Build complete!");
}
