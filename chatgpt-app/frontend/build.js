import * as esbuild from "esbuild";
import fg from "fast-glob";
import path from "node:path";
import { fileURLToPath } from "node:url";
import process from "node:process";
import { configDotenv } from "dotenv";

configDotenv({ path: ["../.env", "./.env"], quiet: true });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isWatch = process.argv.includes("--watch");

const files = fg.sync(`${__dirname}/src/views/**/*.jsx`, { dot: false });

/** @type {Record<string, string>} */
const entryPoints = Object.fromEntries(
  files.map((f) => [path.basename(path.dirname(f)), path.resolve(f)]),
);

console.log("Building entry points:", Object.keys(entryPoints));

// Inject environment variables at build time (matching backend env var names)
const define = {
  "process.env.DATASTREAM_ID": JSON.stringify(process.env.DATASTREAM_ID || ""),
  "process.env.ORG_ID": JSON.stringify(process.env.ORG_ID || ""),
};

/** @type {esbuild.BuildOptions} */
const buildOptions = {
  entryPoints,
  bundle: true,
  outdir: "dist/",
  splitting: false,
  format: "esm",
  jsx: "automatic",
  loader: {
    ".css": "css",
  },
  entryNames: "[name]",
  assetNames: "[name]",
  chunkNames: "[name]",
  minify: true,
  sourcemap: "inline",
  define,
};

if (isWatch) {
  const ctx = await esbuild.context(buildOptions);
  await ctx.watch();
  console.log("Watching for changes...");
} else {
  await esbuild.build(buildOptions);
  console.log("Build complete!");
}
