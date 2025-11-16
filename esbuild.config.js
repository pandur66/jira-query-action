const esbuild = require("esbuild")

esbuild
  .build({
    entryPoints: ["src/index.ts"],
    bundle: true,
    platform: "node",
    target: "node20",
    outfile: "dist/index.js",
    minify: false,
    sourcemap: false,
    external: [],
  })
  .catch(() => process.exit(1))
