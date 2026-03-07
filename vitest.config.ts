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
            '**/e2e/**',
            '**/.{idea,git,cache,output,temp}/**',
            '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*'
        ],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            include: ['src/lib/**/*.ts'],
            exclude: [
                'src/lib/**/*.test.ts',
                'src/lib/**/*.spec.ts',
                'src/**/__tests__/**',
                'node_modules/**',
            ],
        },
    },
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },
});