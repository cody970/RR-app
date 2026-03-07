import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/**
 * Catalog Scanner Engine Tests
 *
 * Tests gap detection for works and recordings against external APIs:
 * - PRO registration checks (ASCAP/BMI via Songview)
 * - Missing ISWC detection (MusicBrainz)
 * - Orphaned ISRC detection (MusicBrainz ISRC-to-ISWC)
 * - MLC registration checks
 * - SoundExchange registration checks
 */

// ---------- Mock External Clients ----------

const mockSongviewSearch = vi.fn();
const mockSearchByISWC = vi.fn();
const mockIsrcToISWC = vi.fn();
const mockSearchWorkByTitle = vi.fn();
const mockSearchMLCByTitle = vi.fn();
const mockSeSearchByISRC = vi.fn();
const mockEnrichRecordingCredits = vi.fn();
const mockFindWriterIPI = vi.fn();
const mockSpotifySearchByISRC = vi.fn();

vi.mock("@/lib/clients/songview-client", () => ({
    searchByTitle: (...args: unknown[]) => mockSongviewSearch(...args),
    searchByISWC: (...args: unknown[]) => mockSearchByISWC(...args),
}));

vi.mock("@/lib/clients/musicbrainz-client", () => ({
    isrcToISWC: (...args: unknown[]) => mockIsrcToISWC(...args),
    searchWorkByTitle: (...args: unknown[]) => mockSearchWorkByTitle(...args),
}));

vi.mock("@/lib/clients/mlc-client", () => ({
    searchMLCByTitle: (...args: unknown[]) => mockSearchMLCByTitle(...args),
}));

vi.mock("@/lib/clients/soundexchange-client", () => ({
    searchByISRC: (...args: unknown[]) => mockSeSearchByISRC(...args),
}));

vi.mock("@/lib/clients/muso-client", () => ({
    enrichRecordingCredits: (...args: unknown[]) => mockEnrichRecordingCredits(...args),
    findWriterIPI: (...args: unknown[]) => mockFindWriterIPI(...args),
}));

vi.mock("@/lib/clients/spotify", () => ({
    searchByISRC: (...args: unknown[]) => mockSpotifySearchByISRC(...args),
}));

// ---------- Mock DB & Logger ----------

const mockDbWorkFindMany = vi.fn();
const mockDbRecordingFindMany = vi.fn();
const mockDbRegistrationFindMany = vi.fn();
const mockDbDspReportFindMany = vi.fn();
const mockDbCatalogScanUpdate = vi.fn();
const mockDbRegistrationGapCreate = vi.fn();
const mockDbRegistrationGapFindMany = vi.fn();
const mockDbRegistrationGapUpdate = vi.fn();
const mockDbFindingFindMany = vi.fn();

vi.mock("@/lib/infra/db", () => ({
    db: {
        work: { findMany: (...args: unknown[]) => mockDbWorkFindMany(...args) },
        recording: { findMany: (...args: unknown[]) => mockDbRecordingFindMany(...args) },
        registration: { findMany: (...args: unknown[]) => mockDbRegistrationFindMany(...args) },
        dspReport: { findMany: (...args: unknown[]) => mockDbDspReportFindMany(...args) },
        catalogScan: { update: (...args: unknown[]) => mockDbCatalogScanUpdate(...args) },
        registrationGap: {
            create: (...args: unknown[]) => mockDbRegistrationGapCreate(...args),
            findMany: (...args: unknown[]) => mockDbRegistrationGapFindMany(...args),
            update: (...args: unknown[]) => mockDbRegistrationGapUpdate(...args),
        },
        finding: { findMany: (...args: unknown[]) => mockDbFindingFindMany(...args) },
    },
}));

vi.mock("@/lib/infra/logger", () => ({
    logger: {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
    },
}));

// ---------- Mock pMap for Sync Execution in Tests ----------

vi.mock("@/lib/infra/utils", () => ({
    pMap: async (items: any[], fn: (item: any) => Promise<void>, _concurrency?: number) => {
        for (const item of items) {
            await fn(item);
        }
    },
}));

// Import after mocking
import { runCatalogScan, type ScanProgress, type ProgressCallback } from "../lib/music/catalog-scanner";

// ---------- Test Constants ----------

const ORG_ID = "org-scanner-test";
const SCAN_ID = "scan-test-001";

// ---------- Test Setup ----------

function resetMocks() {
    mockSongviewSearch.mockReset();
    mockSearchByISWC.mockReset();
    mockIsrcToISWC.mockReset();
    mockSearchWorkByTitle.mockReset();
    mockSearchMLCByTitle.mockReset();
    mockSeSearchByISRC.mockReset();
    mockEnrichRecordingCredits.mockReset();
    mockFindWriterIPI.mockReset();
    mockSpotifySearchByISRC.mockReset();
    mockDbWorkFindMany.mockReset();
    mockDbRecordingFindMany.mockReset();
    mockDbRegistrationFindMany.mockReset();
    mockDbDspReportFindMany.mockReset();
    mockDbCatalogScanUpdate.mockReset();
    mockDbRegistrationGapCreate.mockReset();
    mockDbRegistrationGapFindMany.mockReset();
    mockDbRegistrationGapUpdate.mockReset();
    mockDbFindingFindMany.mockReset();
}

interface MockDataSetup {
    works?: Array<{
        id: string;
        title: string;
        iswc?: string | null;
        writers?: Array<{ writer: { name: string; ipiCae?: string } }>;
    }>;
    recordings?: Array<{
        id: string;
        title: string;
        isrc?: string | null;
        workId?: string | null;
    }>;
    registrations?: Array<{
        workId: string;
        society: string;
    }>;
    dspReports?: Array<{
        isrc: string;
        revenue: number;
        streams: number;
    }>;
}

function setupDefaultMocks(overrides: MockDataSetup = {}) {
    const defaults: MockDataSetup = {
        works: [],
        recordings: [],
        registrations: [],
        dspReports: [],
        ...overrides,
    };

    mockDbWorkFindMany.mockResolvedValue(defaults.works);
    mockDbRecordingFindMany.mockResolvedValue(defaults.recordings);
    mockDbRegistrationFindMany.mockResolvedValue(defaults.registrations);
    mockDbDspReportFindMany.mockResolvedValue(defaults.dspReports);
    mockDbCatalogScanUpdate.mockResolvedValue({});
    mockDbRegistrationGapCreate.mockResolvedValue({});
    mockDbRegistrationGapFindMany.mockResolvedValue([]);
    mockDbRegistrationGapUpdate.mockResolvedValue({});
    mockDbFindingFindMany.mockResolvedValue([]);

    // Default external API responses
    mockSongviewSearch.mockResolvedValue({ found: false });
    mockSearchByISWC.mockResolvedValue({ found: false });
    mockIsrcToISWC.mockResolvedValue({ iswc: null, workId: null });
    mockSearchWorkByTitle.mockResolvedValue([]);
    mockSearchMLCByTitle.mockResolvedValue({ found: false, works: [] });
    mockSeSearchByISRC.mockResolvedValue({ found: false });
    mockEnrichRecordingCredits.mockResolvedValue({ found: false, credits: [] });
    mockFindWriterIPI.mockResolvedValue({ ipiNameNumber: null });
    mockSpotifySearchByISRC.mockResolvedValue(null);
}

// ============================================================
// runCatalogScan Tests
// ============================================================

describe("runCatalogScan", () => {
    beforeEach(() => {
        resetMocks();
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    // ---------- Basic Scenarios ----------

    describe("Basic Scenarios", () => {
        it("should return zero gaps for empty catalog", async () => {
            setupDefaultMocks({
                works: [],
                recordings: [],
            });

            const result = await runCatalogScan(SCAN_ID, ORG_ID);

            expect(result.totalGaps).toBe(0);
            expect(mockDbCatalogScanUpdate).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { id: SCAN_ID },
                    data: expect.objectContaining({ status: "COMPLETE" }),
                })
            );
        });

        it("should update scan status to SCANNING at start", async () => {
            setupDefaultMocks({
                works: [{ id: "work-1", title: "Test Song", iswc: "T-123456789-1", writers: [] }],
                recordings: [],
            });

            await runCatalogScan(SCAN_ID, ORG_ID);

            expect(mockDbCatalogScanUpdate).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { id: SCAN_ID },
                    data: expect.objectContaining({
                        status: "SCANNING",
                        totalWorks: 1,
                        totalRecordings: 0,
                    }),
                })
            );
        });

        it("should report progress via callback", async () => {
            const progressCallback: ProgressCallback = vi.fn();

            setupDefaultMocks({
                works: Array.from({ length: 25 }, (_, i) => ({
                    id: `work-${i}`,
                    title: `Song ${i}`,
                    iswc: `T-${String(i).padStart(9, '0')}-0`,
                    writers: [],
                })),
                recordings: [],
            });

            await runCatalogScan(SCAN_ID, ORG_ID, progressCallback);

            expect(progressCallback).toHaveBeenCalled();
            expect(progressCallback).toHaveBeenCalledWith(
                expect.objectContaining({
                    scanId: SCAN_ID,
                    totalItems: expect.any(Number),
                    scannedItems: expect.any(Number),
                })
            );
        });
    });

    // ---------- PRO Registration Gap Detection ----------

    describe("PRO Registration Gap Detection", () => {
        it("should detect work not registered at any PRO", async () => {
            setupDefaultMocks({
                works: [{
                    id: "work-1",
                    title: "Unregistered Song",
                    iswc: "T-999999999-9",
                    writers: [{ writer: { name: "Test Writer" } }],
                }],
                recordings: [],
                registrations: [], // No existing registrations
            });

            // Songview returns not found
            mockSearchByISWC.mockResolvedValue({ found: false });

            const result = await runCatalogScan(SCAN_ID, ORG_ID);

            expect(result.totalGaps).toBeGreaterThanOrEqual(1);
            expect(mockDbRegistrationGapCreate).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        scanId: SCAN_ID,
                        workId: "work-1",
                        title: "Unregistered Song",
                        gapType: "NO_REGISTRATION",
                        society: "ASCAP/BMI",
                    }),
                })
            );
        });

        it("should detect work registered at ASCAP but missing from BMI", async () => {
            setupDefaultMocks({
                works: [{
                    id: "work-2",
                    title: "ASCAP Only Song",
                    iswc: "T-111111111-1",
                    writers: [{ writer: { name: "Test Writer" } }],
                }],
                recordings: [],
                registrations: [
                    { workId: "work-2", society: "ASCAP" },
                    // Missing BMI registration
                ],
            });

            // Songview confirms ASCAP registration
            mockSearchByISWC.mockResolvedValue({
                found: true,
                society: "ASCAP",
                iswc: "T-111111111-1",
                rawData: { title: "ASCAP Only Song" },
            });

            const result = await runCatalogScan(SCAN_ID, ORG_ID);

            expect(result.totalGaps).toBeGreaterThanOrEqual(1);
            expect(mockDbRegistrationGapCreate).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        workId: "work-2",
                        society: "BMI",
                        gapType: "MISSING_WORK",
                    }),
                })
            );
        });

        it("should detect work registered at BMI but missing from ASCAP", async () => {
            setupDefaultMocks({
                works: [{
                    id: "work-3",
                    title: "BMI Only Song",
                    iswc: "T-222222222-2",
                    writers: [{ writer: { name: "Writer B" } }],
                }],
                recordings: [],
                registrations: [
                    { workId: "work-3", society: "BMI" },
                    // Missing ASCAP registration
                ],
            });

            // Songview confirms BMI registration
            mockSearchByISWC.mockResolvedValue({
                found: true,
                society: "BMI",
                iswc: "T-222222222-2",
                rawData: { title: "BMI Only Song" },
            });

            const result = await runCatalogScan(SCAN_ID, ORG_ID);

            expect(result.totalGaps).toBeGreaterThanOrEqual(1);
            expect(mockDbRegistrationGapCreate).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        workId: "work-3",
                        society: "ASCAP",
                        gapType: "MISSING_WORK",
                    }),
                })
            );
        });

        it("should not flag works registered at both PROs", async () => {
            setupDefaultMocks({
                works: [{
                    id: "work-4",
                    title: "Fully Registered Song",
                    iswc: "T-333333333-3",
                    writers: [],
                }],
                recordings: [],
                registrations: [
                    { workId: "work-4", society: "ASCAP" },
                    { workId: "work-4", society: "BMI" },
                ],
            });

            const result = await runCatalogScan(SCAN_ID, ORG_ID);

            // Should not create any registration gaps for this work
            const createCalls = mockDbRegistrationGapCreate.mock.calls;
            const workGaps = createCalls.filter((call: any) =>
                call[0]?.data?.workId === "work-4" &&
                (call[0]?.data?.gapType === "NO_REGISTRATION" || call[0]?.data?.gapType === "MISSING_WORK")
            );
            expect(workGaps.length).toBe(0);
        });
    });

    // ---------- Missing ISWC Detection ----------

    describe("Missing ISWC Detection", () => {
        it("should detect work without ISWC when MusicBrainz has one", async () => {
            setupDefaultMocks({
                works: [{
                    id: "work-5",
                    title: "No ISWC Song",
                    iswc: null, // Missing ISWC
                    writers: [{ writer: { name: "Writer C" } }],
                }],
                recordings: [],
                registrations: [
                    { workId: "work-5", society: "ASCAP" },
                    { workId: "work-5", society: "BMI" },
                ],
            });

            // MusicBrainz finds the work with an ISWC
            mockSearchWorkByTitle.mockResolvedValue([{
                id: "mb-work-123",
                title: "No ISWC Song",
                iswcs: ["T-444444444-4"],
            }]);

            const result = await runCatalogScan(SCAN_ID, ORG_ID);

            expect(result.totalGaps).toBeGreaterThanOrEqual(1);
            expect(mockDbRegistrationGapCreate).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        workId: "work-5",
                        iswc: "T-444444444-4",
                        gapType: "MISSING_SPLIT",
                        musicbrainzId: "mb-work-123",
                    }),
                })
            );
        });

        it("should not flag work without ISWC when MusicBrainz has no match", async () => {
            setupDefaultMocks({
                works: [{
                    id: "work-6",
                    title: "Obscure Song",
                    iswc: null,
                    writers: [],
                }],
                recordings: [],
                registrations: [
                    { workId: "work-6", society: "ASCAP" },
                    { workId: "work-6", society: "BMI" },
                ],
            });

            // MusicBrainz finds nothing
            mockSearchWorkByTitle.mockResolvedValue([]);

            const result = await runCatalogScan(SCAN_ID, ORG_ID);

            // Should not create MISSING_SPLIT gap for this work
            const createCalls = mockDbRegistrationGapCreate.mock.calls;
            const splitGaps = createCalls.filter((call: any) =>
                call[0]?.data?.workId === "work-6" && call[0]?.data?.gapType === "MISSING_SPLIT"
            );
            expect(splitGaps.length).toBe(0);
        });
    });

    // ---------- Orphaned Recording Detection ----------

    describe("Orphaned Recording Detection", () => {
        it("should detect recording with ISRC but no linked work", async () => {
            setupDefaultMocks({
                works: [],
                recordings: [{
                    id: "rec-1",
                    title: "Orphan Track",
                    isrc: "US-ABC-12-00001",
                    workId: null, // No linked work
                }],
                dspReports: [{
                    isrc: "US-ABC-12-00001",
                    revenue: 500.00,
                    streams: 50000,
                }],
            });

            // MusicBrainz finds ISWC for this ISRC
            mockIsrcToISWC.mockResolvedValue({
                iswc: "T-555555555-5",
                workId: "mb-work-456",
            });

            const result = await runCatalogScan(SCAN_ID, ORG_ID);

            expect(result.totalGaps).toBeGreaterThanOrEqual(1);
            expect(mockDbRegistrationGapCreate).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        recordingId: "rec-1",
                        isrc: "US-ABC-12-00001",
                        gapType: "MISSING_RECORDING",
                        iswc: "T-555555555-5",
                    }),
                })
            );
        });

        it("should estimate impact for orphaned recording from DSP data", async () => {
            setupDefaultMocks({
                works: [],
                recordings: [{
                    id: "rec-2",
                    title: "Revenue Track",
                    isrc: "US-DEF-13-00002",
                    workId: null,
                }],
                dspReports: [{
                    isrc: "US-DEF-13-00002",
                    revenue: 1250.75,
                    streams: 125000,
                }],
            });

            mockIsrcToISWC.mockResolvedValue({ iswc: null, workId: null });

            await runCatalogScan(SCAN_ID, ORG_ID);

            expect(mockDbRegistrationGapCreate).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        recordingId: "rec-2",
                        estimatedImpact: 1250.75, // DSP revenue
                    }),
                })
            );
        });
    });

    // ---------- Impact Estimation ----------

    describe("Impact Estimation", () => {
        it("should estimate impact based on recording revenue", async () => {
            setupDefaultMocks({
                works: [{
                    id: "work-7",
                    title: "High Revenue Song",
                    iswc: "T-777777777-7",
                    writers: [],
                }],
                recordings: [{
                    id: "rec-3",
                    title: "High Revenue Song",
                    isrc: "US-GHI-14-00003",
                    workId: "work-7",
                }],
                dspReports: [{
                    isrc: "US-GHI-14-00003",
                    revenue: 10000.00,
                    streams: 1000000,
                }],
                registrations: [], // Not registered
            });

            mockSearchByISWC.mockResolvedValue({ found: false });

            const result = await runCatalogScan(SCAN_ID, ORG_ID);

            expect(result.totalGaps).toBeGreaterThanOrEqual(1);
            // Impact should be calculated based on publishing share
            expect(mockDbRegistrationGapCreate).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        estimatedImpact: expect.any(Number),
                    }),
                })
            );
        });
    });

    // ---------- Error Handling ----------

    describe("Error Handling", () => {
        it("should continue scanning when external API fails", async () => {
            setupDefaultMocks({
                works: [
                    { id: "work-8", title: "Song A", iswc: "T-888888888-8", writers: [] },
                    { id: "work-9", title: "Song B", iswc: "T-999999999-9", writers: [] },
                ],
                recordings: [],
            });

            // First call fails, second succeeds
            mockSearchByISWC
                .mockRejectedValueOnce(new Error("API timeout"))
                .mockResolvedValueOnce({ found: false });

            const result = await runCatalogScan(SCAN_ID, ORG_ID);

            // Should still complete the scan
            expect(mockDbCatalogScanUpdate).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({ status: "COMPLETE" }),
                })
            );
        });

        it("should log errors but not crash on failed work scan", async () => {
            setupDefaultMocks({
                works: [{
                    id: "work-10",
                    title: "Error Song",
                    iswc: "T-101010101-0",
                    writers: [],
                }],
                recordings: [],
            });

            mockSearchByISWC.mockRejectedValue(new Error("Network error"));

            // Should not throw
            await expect(runCatalogScan(SCAN_ID, ORG_ID)).resolves.not.toThrow();
        });
    });

    // ---------- Finalization ----------

    describe("Finalization", () => {
        it("should update scan with final counts", async () => {
            setupDefaultMocks({
                works: [
                    { id: "w1", title: "Song 1", iswc: null, writers: [] },
                    { id: "w2", title: "Song 2", iswc: null, writers: [] },
                ],
                recordings: [
                    { id: "r1", title: "Track 1", isrc: "US-111-00-00001", workId: null },
                ],
            });

            // MusicBrainz finds ISWCs
            mockSearchWorkByTitle.mockResolvedValue([{ id: "mb-1", iswcs: ["T-000000001-0"] }]);
            mockIsrcToISWC.mockResolvedValue({ iswc: "T-000000002-0", workId: "mb-2" });

            const result = await runCatalogScan(SCAN_ID, ORG_ID);

            expect(mockDbCatalogScanUpdate).toHaveBeenLastCalledWith(
                expect.objectContaining({
                    where: { id: SCAN_ID },
                    data: expect.objectContaining({
                        status: "COMPLETE",
                        scannedCount: expect.any(Number),
                        unregisteredCount: result.totalGaps,
                    }),
                })
            );
        });
    });
});

// ============================================================
// Edge Cases
// ============================================================

describe("Catalog Scanner Edge Cases", () => {
    beforeEach(() => {
        resetMocks();
    });

    it("should handle works with empty writers array", async () => {
        setupDefaultMocks({
            works: [{
                id: "work-edge-1",
                title: "Solo Instrumental",
                iswc: "T-EDGE00001-0",
                writers: [],
            }],
            recordings: [],
        });

        await expect(runCatalogScan(SCAN_ID, ORG_ID)).resolves.not.toThrow();
    });

    it("should handle recordings without ISRC", async () => {
        setupDefaultMocks({
            works: [],
            recordings: [{
                id: "rec-edge-1",
                title: "Legacy Recording",
                isrc: null, // No ISRC
                workId: "work-1",
            }],
        });

        const result = await runCatalogScan(SCAN_ID, ORG_ID);

        // Should not create gap for recording without ISRC
        expect(result.totalGaps).toBe(0);
    });

    it("should use title search when work has no ISWC", async () => {
        setupDefaultMocks({
            works: [{
                id: "work-edge-2",
                title: "Title Only Song",
                iswc: null,
                writers: [{ writer: { name: "John Doe" } }],
            }],
            recordings: [],
            registrations: [],
        });

        mockSongviewSearch.mockResolvedValue({ found: false });

        await runCatalogScan(SCAN_ID, ORG_ID);

        // Should use title search instead of ISWC search
        expect(mockSongviewSearch).toHaveBeenCalledWith("Title Only Song", "John Doe");
    });
});
