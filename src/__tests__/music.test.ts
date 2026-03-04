import { describe, it, expect } from "vitest";
import { normalizeTitle, similarity, levenshteinDistance, isValidISWC, isValidISRC } from "../lib/music";

describe("Music Logic Utils", () => {
    describe("normalizeTitle", () => {
        it("should lowercase titles", () => {
            expect(normalizeTitle("Humble")).toBe("humble");
        });

        it("should strip feat and remix tags", () => {
            expect(normalizeTitle("Humble (feat. Rihanna)")).toBe("humble");
            expect(normalizeTitle("Humble [remix]")).toBe("humble");
            expect(normalizeTitle("Humble (radio edit)")).toBe("humble");
        });

        it("should strip punctuation and collapse whitespace", () => {
            expect(normalizeTitle("Humble!!!  Now.")).toBe("humble now");
        });
    });

    describe("levenshteinDistance", () => {
        it("should calculate correct edit distance", () => {
            expect(levenshteinDistance("kitten", "sitting")).toBe(3);
            expect(levenshteinDistance("flaw", "lawn")).toBe(2);
            expect(levenshteinDistance("gumbo", "gambol")).toBe(2);
        });

        it("should return 0 for identical strings", () => {
            expect(levenshteinDistance("same", "same")).toBe(0);
        });

        it("should return length for empty comparison", () => {
            expect(levenshteinDistance("hello", "")).toBe(5);
        });
    });

    describe("similarity", () => {
        it("should return 100 for exact matches", () => {
            expect(similarity("Humble", "humble")).toBe(100);
        });

        it("should return 80 for substring containment", () => {
            expect(similarity("The Humble Track", "Humble")).toBe(80);
        });

        it("should return a fuzzy score for typos", () => {
            // "humble" vs "humbl" (distance 1, max len 6) -> (1 - 1/6) * 100 = 83.33 -> 83
            expect(similarity("humble", "humbl")).toBeGreaterThan(80);

            // "bohemian rhapsody" vs "bohemian rapsody"
            expect(similarity("bohemian rhapsody", "bohemian rapsody")).toBeGreaterThan(70);
        });
    });

    describe("Validators", () => {
        it("should validate ISWC format", () => {
            expect(isValidISWC("T-123456789-1")).toBe(true);
            expect(isValidISWC("1234567891")).toBe(false);
            expect(isValidISWC("T123456789")).toBe(false);
        });

        it("should validate ISRC format", () => {
            expect(isValidISRC("US-UMG-17-04770")).toBe(true);
            expect(isValidISRC("USUMG1704770")).toBe(true); // Should handle without hyphens too if regex allows
            expect(isValidISRC("ABC-123")).toBe(false);
        });
    });
});
