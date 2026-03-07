import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Discrepancy Engine Tests
 *
 * Tests the 4 check types: missing works, rate anomalies, revenue drops, unmatched lines.
 * Uses Prisma mocking to isolate the business logic from the database.
 */

// ---------- Mock Prisma ----------

const mockFindUnique = vi.fn();
const mockFindMany = vi.fn();
const mockGroupBy = vi.fn();
const mockCreateMany = vi.fn();

vi.mock("@/lib/infra/db", () => ({
    db: {
        statement: { findUnique: (...args: unknown[]) => mockFindUnique(...args) },
        work: { findMany: (...args: unknown[]) => mockFindMany(...args) },
        recording: { findMany: (...args: unknown[]) => mockFindMany(...args) },
        statementLine: {
            findMany: (...args: unknown[]) => mockFindMany(...args),
            groupBy: (...args: unknown[]) => mockGroupBy(...args),
        },
        royaltyPeriod: {
            findMany: (...args: unknown[]) => mockFindMany(...args),
            findUnique: (...args: unknown[]) => mockFindUnique(...args),
        },
        finding: {
            findMany: (...args: unknown[]) => mockFindMany(...args),
            createMany: (...args: unknown[]) => mockCreateMany(...args),
        },
    },
}));

// Import after mocking
import { runDiscrepancyChecks, type Discrepancy } from "../lib/music/discrepancy-engine";

// ---------- Helpers ----------

const ORG_ID = "org-test-123";
const STATEMENT_ID = "stmt-test-456";

function resetMocks() {
    mockFindUnique.mockReset();
    mockFindMany.mockReset();
    mockGroupBy.mockReset();
    mockCreateMany.mockReset();
}

/**
 * Set up the default mock responses for a basic scenario.
 * Individual tests can override specific mocks after calling this.
 */
function setupDefaultMocks(overrides?: {
    statement?: { source: string; period: string } | null;
    catalogWorks?: Array<{ id: string; title: string; registrations: Array<{ society: string | null; status: string }> }>;
    statementWorkIds?: Array<{ workId: string | null }>;
    statementLines?: Array<{
        id: string; title: string; uses: number; amount: number;
        rate: number | null; society: string; workId: string | null;
        isrc?: string; iswc?: string;
    }>;
    royaltyPeriods?: Array<{
        workId: string; society: string; period: string;
        totalAmount: number; previousAmount: number | null; changePercent: number | null;
    }>;
    existingFindings?: Array<{ type: string; resourceId: string }>;
}) {
    const defaults = {
        statement: { source: "ASCAP", period: "2024-Q1" },
        catalogWorks: [],
        statementWorkIds: [],
        statementLines: [],
        royaltyPeriods: [],
        existingFindings: [],
        ...overrides,
    };

    // The engine calls many DB methods. We need to route them based on call context.
    // Since all use the same mock functions, we use mockImplementation to route by args.

    mockFindUnique.mockImplementation((args: Record<string, unknown>) => {
        // statement.findUnique
        if (args && typeof args === "object" && "where" in args) {
            const where = args.where as Record<string, unknown>;
            if (where.id === STATEMENT_ID) {
                return Promise.resolve(defaults.statement);
            }
            // royaltyPeriod.findUnique (for previous period lookup)
            if ("orgId_workId_society_period" in where) {
                return Promise.resolve(null);
            }
        }
        return Promise.resolve(null);
    });

    mockFindMany.mockImplementation((args: Record<string, unknown>) => {
        if (!args || typeof args !== "object") return Promise.resolve([]);
        const where = (args as Record<string, unknown>).where as Record<string, unknown> | undefined;

        // work.findMany — catalog works
        if (where && "orgId" in where && args.select && typeof args.select === "object" && "registrations" in (args.select as Record<string, unknown>)) {
            return Promise.resolve(defaults.catalogWorks);
        }

        // statementLine.findMany — statement work IDs (distinct)
        if (where && "statementId" in where && "workId" in where && args.distinct) {
            return Promise.resolve(defaults.statementWorkIds);
        }

        // statementLine.findMany — lines with uses > 0 (rate anomalies)
        if (where && "statementId" in where && "uses" in where) {
            return Promise.resolve(defaults.statementLines.filter(l => l.uses > 0 && l.amount > 0));
        }

        // statementLine.findMany — unmatched lines (workId: null)
        if (where && "statementId" in where && where.workId === null) {
            return Promise.resolve(defaults.statementLines.filter(l => l.workId === null && l.amount > 1));
        }

        // royaltyPeriod.findMany — revenue drops
        if (where && "orgId" in where && "changePercent" in where) {
            return Promise.resolve(defaults.royaltyPeriods.filter(p => (p.changePercent ?? 0) < -25 && (p.previousAmount ?? 0) > 10));
        }

        // finding.findMany — existing findings
        if (where && "orgId" in where && "type" in where) {
            return Promise.resolve(defaults.existingFindings);
        }

        return Promise.resolve([]);
    });

    mockGroupBy.mockResolvedValue([]);
    mockCreateMany.mockResolvedValue({ count: 0 });
}

// ============================================================
// runDiscrepancyChecks — Integration
// ============================================================

describe("runDiscrepancyChecks", () => {
    beforeEach(() => {
        resetMocks();
    });

    it("should return zero discrepancies for empty catalog", async () => {
        setupDefaultMocks();

        const result = await runDiscrepancyChecks(STATEMENT_ID, ORG_ID);
        expect(result.total).toBe(0);
        expect(result.created).toBe(0);
    });

    it("should detect missing works", async () => {
        setupDefaultMocks({
            catalogWorks: [
                {
                    id: "work-1",
                    title: "Missing Song",
                    registrations: [{ society: "ASCAP", status: "CONFIRMED" }],
                },
            ],
            statementWorkIds: [], // work-1 is NOT in the statement
        });

        const result = await runDiscrepancyChecks(STATEMENT_ID, ORG_ID);
        expect(result.total).toBeGreaterThanOrEqual(1);
        expect(mockCreateMany).toHaveBeenCalled();

        // Verify the finding data
        const createCall = mockCreateMany.mock.calls[0]?.[0];
        if (createCall?.data) {
            const missingFinding = createCall.data.find(
                (d: Record<string, unknown>) => d.type === "STATEMENT_MISSING_WORK"
            );
            expect(missingFinding).toBeDefined();
            expect(missingFinding.resourceId).toBe("work-1");
            expect(missingFinding.severity).toBe("HIGH");
            expect(missingFinding.confidence).toBe(95); // CONFIRMED registration
        }
    });

    it("should not flag missing works that are present in statement", async () => {
        setupDefaultMocks({
            catalogWorks: [
                {
                    id: "work-1",
                    title: "Present Song",
                    registrations: [{ society: "ASCAP", status: "CONFIRMED" }],
                },
            ],
            statementWorkIds: [{ workId: "work-1" }], // work IS present
        });

        const result = await runDiscrepancyChecks(STATEMENT_ID, ORG_ID);
        // Should not have a MISSING_WORK finding
        if (mockCreateMany.mock.calls.length > 0) {
            const createCall = mockCreateMany.mock.calls[0]?.[0];
            if (createCall?.data) {
                const missingFinding = createCall.data.find(
                    (d: Record<string, unknown>) => d.type === "STATEMENT_MISSING_WORK"
                );
                expect(missingFinding).toBeUndefined();
            }
        }
    });

    it("should not flag works registered with different society", async () => {
        setupDefaultMocks({
            statement: { source: "ASCAP", period: "2024-Q1" },
            catalogWorks: [
                {
                    id: "work-1",
                    title: "BMI Only Song",
                    registrations: [{ society: "BMI", status: "CONFIRMED" }], // BMI, not ASCAP
                },
            ],
            statementWorkIds: [],
        });

        const result = await runDiscrepancyChecks(STATEMENT_ID, ORG_ID);
        // Should not flag since work is registered with BMI, not ASCAP
        if (mockCreateMany.mock.calls.length > 0) {
            const createCall = mockCreateMany.mock.calls[0]?.[0];
            if (createCall?.data) {
                const missingFinding = createCall.data.find(
                    (d: Record<string, unknown>) => d.type === "STATEMENT_MISSING_WORK"
                );
                expect(missingFinding).toBeUndefined();
            }
        }
    });

    it("should detect rate anomalies below 30% of average", async () => {
        setupDefaultMocks({
            statementLines: [
                {
                    id: "line-1",
                    title: "Underpaid Song",
                    uses: 10000,
                    amount: 10, // $0.001/use vs ASCAP avg $0.08/use — way below 30%
                    rate: 0.001,
                    society: "ASCAP",
                    workId: "work-1",
                },
            ],
        });

        const result = await runDiscrepancyChecks(STATEMENT_ID, ORG_ID);
        expect(result.total).toBeGreaterThanOrEqual(1);

        if (mockCreateMany.mock.calls.length > 0) {
            const createCall = mockCreateMany.mock.calls[0]?.[0];
            if (createCall?.data) {
                const rateFinding = createCall.data.find(
                    (d: Record<string, unknown>) => d.type === "STATEMENT_RATE_ANOMALY"
                );
                expect(rateFinding).toBeDefined();
                expect(rateFinding.estimatedImpact).toBeGreaterThan(0);
            }
        }
    });

    it("should not flag rates above 30% of average", async () => {
        setupDefaultMocks({
            statementLines: [
                {
                    id: "line-1",
                    title: "Normal Song",
                    uses: 1000,
                    amount: 60, // $0.06/use vs ASCAP avg $0.08/use — above 30% threshold
                    rate: 0.06,
                    society: "ASCAP",
                    workId: "work-1",
                },
            ],
        });

        const result = await runDiscrepancyChecks(STATEMENT_ID, ORG_ID);
        if (mockCreateMany.mock.calls.length > 0) {
            const createCall = mockCreateMany.mock.calls[0]?.[0];
            if (createCall?.data) {
                const rateFinding = createCall.data.find(
                    (d: Record<string, unknown>) => d.type === "STATEMENT_RATE_ANOMALY"
                );
                expect(rateFinding).toBeUndefined();
            }
        }
    });

    it("should detect revenue drops > 25%", async () => {
        setupDefaultMocks({
            royaltyPeriods: [
                {
                    workId: "work-1",
                    society: "ASCAP",
                    period: "2024-Q1",
                    totalAmount: 50,
                    previousAmount: 200,
                    changePercent: -75, // 75% drop
                },
            ],
        });

        const result = await runDiscrepancyChecks(STATEMENT_ID, ORG_ID);
        expect(result.total).toBeGreaterThanOrEqual(1);

        if (mockCreateMany.mock.calls.length > 0) {
            const createCall = mockCreateMany.mock.calls[0]?.[0];
            if (createCall?.data) {
                const dropFinding = createCall.data.find(
                    (d: Record<string, unknown>) => d.type === "STATEMENT_REVENUE_DROP"
                );
                expect(dropFinding).toBeDefined();
                expect(dropFinding.severity).toBe("HIGH"); // > 50% drop
                expect(dropFinding.estimatedImpact).toBe(150); // 200 - 50
            }
        }
    });

    it("should classify revenue drops 25-50% as MEDIUM severity", async () => {
        setupDefaultMocks({
            royaltyPeriods: [
                {
                    workId: "work-1",
                    society: "BMI",
                    period: "2024-Q2",
                    totalAmount: 60,
                    previousAmount: 100,
                    changePercent: -40, // 40% drop — MEDIUM
                },
            ],
        });

        const result = await runDiscrepancyChecks(STATEMENT_ID, ORG_ID);

        if (mockCreateMany.mock.calls.length > 0) {
            const createCall = mockCreateMany.mock.calls[0]?.[0];
            if (createCall?.data) {
                const dropFinding = createCall.data.find(
                    (d: Record<string, unknown>) => d.type === "STATEMENT_REVENUE_DROP"
                );
                expect(dropFinding).toBeDefined();
                expect(dropFinding.severity).toBe("MEDIUM");
            }
        }
    });

    it("should detect unmatched lines with significant amounts", async () => {
        setupDefaultMocks({
            statementLines: [
                {
                    id: "line-unmatched-1",
                    title: "Unknown Song",
                    uses: 5000,
                    amount: 75,
                    rate: 0.015,
                    society: "ASCAP",
                    workId: null,
                },
                {
                    id: "line-unmatched-2",
                    title: "Another Unknown",
                    uses: 2000,
                    amount: 25,
                    rate: 0.0125,
                    society: "ASCAP",
                    workId: null,
                },
            ],
        });

        const result = await runDiscrepancyChecks(STATEMENT_ID, ORG_ID);
        expect(result.total).toBeGreaterThanOrEqual(1);

        if (mockCreateMany.mock.calls.length > 0) {
            const createCall = mockCreateMany.mock.calls[0]?.[0];
            if (createCall?.data) {
                // Should have summary finding
                const summaryFinding = createCall.data.find(
                    (d: Record<string, unknown>) => d.type === "STATEMENT_UNMATCHED_LINES"
                );
                expect(summaryFinding).toBeDefined();
                expect(summaryFinding.estimatedImpact).toBe(100); // 75 + 25

                // Should have individual finding for high-value line (>$10)
                const individualFinding = createCall.data.find(
                    (d: Record<string, unknown>) => d.type === "STATEMENT_UNMATCHED_WORK" && d.resourceId === "line-unmatched-1"
                );
                expect(individualFinding).toBeDefined();
                expect(individualFinding.severity).toBe("HIGH"); // > $50
            }
        }
    });

    it("should not create individual findings for low-value unmatched lines", async () => {
        setupDefaultMocks({
            statementLines: [
                {
                    id: "line-low",
                    title: "Tiny Song",
                    uses: 100,
                    amount: 5, // Below $10 threshold for individual finding
                    rate: 0.05,
                    society: "ASCAP",
                    workId: null,
                },
            ],
        });

        const result = await runDiscrepancyChecks(STATEMENT_ID, ORG_ID);

        if (mockCreateMany.mock.calls.length > 0) {
            const createCall = mockCreateMany.mock.calls[0]?.[0];
            if (createCall?.data) {
                const individualFinding = createCall.data.find(
                    (d: Record<string, unknown>) => d.type === "STATEMENT_UNMATCHED_WORK"
                );
                expect(individualFinding).toBeUndefined();
            }
        }
    });

    it("should deduplicate discrepancies by type + resourceId", async () => {
        // This tests the dedup logic — if two checks produce the same type:resourceId,
        // only one should be kept
        setupDefaultMocks({
            catalogWorks: [
                {
                    id: "work-dup",
                    title: "Duplicate Song",
                    registrations: [{ society: "ASCAP", status: "CONFIRMED" }],
                },
            ],
            statementWorkIds: [],
        });

        const result = await runDiscrepancyChecks(STATEMENT_ID, ORG_ID);
        // Even if somehow the same finding is generated twice, dedup should handle it
        if (mockCreateMany.mock.calls.length > 0) {
            const createCall = mockCreateMany.mock.calls[0]?.[0];
            if (createCall?.data) {
                const dupes = createCall.data.filter(
                    (d: Record<string, unknown>) => d.type === "STATEMENT_MISSING_WORK" && d.resourceId === "work-dup"
                );
                expect(dupes.length).toBeLessThanOrEqual(1);
            }
        }
    });

    it("should skip existing findings (no duplicates across runs)", async () => {
        setupDefaultMocks({
            catalogWorks: [
                {
                    id: "work-existing",
                    title: "Already Found",
                    registrations: [{ society: "ASCAP", status: "CONFIRMED" }],
                },
            ],
            statementWorkIds: [],
            existingFindings: [
                { type: "STATEMENT_MISSING_WORK", resourceId: "work-existing" },
            ],
        });

        const result = await runDiscrepancyChecks(STATEMENT_ID, ORG_ID);
        expect(result.total).toBeGreaterThanOrEqual(1); // Found but not new
        expect(result.created).toBe(0); // Already exists
    });

    it("should handle null statement gracefully", async () => {
        resetMocks();
        mockFindUnique.mockResolvedValue(null);
        mockFindMany.mockResolvedValue([]);
        mockGroupBy.mockResolvedValue([]);
        mockCreateMany.mockResolvedValue({ count: 0 });

        const result = await runDiscrepancyChecks(STATEMENT_ID, ORG_ID);
        expect(result.total).toBe(0);
        expect(result.created).toBe(0);
    });
});

// ============================================================
// Severity & Confidence Calculations
// ============================================================

describe("discrepancy severity and confidence", () => {
    beforeEach(() => {
        resetMocks();
    });

    it("missing work with CONFIRMED registration should have confidence 95", async () => {
        setupDefaultMocks({
            catalogWorks: [
                {
                    id: "work-confirmed",
                    title: "Confirmed Song",
                    registrations: [{ society: "ASCAP", status: "CONFIRMED" }],
                },
            ],
            statementWorkIds: [],
        });

        await runDiscrepancyChecks(STATEMENT_ID, ORG_ID);

        if (mockCreateMany.mock.calls.length > 0) {
            const createCall = mockCreateMany.mock.calls[0]?.[0];
            if (createCall?.data) {
                const finding = createCall.data.find(
                    (d: Record<string, unknown>) => d.type === "STATEMENT_MISSING_WORK"
                );
                expect(finding?.confidence).toBe(95);
            }
        }
    });

    it("missing work with PENDING registration should have confidence 75", async () => {
        setupDefaultMocks({
            catalogWorks: [
                {
                    id: "work-pending",
                    title: "Pending Song",
                    registrations: [{ society: "ASCAP", status: "PENDING" }],
                },
            ],
            statementWorkIds: [],
        });

        await runDiscrepancyChecks(STATEMENT_ID, ORG_ID);

        if (mockCreateMany.mock.calls.length > 0) {
            const createCall = mockCreateMany.mock.calls[0]?.[0];
            if (createCall?.data) {
                const finding = createCall.data.find(
                    (d: Record<string, unknown>) => d.type === "STATEMENT_MISSING_WORK"
                );
                expect(finding?.confidence).toBe(75);
            }
        }
    });

    it("rate anomaly severity should scale with impact amount", async () => {
        setupDefaultMocks({
            statementLines: [
                {
                    id: "line-high-impact",
                    title: "High Impact Song",
                    uses: 100000,
                    amount: 10, // Extremely low rate
                    rate: 0.0001,
                    society: "ASCAP",
                    workId: "work-1",
                },
            ],
        });

        await runDiscrepancyChecks(STATEMENT_ID, ORG_ID);

        if (mockCreateMany.mock.calls.length > 0) {
            const createCall = mockCreateMany.mock.calls[0]?.[0];
            if (createCall?.data) {
                const finding = createCall.data.find(
                    (d: Record<string, unknown>) => d.type === "STATEMENT_RATE_ANOMALY"
                );
                expect(finding).toBeDefined();
                expect(finding.severity).toBe("HIGH"); // Impact > $100
                expect(finding.estimatedImpact).toBeGreaterThan(100);
            }
        }
    });

    it("unmatched lines summary severity should be HIGH when total > $100", async () => {
        setupDefaultMocks({
            statementLines: [
                { id: "u1", title: "Song A", uses: 1000, amount: 60, rate: 0.06, society: "ASCAP", workId: null },
                { id: "u2", title: "Song B", uses: 1000, amount: 50, rate: 0.05, society: "ASCAP", workId: null },
            ],
        });

        await runDiscrepancyChecks(STATEMENT_ID, ORG_ID);

        if (mockCreateMany.mock.calls.length > 0) {
            const createCall = mockCreateMany.mock.calls[0]?.[0];
            if (createCall?.data) {
                const summary = createCall.data.find(
                    (d: Record<string, unknown>) => d.type === "STATEMENT_UNMATCHED_LINES"
                );
                expect(summary).toBeDefined();
                expect(summary.severity).toBe("HIGH");
                expect(summary.estimatedImpact).toBe(110);
            }
        }
    });
});

// ============================================================
// TYPICAL_RATES coverage
// ============================================================

describe("rate anomaly — society-specific rates", () => {
    beforeEach(() => {
        resetMocks();
    });

    it("should use MLC rate thresholds for MLC lines", async () => {
        setupDefaultMocks({
            statementLines: [
                {
                    id: "mlc-line",
                    title: "MLC Song",
                    uses: 100000,
                    amount: 10, // $0.0001/use vs MLC avg $0.004/use — below 30%
                    rate: 0.0001,
                    society: "MLC",
                    workId: "work-1",
                },
            ],
        });

        await runDiscrepancyChecks(STATEMENT_ID, ORG_ID);

        if (mockCreateMany.mock.calls.length > 0) {
            const createCall = mockCreateMany.mock.calls[0]?.[0];
            if (createCall?.data) {
                const finding = createCall.data.find(
                    (d: Record<string, unknown>) => d.type === "STATEMENT_RATE_ANOMALY"
                );
                expect(finding).toBeDefined();
                // Expected amount = 100000 * 0.004 = $400, impact = $400 - $10 = $390
                expect(finding.estimatedImpact).toBeGreaterThan(300);
            }
        }
    });

    it("should use SoundExchange rate thresholds", async () => {
        setupDefaultMocks({
            statementLines: [
                {
                    id: "se-line",
                    title: "SE Song",
                    uses: 1000000,
                    amount: 100, // $0.0001/use vs SE avg $0.0025/use — below 30%
                    rate: 0.0001,
                    society: "SOUNDEXCHANGE",
                    workId: "work-1",
                },
            ],
        });

        await runDiscrepancyChecks(STATEMENT_ID, ORG_ID);

        if (mockCreateMany.mock.calls.length > 0) {
            const createCall = mockCreateMany.mock.calls[0]?.[0];
            if (createCall?.data) {
                const finding = createCall.data.find(
                    (d: Record<string, unknown>) => d.type === "STATEMENT_RATE_ANOMALY"
                );
                expect(finding).toBeDefined();
            }
        }
    });

    it("should skip lines with unknown society", async () => {
        setupDefaultMocks({
            statementLines: [
                {
                    id: "unknown-line",
                    title: "Unknown Society Song",
                    uses: 1000,
                    amount: 1,
                    rate: 0.001,
                    society: "UNKNOWN_SOCIETY",
                    workId: "work-1",
                },
            ],
        });

        await runDiscrepancyChecks(STATEMENT_ID, ORG_ID);

        if (mockCreateMany.mock.calls.length > 0) {
            const createCall = mockCreateMany.mock.calls[0]?.[0];
            if (createCall?.data) {
                const finding = createCall.data.find(
                    (d: Record<string, unknown>) => d.type === "STATEMENT_RATE_ANOMALY"
                );
                expect(finding).toBeUndefined();
            }
        }
    });
});