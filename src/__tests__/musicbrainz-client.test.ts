import { describe, it, expect, vi, beforeEach } from "vitest";
import {
    lookupRecordingByISRC,
    lookupWorkByISWC,
    getWorkDetails,
    searchWorkByTitle,
    searchRecordingByTitle,
    searchArtist,
    isrcToISWC,
} from "@/lib/clients/musicbrainz-client";

// Mock the global fetch
global.fetch = vi.fn();

describe("MusicBrainz client", () => {
    beforeEach(() => {
        vi.resetAllMocks();
    });

    // -----------------------------------------------------------------------
    // lookupRecordingByISRC
    // -----------------------------------------------------------------------

    describe("lookupRecordingByISRC", () => {
        it("returns recordings for a valid ISRC", async () => {
            const mockRecording = {
                id: "rec-id-1",
                title: "Test Track",
                isrcs: ["USRC12345678"],
            };
            (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
                ok: true,
                json: async () => ({ recordings: [mockRecording] }),
            });

            const result = await lookupRecordingByISRC("USRC12345678");
            expect(result).toHaveLength(1);
            expect(result[0].id).toBe("rec-id-1");
            expect(result[0].title).toBe("Test Track");
        });

        it("returns empty array when no recordings found", async () => {
            (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
                ok: true,
                json: async () => ({ recordings: [] }),
            });

            const result = await lookupRecordingByISRC("USRC99999999");
            expect(result).toHaveLength(0);
        });

        it("returns empty array on API error", async () => {
            (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
                ok: false,
                status: 404,
            });

            const result = await lookupRecordingByISRC("INVALID");
            expect(result).toHaveLength(0);
        });
    });

    // -----------------------------------------------------------------------
    // lookupWorkByISWC
    // -----------------------------------------------------------------------

    describe("lookupWorkByISWC", () => {
        it("returns works for a valid ISWC", async () => {
            const mockWork = {
                id: "work-id-1",
                title: "Test Composition",
                iswcs: ["T-123456789-Z"],
            };
            (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
                ok: true,
                json: async () => ({ works: [mockWork] }),
            });

            const result = await lookupWorkByISWC("T-123456789-Z");
            expect(result).toHaveLength(1);
            expect(result[0].id).toBe("work-id-1");
            expect(result[0].iswcs).toContain("T-123456789-Z");
        });

        it("returns empty array when no works found", async () => {
            (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
                ok: true,
                json: async () => ({ works: [] }),
            });

            const result = await lookupWorkByISWC("T-000000000-Z");
            expect(result).toHaveLength(0);
        });

        it("returns empty array on API error", async () => {
            (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
                ok: false,
                status: 500,
            });

            const result = await lookupWorkByISWC("T-INVALID");
            expect(result).toHaveLength(0);
        });
    });

    // -----------------------------------------------------------------------
    // getWorkDetails
    // -----------------------------------------------------------------------

    describe("getWorkDetails", () => {
        it("returns work details for a valid MBID", async () => {
            const mockWork = {
                id: "work-id-1",
                title: "Test Composition",
                iswcs: ["T-123456789-Z"],
                type: "Song",
                relations: [],
            };
            (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
                ok: true,
                json: async () => mockWork,
            });

            const result = await getWorkDetails("work-id-1");
            expect(result).not.toBeNull();
            expect(result!.id).toBe("work-id-1");
            expect(result!.title).toBe("Test Composition");
        });

        it("returns null on API error", async () => {
            (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
                ok: false,
                status: 404,
            });

            const result = await getWorkDetails("nonexistent-id");
            expect(result).toBeNull();
        });
    });

    // -----------------------------------------------------------------------
    // searchWorkByTitle
    // -----------------------------------------------------------------------

    describe("searchWorkByTitle", () => {
        it("returns works matching a title query", async () => {
            const mockWorks = [
                { id: "w1", title: "Bohemian Rhapsody", iswcs: ["T-010.440.680-1"] },
                { id: "w2", title: "Bohemian Rhapsody (Live)", iswcs: [] },
            ];
            (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
                ok: true,
                json: async () => ({ works: mockWorks, count: 2, offset: 0 }),
            });

            const result = await searchWorkByTitle("Bohemian Rhapsody");
            expect(result).toHaveLength(2);
            expect(result[0].title).toBe("Bohemian Rhapsody");
        });

        it("includes artist in query when provided", async () => {
            (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
                ok: true,
                json: async () => ({ works: [], count: 0, offset: 0 }),
            });

            await searchWorkByTitle("Yesterday", "Beatles");

            const calledUrl = (global.fetch as ReturnType<typeof vi.fn>).mock
                .calls[0][0] as string;
            expect(calledUrl).toContain("artist");
            expect(calledUrl).toContain("Beatles");
        });

        it("returns empty array when no matches", async () => {
            (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
                ok: true,
                json: async () => ({ works: [], count: 0, offset: 0 }),
            });

            const result = await searchWorkByTitle("xyzzy nonexistent song");
            expect(result).toHaveLength(0);
        });
    });

    // -----------------------------------------------------------------------
    // searchRecordingByTitle
    // -----------------------------------------------------------------------

    describe("searchRecordingByTitle", () => {
        it("returns recordings matching a title query", async () => {
            const mockRecordings = [
                {
                    id: "r1",
                    title: "Stairway to Heaven",
                    isrcs: ["GBAYE7400088"],
                    "artist-credit": [{ name: "Led Zeppelin", artist: { id: "a1", name: "Led Zeppelin" } }],
                },
            ];
            (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    recordings: mockRecordings,
                    count: 1,
                    offset: 0,
                }),
            });

            const result = await searchRecordingByTitle("Stairway to Heaven");
            expect(result).toHaveLength(1);
            expect(result[0].title).toBe("Stairway to Heaven");
        });

        it("returns empty array on API error", async () => {
            (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
                ok: false,
                status: 503,
            });

            const result = await searchRecordingByTitle("Any Song");
            expect(result).toHaveLength(0);
        });
    });

    // -----------------------------------------------------------------------
    // searchArtist
    // -----------------------------------------------------------------------

    describe("searchArtist", () => {
        it("returns artists matching a name query", async () => {
            const mockArtists = [
                { id: "a1", name: "The Beatles", "sort-name": "Beatles, The", country: "GB" },
            ];
            (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
                ok: true,
                json: async () => ({ artists: mockArtists, count: 1, offset: 0 }),
            });

            const result = await searchArtist("Beatles");
            expect(result).toHaveLength(1);
            expect(result[0].name).toBe("The Beatles");
        });

        it("returns empty array when no artists found", async () => {
            (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
                ok: true,
                json: async () => ({ artists: [], count: 0, offset: 0 }),
            });

            const result = await searchArtist("xyzzy unknown band");
            expect(result).toHaveLength(0);
        });
    });

    // -----------------------------------------------------------------------
    // isrcToISWC
    // -----------------------------------------------------------------------

    describe("isrcToISWC", () => {
        it("returns ISWC when recording has a linked work with performance relation", async () => {
            const mockRecording = { id: "rec-1", title: "Some Song" };
            const mockDetails = {
                id: "rec-1",
                title: "Some Song",
                relations: [
                    {
                        type: "performance",
                        work: {
                            id: "work-1",
                            title: "Some Composition",
                            iswcs: ["T-111222333-4"],
                        },
                    },
                ],
            };

            // First call: lookupRecordingByISRC
            (global.fetch as ReturnType<typeof vi.fn>)
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ recordings: [mockRecording] }),
                })
                // Second call: get recording details with work-rels
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => mockDetails,
                });

            const result = await isrcToISWC("USRC12345678");
            expect(result.iswc).toBe("T-111222333-4");
            expect(result.workTitle).toBe("Some Composition");
            expect(result.workId).toBe("work-1");
        });

        it("returns nulls when no recording found for ISRC", async () => {
            (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
                ok: true,
                json: async () => ({ recordings: [] }),
            });

            const result = await isrcToISWC("USRC99999999");
            expect(result.iswc).toBeNull();
            expect(result.workTitle).toBeNull();
            expect(result.workId).toBeNull();
        });

        it("returns nulls when recording has no performance relation", async () => {
            const mockRecording = { id: "rec-1", title: "Some Song" };
            const mockDetails = {
                id: "rec-1",
                title: "Some Song",
                relations: [],
            };

            (global.fetch as ReturnType<typeof vi.fn>)
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ recordings: [mockRecording] }),
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => mockDetails,
                });

            const result = await isrcToISWC("USRC12345678");
            expect(result.iswc).toBeNull();
        });
    });
});
