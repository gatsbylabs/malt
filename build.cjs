const esbuild = require("esbuild");

esbuild.buildSync({
  entryPoints: ["src/index.ts"],
  bundle: true,
  platform: "node",
  target: ["node16"],
  outfile: "dist/bundle.js",
  sourcemap: true
});
