const esbuild = require("esbuild");

esbuild.buildSync({
  entryPoints: ["src/bin.ts"],
  bundle: true,
  platform: "node",
  target: ["node16"],
  outfile: "dist/bin.js",
  sourcemap: true,
});
