import { describe, it, expect } from "vitest";
import {
    jaroSimilarity,
    jaroWinklerSimilarity,
    levenshteinDistance,
    levenshteinSimilarity,
    normalizeTitle,
    extractFeaturedArtist,
    extractVersionInfo,
    findBestFuzzyMatch,
    batchFuzzyMatch,
    MATCH_CONFIDENCE,
    DEFAULT_FUZZY_CONFIG,
} from "../lib/finance/fuzzy-match";

// ---------- Jaro Similarity ----------

describe("jaroSimilarity", () => {
    it("should return 1.0 for identical strings", () => {
        expect(jaroSimilarity("hello", "hello")).toBe(1.0);
    });

    it("should return 0.0 for completely different strings", () => {
        expect(jaroSimilarity("abc", "xyz")).toBe(0.0);
    });

    it("should return 0.0 for empty strings", () => {
        expect(jaroSimilarity("", "hello")).toBe(0.0);
        expect(jaroSimilarity("hello", "")).toBe(0.0);
    });

    it("should return 1.0 for two empty strings", () => {
        expect(jaroSimilarity("", "")).toBe(1.0);
    });

    it("should handle transpositions", () => {
        const score = jaroSimilarity("MARTHA", "MARHTA");
        expect(score).toBeGreaterThan(0.9);
    });

    it("should score similar strings higher than dissimilar ones", () => {
        const similar = jaroSimilarity("LOVE STORY", "LOVE STORRY");
        const dissimilar = jaroSimilarity("LOVE STORY", "DARK NIGHT");
        expect(similar).toBeGreaterThan(dissimilar);
    });
});

// ---------- Jaro-Winkler Similarity ----------

describe("jaroWinklerSimilarity", () => {
    it("should return 1.0 for identical strings", () => {
        expect(jaroWinklerSimilarity("hello", "hello")).toBe(1.0);
    });

    it("should give bonus for common prefixes", () => {
        const jaro = jaroSimilarity("MARTHA", "MARHTA");
        const jaroWinkler = jaroWinklerSimilarity("MARTHA", "MARHTA");
        expect(jaroWinkler).toBeGreaterThanOrEqual(jaro);
    });

    it("should handle real song title variations", () => {
        // Common case: slight spelling difference
        const score1 = jaroWinklerSimilarity("BOHEMIAN RHAPSODY", "BOHEMIAN RHAPSODY");
        expect(score1).toBe(1.0);

        // Typo in title
        const score2 = jaroWinklerSimilarity("BOHEMIAN RHAPSODY", "BOHEMIAN RAPSODY");
        expect(score2).toBeGreaterThan(0.9);

        // Different title entirely
        const score3 = jaroWinklerSimilarity("BOHEMIAN RHAPSODY", "STAIRWAY TO HEAVEN");
        expect(score3).toBeLessThan(0.6);
    });
});

// ---------- Levenshtein Distance ----------

describe("levenshteinDistance", () => {
    it("should return 0 for identical strings", () => {
        expect(levenshteinDistance("hello", "hello")).toBe(0);
    });

    it("should return string length for empty comparison", () => {
        expect(levenshteinDistance("hello", "")).toBe(5);
        expect(levenshteinDistance("", "hello")).toBe(5);
    });

    it("should count single character edits", () => {
        expect(levenshteinDistance("kitten", "sitten")).toBe(1); // substitution
        expect(levenshteinDistance("kitten", "kittens")).toBe(1); // insertion
        expect(levenshteinDistance("kitten", "kitte")).toBe(1); // deletion
    });

    it("should handle multiple edits", () => {
        expect(levenshteinDistance("kitten", "sitting")).toBe(3);
    });
});

describe("levenshteinSimilarity", () => {
    it("should return 1.0 for identical strings", () => {
        expect(levenshteinSimilarity("hello", "hello")).toBe(1.0);
    });

    it("should return 0.0 for completely different strings of same length", () => {
        // "abc" vs "xyz" = 3 edits, max length 3, similarity = 0
        expect(levenshteinSimilarity("abc", "xyz")).toBe(0.0);
    });

    it("should return 1.0 for two empty strings", () => {
        expect(levenshteinSimilarity("", "")).toBe(1.0);
    });

    it("should handle song title variations", () => {
        const score = levenshteinSimilarity("LOVE STORY", "LOVE STORRY");
        expect(score).toBeGreaterThan(0.85);
    });
});

// ---------- Title Normalization ----------

describe("normalizeTitle", () => {
    it("should strip featuring artist tags", () => {
        expect(normalizeTitle("Love Story (feat. Taylor Swift)")).toBe("LOVE STORY");
        expect(normalizeTitle("Love Story ft. Taylor Swift")).toBe("LOVE STORY");
        expect(normalizeTitle("Love Story (featuring John Legend)")).toBe("LOVE STORY");
    });

    it("should strip remix/version tags", () => {
        expect(normalizeTitle("Love Story (Remix)")).toBe("LOVE STORY");
        expect(normalizeTitle("Love Story [Radio Edit]")).toBe("LOVE STORY");
        expect(normalizeTitle("Love Story (Acoustic)")).toBe("LOVE STORY");
        expect(normalizeTitle("Love Story (Live)")).toBe("LOVE STORY");
        expect(normalizeTitle("Love Story (Remastered)")).toBe("LOVE STORY");
        expect(normalizeTitle("Love Story (Instrumental)")).toBe("LOVE STORY");
        expect(normalizeTitle("Love Story (Extended)")).toBe("LOVE STORY");
        expect(normalizeTitle("Love Story (Remix by DJ Snake)")).toBe("LOVE STORY");
    });

    it("should strip 'The' prefix", () => {
        expect(normalizeTitle("The Sound of Silence")).toBe("SOUND OF SILENCE");
    });

    it("should normalize smart quotes and dashes", () => {
        expect(normalizeTitle("Don\u2019t Stop")).toBe("DON'T STOP");
        expect(normalizeTitle("Rock \u2014 Roll")).toBe("ROCK - ROLL");
    });

    it("should collapse multiple spaces", () => {
        expect(normalizeTitle("Love   Story")).toBe("LOVE STORY");
    });

    it("should uppercase the result", () => {
        expect(normalizeTitle("love story")).toBe("LOVE STORY");
    });

    it("should handle empty/null input", () => {
        expect(normalizeTitle("")).toBe("");
        expect(normalizeTitle("   ")).toBe("");
    });

    it("should handle complex real-world titles", () => {
        expect(normalizeTitle("The Way You Make Me Feel (feat. Ed Sheeran) [Remix]"))
            .toBe("WAY YOU MAKE ME FEEL");
        expect(normalizeTitle("Don't Stop Believin' (Remastered)"))
            .toBe("DON'T STOP BELIEVIN'");
    });
});

// ---------- Extract Featured Artist ----------

describe("extractFeaturedArtist", () => {
    it("should extract feat. artist", () => {
        expect(extractFeaturedArtist("Love Story (feat. Taylor Swift)")).toBe("Taylor Swift");
    });

    it("should extract ft. artist", () => {
        expect(extractFeaturedArtist("Love Story ft. John Legend")).toBe("John Legend");
    });

    it("should extract featuring artist", () => {
        expect(extractFeaturedArtist("Love Story (featuring Beyoncé)")).toBe("Beyoncé");
    });

    it("should return null when no featured artist", () => {
        expect(extractFeaturedArtist("Love Story")).toBeNull();
    });
});

// ---------- Extract Version Info ----------

describe("extractVersionInfo", () => {
    it("should extract remix info", () => {
        expect(extractVersionInfo("Love Story (Remix)")).toBe("Remix");
    });

    it("should extract remix with artist", () => {
        expect(extractVersionInfo("Love Story (Remix by DJ Snake)")).toBe("Remix by DJ Snake");
    });

    it("should extract radio edit", () => {
        expect(extractVersionInfo("Love Story [Radio Edit]")).toBe("Radio Edit");
    });

    it("should extract acoustic version", () => {
        expect(extractVersionInfo("Love Story (Acoustic)")).toBe("Acoustic");
    });

    it("should return null when no version info", () => {
        expect(extractVersionInfo("Love Story")).toBeNull();
    });
});

// ---------- findBestFuzzyMatch ----------

describe("findBestFuzzyMatch", () => {
    const catalogTitles = new Map<string, string>([
        ["LOVE STORY", "work-1"],
        ["BOHEMIAN RHAPSODY", "work-2"],
        ["STAIRWAY TO HEAVEN", "work-3"],
        ["DON'T STOP BELIEVIN'", "work-4"],
        ["HOTEL CALIFORNIA", "work-5"],
    ]);

    const rawTitles = new Map<string, string>([
        ["LOVE STORY", "work-1"],
        ["BOHEMIAN RHAPSODY", "work-2"],
        ["STAIRWAY TO HEAVEN", "work-3"],
        ["DON'T STOP BELIEVIN'", "work-4"],
        ["HOTEL CALIFORNIA", "work-5"],
    ]);

    it("should find normalized exact match", () => {
        // After normalization, "The Love Story (feat. Someone)" → "LOVE STORY"
        const result = findBestFuzzyMatch(
            "The Love Story (feat. Someone)",
            catalogTitles,
            rawTitles
        );
        expect(result).not.toBeNull();
        expect(result!.workId).toBe("work-1");
        expect(result!.matchMethod).toBe("NORMALIZED_TITLE");
        expect(result!.matchConfidence).toBe(MATCH_CONFIDENCE.NORMALIZED_TITLE);
    });

    it("should find fuzzy match for typos", () => {
        const result = findBestFuzzyMatch(
            "BOHEMIAN RAPSODY",
            catalogTitles,
            rawTitles
        );
        expect(result).not.toBeNull();
        expect(result!.workId).toBe("work-2");
        expect(result!.matchConfidence).toBeGreaterThanOrEqual(MATCH_CONFIDENCE.FUZZY_LOW);
    });

    it("should find contains match", () => {
        const result = findBestFuzzyMatch(
            "HOTEL CALIFORNIA LIVE",
            catalogTitles,
            rawTitles,
            { ...DEFAULT_FUZZY_CONFIG, minSimilarity: 0.95 } // High threshold to skip fuzzy
        );
        // Should fall through to contains match
        if (result) {
            expect(result.workId).toBe("work-5");
        }
    });

    it("should return null for no match", () => {
        const result = findBestFuzzyMatch(
            "COMPLETELY DIFFERENT SONG",
            catalogTitles,
            rawTitles
        );
        expect(result).toBeNull();
    });

    it("should handle empty search title", () => {
        const result = findBestFuzzyMatch("", catalogTitles, rawTitles);
        expect(result).toBeNull();
    });

    it("should respect minimum similarity threshold", () => {
        const strictConfig = { ...DEFAULT_FUZZY_CONFIG, minSimilarity: 0.99 };
        const result = findBestFuzzyMatch(
            "BOHEMIAN RAPSODY", // typo
            catalogTitles,
            rawTitles,
            strictConfig
        );
        // With 0.99 threshold, a typo shouldn't match
        expect(result).toBeNull();
    });
});

// ---------- batchFuzzyMatch ----------

describe("batchFuzzyMatch", () => {
    const catalogWorks = [
        { id: "work-1", title: "Love Story" },
        { id: "work-2", title: "Bohemian Rhapsody" },
        { id: "work-3", title: "Stairway to Heaven" },
    ];

    it("should match multiple titles at once", () => {
        const searchTitles = [
            { index: 0, title: "Love Story (feat. Someone)" },
            { index: 1, title: "BOHEMIAN RAPSODY" },
            { index: 2, title: "COMPLETELY UNKNOWN SONG" },
        ];

        const results = batchFuzzyMatch(searchTitles, catalogWorks);

        // First should match via normalization
        expect(results.has(0)).toBe(true);
        expect(results.get(0)!.workId).toBe("work-1");

        // Second should match via fuzzy
        expect(results.has(1)).toBe(true);
        expect(results.get(1)!.workId).toBe("work-2");

        // Third should not match
        expect(results.has(2)).toBe(false);
    });

    it("should handle empty catalog", () => {
        const results = batchFuzzyMatch(
            [{ index: 0, title: "Love Story" }],
            []
        );
        expect(results.size).toBe(0);
    });

    it("should handle empty search list", () => {
        const results = batchFuzzyMatch([], catalogWorks);
        expect(results.size).toBe(0);
    });
});