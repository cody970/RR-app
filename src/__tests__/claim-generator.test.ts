import { describe, it, expect } from "vitest";
import {
    generateClaim,
    generateClaimBatch,
    claimBatchToCsv,
    claimToCsv,
    type FindingInput,
    type ClaimWriter,
} from "../lib/claims/claim-generator";

// Helper to build a minimal FindingInput
function makeFinding(overrides: Partial<FindingInput> = {}): FindingInput {
    return {
        findingId: "finding-1",
        title: "Neon Lights",
        isrc: "USRC17607839",
        iswc: "T-123456789-0",
        artist: "Test Artist",
        society: "ASCAP",
        period: "2024-Q1",
        amountPaid: 80,
        amountExpected: 100,
        currency: "USD",
        useType: "PERFORMANCE",
        ...overrides,
    };
}

const writers: Omit<ClaimWriter, "claimedAmount" | "currency">[] = [
    { writerId: "w1", name: "Alice", ipi: "00000000001", splitPercent: 60 },
    { writerId: "w2", name: "Bob", ipi: "00000000002", splitPercent: 40 },
];

// ---------- generateClaim ----------

describe("generateClaim", () => {
    it("should calculate claimedAmount as amountExpected - amountPaid", () => {
        const claim = generateClaim(makeFinding(), "org-1", "Acme Music");
        expect(claim.claimedAmount).toBe(20); // 100 - 80
    });

    it("should not produce a negative claimedAmount when amountPaid >= amountExpected", () => {
        const finding = makeFinding({ amountPaid: 120, amountExpected: 100 });
        const claim = generateClaim(finding, "org-1", "Acme Music");
        expect(claim.claimedAmount).toBe(0);
    });

    it("should set status to DRAFT", () => {
        const claim = generateClaim(makeFinding(), "org-1", "Acme Music");
        expect(claim.status).toBe("DRAFT");
    });

    it("should derive claimType from society", () => {
        const ascapClaim = generateClaim(makeFinding({ society: "ASCAP" }), "org-1", "Acme");
        expect(ascapClaim.claimType).toBe("PERFORMANCE");

        const mlcClaim = generateClaim(makeFinding({ society: "MLC" }), "org-1", "Acme");
        expect(mlcClaim.claimType).toBe("MECHANICAL");

        const seClaim = generateClaim(makeFinding({ society: "SOUNDEXCHANGE" }), "org-1", "Acme");
        expect(seClaim.claimType).toBe("DIGITAL_AUDIO");
    });

    it("should distribute claimedAmount across writers proportionally", () => {
        const claim = generateClaim(makeFinding(), "org-1", "Acme Music", writers);
        // claimedAmount = 20; Alice 60% = 12, Bob 40% = 8
        const alice = claim.writers.find(w => w.writerId === "w1")!;
        const bob = claim.writers.find(w => w.writerId === "w2")!;
        expect(alice.claimedAmount).toBeCloseTo(12, 4);
        expect(bob.claimedAmount).toBeCloseTo(8, 4);
    });

    it("should preserve writer total equal to claimedAmount", () => {
        const claim = generateClaim(makeFinding(), "org-1", "Acme Music", writers);
        const total = claim.writers.reduce((s, w) => s + w.claimedAmount, 0);
        expect(total).toBeCloseTo(claim.claimedAmount, 4);
    });

    it("should populate narrative with org name and society", () => {
        const claim = generateClaim(makeFinding(), "org-1", "Acme Music");
        expect(claim.narrative).toContain("Acme Music");
        expect(claim.narrative).toContain("ASCAP");
    });

    it("should include ISRC in the narrative", () => {
        const claim = generateClaim(makeFinding(), "org-1", "Acme Music");
        expect(claim.narrative).toContain("USRC17607839");
    });

    it("should carry through work metadata fields", () => {
        const finding = makeFinding();
        const claim = generateClaim(finding, "org-1", "Acme Music");
        expect(claim.title).toBe("Neon Lights");
        expect(claim.isrc).toBe("USRC17607839");
        expect(claim.iswc).toBe("T-123456789-0");
        expect(claim.artist).toBe("Test Artist");
        expect(claim.period).toBe("2024-Q1");
    });

    it("should use the provided claimId if supplied", () => {
        const claim = generateClaim(makeFinding(), "org-1", "Acme Music", [], "custom-id-123");
        expect(claim.claimId).toBe("custom-id-123");
    });
});

// ---------- generateClaimBatch ----------

describe("generateClaimBatch", () => {
    const findings: FindingInput[] = [
        makeFinding({ findingId: "f-1", title: "Song A", society: "BMI", amountPaid: 50, amountExpected: 100 }),
        makeFinding({ findingId: "f-2", title: "Song B", society: "BMI", amountPaid: 30, amountExpected: 60 }),
        makeFinding({ findingId: "f-3", title: "Song C", society: "ASCAP", amountPaid: 10, amountExpected: 20 }),
    ];

    it("should include only findings matching the targetSociety", () => {
        const { batch, skipped } = generateClaimBatch(findings, "BMI", "org-1", "Acme Music");
        expect(batch.claims).toHaveLength(2);
        expect(skipped).toHaveLength(1);
        expect(skipped[0].findingId).toBe("f-3");
    });

    it("should sum totalClaimed correctly", () => {
        const { batch } = generateClaimBatch(findings, "BMI", "org-1", "Acme Music");
        // Song A: 50, Song B: 30
        expect(batch.totalClaimed).toBeCloseTo(80, 4);
    });

    it("should skip findings with a different currency", () => {
        const mixedFindings: FindingInput[] = [
            makeFinding({ findingId: "f-1", society: "BMI", currency: "USD" }),
            makeFinding({ findingId: "f-2", society: "BMI", currency: "GBP" }),
        ];
        const { batch, skipped } = generateClaimBatch(mixedFindings, "BMI", "org-1", "Acme");
        expect(batch.claims).toHaveLength(1);
        expect(skipped).toHaveLength(1);
        expect(skipped[0].reason).toContain("Currency mismatch");
    });

    it("should produce an empty batch when no findings match", () => {
        const { batch, skipped } = generateClaimBatch(findings, "GEMA", "org-1", "Acme Music");
        expect(batch.claims).toHaveLength(0);
        expect(skipped).toHaveLength(3);
    });

    it("should use the provided batchId if supplied", () => {
        const { batch } = generateClaimBatch(findings, "BMI", "org-1", "Acme", "batch-xyz");
        expect(batch.batchId).toBe("batch-xyz");
    });
});

// ---------- CSV Export ----------

describe("claimBatchToCsv", () => {
    it("should produce a CSV with a header row and one data row per claim", () => {
        const { batch } = generateClaimBatch(
            [makeFinding({ findingId: "f-1", society: "ASCAP" })],
            "ASCAP",
            "org-1",
            "Acme Music"
        );
        const csv = claimBatchToCsv(batch);
        const lines = csv.split("\n");
        // header + 1 data row
        expect(lines).toHaveLength(2);
        expect(lines[0]).toContain("ClaimId");
        expect(lines[0]).toContain("ClaimedAmount");
    });

    it("should include ClaimedAmount formatted to 4 decimal places", () => {
        const finding = makeFinding({ amountPaid: 0, amountExpected: 20.5, society: "ASCAP" });
        const { batch } = generateClaimBatch([finding], "ASCAP", "org-1", "Acme");
        const csv = claimBatchToCsv(batch);
        expect(csv).toContain("20.5000");
    });

    it("should escape titles containing commas", () => {
        const finding = makeFinding({ title: "Hello, World", society: "ASCAP" });
        const { batch } = generateClaimBatch([finding], "ASCAP", "org-1", "Acme");
        const csv = claimBatchToCsv(batch);
        expect(csv).toContain('"Hello, World"');
    });

    it("should escape titles containing double quotes", () => {
        const finding = makeFinding({ title: 'Say "Something"', society: "ASCAP" });
        const { batch } = generateClaimBatch([finding], "ASCAP", "org-1", "Acme");
        const csv = claimBatchToCsv(batch);
        expect(csv).toContain('"Say ""Something"""');
    });
});

describe("claimToCsv", () => {
    it("should produce a two-line CSV (header + data) for a single claim", () => {
        const claim = generateClaim(makeFinding(), "org-1", "Acme Music");
        const csv = claimToCsv(claim);
        const lines = csv.split("\n");
        expect(lines).toHaveLength(2);
        expect(lines[1]).toContain("ASCAP");
    });
});
