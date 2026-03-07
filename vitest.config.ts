import { defineConfig } from "vitest/config";
import path from "path";
import react from "@vitejs/plugin-react";

export default defineConfig({
    plugins: [react()],
    test: {
        globals: true,
        watch: false,
        setupFiles: ['./src/components/__tests__/setup.ts'],
    },
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },
});