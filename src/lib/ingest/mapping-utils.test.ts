import { describe, it, expect } from "vitest";
import { autoMapHeaders, applyMapping } from "./mapping-utils";
import { industryTemplates } from "../reports/templates";

describe("CSV Mapping Utilities", () => {
    describe("autoMapHeaders", () => {
        it("should map Spotify-like headers to internal keys", () => {
            const headers = ["track name", "artist name", "platform", "timestamp", "ms_played"];
            const mapping = autoMapHeaders(headers, "DSP Report");

            expect(mapping["track name"]).toBe("Title");
            expect(mapping["artist name"]).toBe("Artist");
            expect(mapping["platform"]).toBe("Source");
            expect(mapping["timestamp"]).toBe("Period");
        });

        it("should map ASCAP-like headers to internal keys", () => {
            const headers = ["WORK TITLE", "ISRC", "PERFORMANCE QUARTER", "DOLLARS", "SOURCE"];
            const mapping = autoMapHeaders(headers, "Statement Lines");

            expect(mapping["WORK TITLE"]).toBe("Title");
            expect(mapping["ISRC"]).toBe("ISRC");
            expect(mapping["PERFORMANCE QUARTER"]).toBe("Period");
            expect(mapping["DOLLARS"]).toBe("Amount");
        });

        it("should handle mixed case and spaces", () => {
            const headers = ["TrackTitle ", "  isrc  ", "Net_Amount"];
            const mapping = autoMapHeaders(headers, "Statement Lines");

            expect(mapping["TrackTitle "]).toBe("Title");
            expect(mapping["  isrc  "]).toBe("ISRC");
            expect(mapping["Net_Amount"]).toBe("Amount");
        });
    });

    describe("applyMapping", () => {
        it("should transform a row based on mapping", () => {
            const row = { "track name": "Song A", "artist name": "Artist B", "ms_played": "1000" };
            const mapping = { "track name": "Title", "artist name": "Artist", "ms_played": "Revenue" };

            const result = applyMapping(row, mapping);
            expect(result).toEqual({
                Title: "Song A",
                Artist: "Artist B",
                Revenue: "1000"
            });
        });
    });

    describe("Industry Templates", () => {
        it("should have valid mappings for Spotify", () => {
            const spotify = industryTemplates.SPOTIFY_STREAMING;
            expect(spotify.targetType).toBe("DSP Report");
            expect(spotify.mapping["track name"]).toBe("Title");
        });

        it("should have valid mappings for MLC", () => {
            const mlc = industryTemplates.MLC_DETAIL;
            expect(mlc.targetType).toBe("DSP Report");
            expect(mlc.mapping["Musical Work Title"]).toBe("Title");
            expect(mlc.mapping["Net Payable Amount"]).toBe("Revenue");
        });
    });
});
