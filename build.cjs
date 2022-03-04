const esbuild = require("esbuild");

esbuild.buildSync({
  entryPoints: ["src/index.ts"],
  bundle: true,
  platform: "node",
  target: ["node16"],
  outfile: "build-dev/bundle.js",
  sourcemap: true,
});
