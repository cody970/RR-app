import { describe, it, expect, vi } from "vitest";
import { calculateSplits, validateSplitOwnership } from "../lib/music/split-engine";

// Mock Prisma to avoid initialization errors
vi.mock("../lib/infra/db", () => ({
    db: {
        // Mock any database operations if needed
    },
}));

describe("Split Engine", () => {
    describe("calculateSplits", () => {
        it("should calculate correct amounts from shares", () => {
            const writers = [
                { writerId: "w1", splitPercent: 50 },
                { writerId: "w2", splitPercent: 50 },
            ];
            const result = calculateSplits(1000, writers);

            expect(result.find(s => s.writerId === "w1")?.amount).toBe(500);
            expect(result.find(s => s.writerId === "w2")?.amount).toBe(500);
        });
    });

    describe("validateSplitOwnership", () => {
        it("should return true for total share of 100", () => {
            const writers = [
                { splitPercent: 33.33 },
                { splitPercent: 33.33 },
                { splitPercent: 33.34 },
            ];
            expect(validateSplitOwnership(writers)).toBe(true);
        });

        it("should return false if total shares exceed 100", () => {
            const writers = [
                { splitPercent: 60 },
                { splitPercent: 50 },
            ];
            expect(validateSplitOwnership(writers)).toBe(false);
        });
    });
});
