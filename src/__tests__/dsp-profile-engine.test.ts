import { describe, it, expect, vi } from "vitest";
import { detectDuplicateProfiles, type DspEntry } from "../lib/music/dsp-profile-engine";
import { normalizeTitle } from "../lib/music/music";

// Mock the database so the module can be imported without a real DB connection
vi.mock("../lib/infra/db", () => ({ db: {} }));
vi.mock("../lib/infra/logger", () => ({
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));
vi.mock("../lib/infra/notify", () => ({ notifyOrg: vi.fn() }));

// ---------- helpers ----------

function entry(source: string, rawName: string, streams = 1000): DspEntry {
    return {
        source,
        rawName,
        normalizedName: normalizeTitle(rawName),
        totalStreams: streams,
        totalRevenue: 100,
    };
}

// ---------- tests ----------

describe("detectDuplicateProfiles", () => {
    it("returns empty array when given no entries", () => {
        expect(detectDuplicateProfiles([])).toEqual([]);
    });

    it("returns empty array when all artists are truly distinct", () => {
        const entries: DspEntry[] = [
            entry("SPOTIFY", "Drake"),
            entry("APPLE_MUSIC", "Kendrick Lamar"),
            entry("TIDAL", "Beyoncé"),
        ];
        const groups = detectDuplicateProfiles(entries);
        expect(groups).toHaveLength(0);
    });

    it("detects same artist with a minor typo across two DSPs", () => {
        const entries: DspEntry[] = [
            entry("SPOTIFY", "Taylor Swift"),
            entry("APPLE_MUSIC", "Taylor Swif"), // typo
        ];
        const groups = detectDuplicateProfiles(entries);
        expect(groups).toHaveLength(1);
        expect(groups[0].aliases).toContain("Taylor Swift");
        expect(groups[0].aliases).toContain("Taylor Swif");
        expect(groups[0].dsps).toContain("SPOTIFY");
        expect(groups[0].dsps).toContain("APPLE_MUSIC");
    });

    it("detects exact same artist name across multiple DSPs as a duplicate", () => {
        const entries: DspEntry[] = [
            entry("SPOTIFY", "The Weeknd", 5_000_000),
            entry("APPLE_MUSIC", "The Weeknd", 3_000_000),
            entry("TIDAL", "The Weeknd", 1_000_000),
        ];
        const groups = detectDuplicateProfiles(entries);
        // Same normalised name across 3 DSPs → should be flagged
        expect(groups).toHaveLength(1);
        expect(groups[0].totalStreams).toBe(9_000_000);
        expect(groups[0].dsps.length).toBe(3);
    });

    it("does NOT flag a single artist with one entry on one DSP", () => {
        const entries: DspEntry[] = [
            entry("SPOTIFY", "Adele"),
        ];
        const groups = detectDuplicateProfiles(entries);
        expect(groups).toHaveLength(0);
    });

    it("detects two separate duplicate groups independently", () => {
        const entries: DspEntry[] = [
            // Group A
            entry("SPOTIFY", "Post Malone"),
            entry("APPLE_MUSIC", "Post Malöne"), // accent variant
            // Group B
            entry("SPOTIFY", "Billie Eilish"),
            entry("TIDAL", "Billie Eilish"), // exact same name, multi-DSP
            // Solo artist — should NOT appear
            entry("SPOTIFY", "Frank Ocean"),
        ];
        const groups = detectDuplicateProfiles(entries);
        expect(groups).toHaveLength(2);
    });

    it("aggregates total streams correctly across all entries in a group", () => {
        const entries: DspEntry[] = [
            entry("SPOTIFY", "Ariana Grande", 2_000),
            entry("APPLE_MUSIC", "Ariana Grande", 3_000),
        ];
        const groups = detectDuplicateProfiles(entries);
        expect(groups).toHaveLength(1);
        expect(groups[0].totalStreams).toBe(5_000);
    });

    it("sets confidence based on name similarity", () => {
        // Exact same name → higher confidence
        const exactMatch: DspEntry[] = [
            entry("SPOTIFY", "Dua Lipa"),
            entry("APPLE_MUSIC", "Dua Lipa"),
        ];
        const [groupExact] = detectDuplicateProfiles(exactMatch);

        // Near-match → still positive but lower
        const nearMatch: DspEntry[] = [
            entry("SPOTIFY", "Dua Lip"),
            entry("APPLE_MUSIC", "Dua Lipa"),
        ];
        const [groupNear] = detectDuplicateProfiles(nearMatch);

        expect(groupExact.confidence).toBeGreaterThan(groupNear.confidence);
        expect(groupExact.confidence).toBeLessThanOrEqual(100);
    });

    it("sorts groups by total streams descending", () => {
        const entries: DspEntry[] = [
            // Small group
            entry("SPOTIFY", "Coldplay", 100),
            entry("APPLE_MUSIC", "Coldplay", 100),
            // Large group
            entry("SPOTIFY", "Bruno Mars", 50_000),
            entry("TIDAL", "Bruno Mars", 50_000),
        ];
        const groups = detectDuplicateProfiles(entries);
        expect(groups).toHaveLength(2);
        expect(groups[0].totalStreams).toBeGreaterThan(groups[1].totalStreams);
    });
});
