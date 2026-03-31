import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

// https://vite.dev/config/
export default defineConfig({
	build: {
		lib: {
			entry: path.resolve(__dirname, "src/index.ts"),
			fileName: (format) => {
				if (format === 'es') return 'index.js'
				return `index.${format}`
			},
			formats: ["es", "cjs"],
		},
		rollupOptions: {
			external: ["react", "react-dom"],
		},
		outDir: "dist",
		emptyOutDir: true,
	},
	plugins: [
		react(),
		dts({
			outputDir: "dist",
		}),
	],
});
