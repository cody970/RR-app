import { defineConfig } from "vitest/config";
import path from "path";
import react from "@vitejs/plugin-react";

export default defineConfig({
    plugins: [react()],
    test: {
        globals: true,
        watch: false,
        setupFiles: ['./src/components/__tests__/setup.ts'],
        exclude: [
            '**/node_modules/**',
            '**/dist/**',
            '**/e2e/**',  // Exclude Playwright e2e tests from Vitest
        ],
    },
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },
});