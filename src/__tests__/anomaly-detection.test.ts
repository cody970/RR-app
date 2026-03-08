import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Anomaly Detection Tests
 *
 * Tests detectStatementAnomalies, calculateHistoricalAverage,
 * and detectOrgLevelAnomalies.
 * Uses Prisma mocking to isolate business logic from the database.
 */

// ---------- Mock Prisma ----------

const mockFindUnique = vi.fn();
const mockFindMany = vi.fn();

vi.mock("@/lib/infra/db", () => ({
    db: {
        statement: {
            findUnique: (...args: unknown[]) => mockFindUnique(...args),
        },
        royaltyPeriod: {
            findMany: (...args: unknown[]) => mockFindMany(...args),
        },
    },
}));

// Import after mocking
import {
    detectStatementAnomalies,
    calculateHistoricalAverage,
    detectOrgLevelAnomalies,
    type AnomalyResult,
} from "../lib/finance/anomaly-detection";

// ---------- Constants ----------

const ORG_ID = "org-test-123";
const STATEMENT_ID = "stmt-test-789";
const WORK_ID = "work-test-001";
const SOCIETY = "ASCAP";
const PERIOD = "2024-Q3";

function resetMocks() {
    mockFindUnique.mockReset();
    mockFindMany.mockReset();
}

// ---------- calculateHistoricalAverage ----------

describe("calculateHistoricalAverage", () => {
    beforeEach(resetMocks);

    it("returns null when there are fewer periods than minSampleSize", async () => {
        mockFindMany.mockResolvedValue([{ totalAmount: 100 }, { totalAmount: 120 }]);

        const result = await calculateHistoricalAverage(ORG_ID, WORK_ID, SOCIETY, PERIOD, 3);
        expect(result).toBeNull();
    });

    it("returns the mean of historical amounts", async () => {
        mockFindMany.mockResolvedValue([
            { totalAmount: 100 },
            { totalAmount: 200 },
            { totalAmount: 150 },
        ]);

        const result = await calculateHistoricalAverage(ORG_ID, WORK_ID, SOCIETY, PERIOD, 3);
        expect(result).not.toBeNull();
        expect(result!.average).toBe(150); // (100 + 200 + 150) / 3
        expect(result!.sampleSize).toBe(3);
    });

    it("excludes the current period from the query", async () => {
        mockFindMany.mockResolvedValue([
            { totalAmount: 80 },
            { totalAmount: 100 },
            { totalAmount: 90 },
        ]);

        await calculateHistoricalAverage(ORG_ID, WORK_ID, SOCIETY, PERIOD, 3);

        const callArgs = mockFindMany.mock.calls[0]?.[0];
        expect(callArgs?.where?.period).toEqual({ not: PERIOD });
    });

    it("uses at most 12 prior periods", async () => {
        // Return 15 periods — only 12 should be used
        const manyPeriods = Array.from({ length: 15 }, (_, i) => ({ totalAmount: i * 10 + 10 }));
        mockFindMany.mockResolvedValue(manyPeriods.slice(0, 12));

        const callCapture = vi.fn().mockImplementation((args) => {
            expect(args?.take).toBe(12);
            return Promise.resolve(manyPeriods.slice(0, 12));
        });
        mockFindMany.mockImplementation(callCapture);

        await calculateHistoricalAverage(ORG_ID, WORK_ID, SOCIETY, PERIOD, 3);
        expect(callCapture).toHaveBeenCalled();
    });

    it("handles Decimal-like objects by converting via Number()", async () => {
        // Prisma Decimal fields come back as objects with a toString
        mockFindMany.mockResolvedValue([
            { totalAmount: { toString: () => "120.5000", valueOf: () => 120.5 } },
            { totalAmount: { toString: () => "100.5000", valueOf: () => 100.5 } },
            { totalAmount: { toString: () => "110.0000", valueOf: () => 110.0 } },
        ]);

        // Number() coercion via valueOf should work
        const result = await calculateHistoricalAverage(ORG_ID, WORK_ID, SOCIETY, PERIOD, 3);
        expect(result).not.toBeNull();
        // (120.5 + 100.5 + 110) / 3 = 110.333...
        expect(result!.average).toBeCloseTo(110.33, 1);
        expect(result!.sampleSize).toBe(3);
    });
});

// ---------- detectStatementAnomalies ----------

describe("detectStatementAnomalies", () => {
    beforeEach(resetMocks);

    it("returns empty array when statement is not found", async () => {
        mockFindUnique.mockResolvedValue(null);

        const result = await detectStatementAnomalies(STATEMENT_ID, ORG_ID);
        expect(result).toEqual([]);
    });

    it("returns empty array when no RoyaltyPeriod rows exist for the period", async () => {
        mockFindUnique.mockResolvedValue({ period: PERIOD, source: SOCIETY });
        mockFindMany.mockResolvedValue([]);

        const result = await detectStatementAnomalies(STATEMENT_ID, ORG_ID);
        expect(result).toEqual([]);
    });

    it("returns empty array when history is insufficient (< minSampleSize)", async () => {
        mockFindUnique.mockResolvedValue({ period: PERIOD, source: SOCIETY });

        // First findMany → currentPeriods
        // Subsequent findManys → historical (only 2 rows, below default minSampleSize of 3)
        mockFindMany
            .mockResolvedValueOnce([{ workId: WORK_ID, society: SOCIETY, period: PERIOD, totalAmount: 50 }])
            .mockResolvedValue([{ totalAmount: 100 }, { totalAmount: 120 }]); // 2 rows < 3

        const result = await detectStatementAnomalies(STATEMENT_ID, ORG_ID);
        expect(result).toEqual([]);
    });

    it("flags a work that is significantly below its historical average", async () => {
        mockFindUnique.mockResolvedValue({ period: PERIOD, source: SOCIETY });

        mockFindMany
            .mockResolvedValueOnce([
                { workId: WORK_ID, society: SOCIETY, period: PERIOD, totalAmount: 30 },
            ])
            .mockResolvedValue([
                { totalAmount: 100 },
                { totalAmount: 120 },
                { totalAmount: 110 },
            ]); // avg = 110 → 30 is ~73% below

        const result = await detectStatementAnomalies(STATEMENT_ID, ORG_ID);

        expect(result).toHaveLength(1);
        const anomaly = result[0] as AnomalyResult;
        expect(anomaly.resourceId).toBe(WORK_ID);
        expect(anomaly.actualAmount).toBe(30);
        expect(anomaly.historicalAverage).toBe(110);
        expect(anomaly.deviationPercent).toBeLessThan(-25);
        expect(anomaly.estimatedShortfall).toBeGreaterThan(0);
        expect(anomaly.severity).toBe("HIGH"); // > 50% below
        expect(anomaly.description).toContain(PERIOD);
        expect(anomaly.description).toContain("$30.00");
    });

    it("does not flag a work within the normal threshold", async () => {
        mockFindUnique.mockResolvedValue({ period: PERIOD, source: SOCIETY });

        mockFindMany
            .mockResolvedValueOnce([
                { workId: WORK_ID, society: SOCIETY, period: PERIOD, totalAmount: 90 },
            ])
            .mockResolvedValue([
                { totalAmount: 100 },
                { totalAmount: 105 },
                { totalAmount: 95 },
            ]); // avg = 100 → 90 is only 10% below (< 25% threshold)

        const result = await detectStatementAnomalies(STATEMENT_ID, ORG_ID);
        expect(result).toEqual([]);
    });

    it("respects a custom thresholdPercent option", async () => {
        mockFindUnique.mockResolvedValue({ period: PERIOD, source: SOCIETY });

        mockFindMany
            .mockResolvedValueOnce([
                { workId: WORK_ID, society: SOCIETY, period: PERIOD, totalAmount: 85 },
            ])
            .mockResolvedValue([
                { totalAmount: 100 },
                { totalAmount: 100 },
                { totalAmount: 100 },
            ]); // avg = 100 → 85 is 15% below

        // With default threshold (25%) — should NOT flag
        const defaultResult = await detectStatementAnomalies(STATEMENT_ID, ORG_ID);
        expect(defaultResult).toEqual([]);

        // Reset
        mockFindUnique.mockResolvedValue({ period: PERIOD, source: SOCIETY });
        mockFindMany
            .mockResolvedValueOnce([
                { workId: WORK_ID, society: SOCIETY, period: PERIOD, totalAmount: 85 },
            ])
            .mockResolvedValue([
                { totalAmount: 100 },
                { totalAmount: 100 },
                { totalAmount: 100 },
            ]);

        // With tighter threshold (10%) — should flag
        const strictResult = await detectStatementAnomalies(STATEMENT_ID, ORG_ID, { thresholdPercent: 10 });
        expect(strictResult).toHaveLength(1);
    });

    it("filters out anomalies below the minShortfall amount", async () => {
        mockFindUnique.mockResolvedValue({ period: PERIOD, source: SOCIETY });

        // avg = 10, actual = 1 → 90% drop but shortfall is only $9, below default $5 min
        mockFindMany
            .mockResolvedValueOnce([
                { workId: WORK_ID, society: SOCIETY, period: PERIOD, totalAmount: 1 },
            ])
            .mockResolvedValue([
                { totalAmount: 10 },
                { totalAmount: 10 },
                { totalAmount: 10 },
            ]);

        const result = await detectStatementAnomalies(STATEMENT_ID, ORG_ID, { minShortfall: 10 });
        expect(result).toEqual([]);
    });

    it("returns results sorted by estimated shortfall descending", async () => {
        mockFindUnique.mockResolvedValue({ period: PERIOD, source: SOCIETY });

        mockFindMany
            .mockResolvedValueOnce([
                { workId: "work-small", society: SOCIETY, period: PERIOD, totalAmount: 20 },
                { workId: "work-large", society: SOCIETY, period: PERIOD, totalAmount: 5 },
            ])
            // historical for work-small: avg 100 → shortfall 80
            .mockResolvedValueOnce([{ totalAmount: 100 }, { totalAmount: 100 }, { totalAmount: 100 }])
            // historical for work-large: avg 200 → shortfall 195
            .mockResolvedValueOnce([{ totalAmount: 200 }, { totalAmount: 200 }, { totalAmount: 200 }]);

        const result = await detectStatementAnomalies(STATEMENT_ID, ORG_ID);

        // work-large should come first (shortfall 195 > 80)
        expect(result[0]?.resourceId).toBe("work-large");
        expect(result[1]?.resourceId).toBe("work-small");
    });
});

// ---------- detectOrgLevelAnomalies ----------

describe("detectOrgLevelAnomalies", () => {
    beforeEach(resetMocks);

    it("returns empty array when no org-level royalty periods exist", async () => {
        mockFindMany.mockResolvedValue([]);

        const result = await detectOrgLevelAnomalies(ORG_ID, PERIOD);
        expect(result).toEqual([]);
    });

    it("flags an org-level period that is below threshold", async () => {
        mockFindMany
            .mockResolvedValueOnce([{ society: SOCIETY, totalAmount: 200 }]) // current
            .mockResolvedValue([
                { totalAmount: 1000 },
                { totalAmount: 1100 },
                { totalAmount: 900 },
            ]); // historical avg = 1000

        const result = await detectOrgLevelAnomalies(ORG_ID, PERIOD);

        expect(result).toHaveLength(1);
        const anomaly = result[0] as AnomalyResult;
        expect(anomaly.resourceId).toBe("ORG_TOTAL");
        expect(anomaly.resourceType).toBe("OrgTotal");
        expect(anomaly.society).toBe(SOCIETY);
        expect(anomaly.severity).toBe("HIGH"); // ~80% below
        expect(anomaly.estimatedShortfall).toBeGreaterThan(0);
    });

    it("does not flag when org totals are within normal range", async () => {
        mockFindMany
            .mockResolvedValueOnce([{ society: SOCIETY, totalAmount: 950 }])
            .mockResolvedValue([
                { totalAmount: 1000 },
                { totalAmount: 1000 },
                { totalAmount: 1000 },
            ]); // avg = 1000, 950 is 5% below → within threshold

        const result = await detectOrgLevelAnomalies(ORG_ID, PERIOD);
        expect(result).toEqual([]);
    });
});
