import esbuild from "esbuild";

await esbuild.build({
	entryPoints: ["src/index.ts"],
	outfile: "dist/index.js",
	platform: "node",
	format: "esm",
	target: "node22",
	bundle: true,
	packages: "external",
	sourcemap: false,
	logLevel: "info",
});
