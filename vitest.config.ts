import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		include: ["src/**/__tests__/**"],
		exclude: [
			"node_modules",
			"dist",
			".pnpm-store",
		],
		coverage: {
			include: ["src/**"],
			exclude: [
				"node_modules",
				"dist",
				"src/**/__tests__",
			],
			reporter: ["text", "json", "html"],
		},
	},
});
