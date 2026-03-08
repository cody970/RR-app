import { describe, it, expect } from "vitest";
import {
    validateCollaboratorSplits,
    distributeSplits,
    applyStatementSplits,
    calculateTotalDust,
    type Collaborator,
} from "../lib/finance/split-sheets";
import type { ParsedStatementLine } from "../lib/finance/statement-parser";

// Helper to build minimal ParsedStatementLine objects for testing
function makeLine(
    title: string,
    amount: number,
    currency = "USD",
    isrc?: string
): ParsedStatementLine {
    return {
        title,
        amount,
        currency,
        uses: 1,
        society: "ASCAP",
        isrc,
    };
}

const twoWriters: Collaborator[] = [
    { id: "w1", name: "Alice", splitPercent: 50 },
    { id: "w2", name: "Bob", splitPercent: 50 },
];

const threeWriters: Collaborator[] = [
    { id: "w1", name: "Alice", splitPercent: 33.33 },
    { id: "w2", name: "Bob", splitPercent: 33.33 },
    { id: "w3", name: "Carol", splitPercent: 33.34 },
];

// ---------- validateCollaboratorSplits ----------

describe("validateCollaboratorSplits", () => {
    it("should return null for a valid 50/50 split", () => {
        expect(validateCollaboratorSplits(twoWriters)).toBeNull();
    });

    it("should return null for a valid 33.33/33.33/33.34 split", () => {
        expect(validateCollaboratorSplits(threeWriters)).toBeNull();
    });

    it("should return an error when splits do not sum to 100", () => {
        const bad: Collaborator[] = [
            { id: "w1", name: "Alice", splitPercent: 40 },
            { id: "w2", name: "Bob", splitPercent: 40 },
        ];
        expect(validateCollaboratorSplits(bad)).not.toBeNull();
    });

    it("should return an error for an empty collaborator list", () => {
        expect(validateCollaboratorSplits([])).not.toBeNull();
    });

    it("should return an error for a negative split percentage", () => {
        const bad: Collaborator[] = [
            { id: "w1", name: "Alice", splitPercent: -10 },
            { id: "w2", name: "Bob", splitPercent: 110 },
        ];
        expect(validateCollaboratorSplits(bad)).not.toBeNull();
    });

    it("should return an error for splits exceeding 100 each", () => {
        const bad: Collaborator[] = [
            { id: "w1", name: "Alice", splitPercent: 60 },
            { id: "w2", name: "Bob", splitPercent: 60 },
        ];
        expect(validateCollaboratorSplits(bad)).not.toBeNull();
    });
});

// ---------- distributeSplits ----------

describe("distributeSplits", () => {
    it("should split $1000 evenly between two 50% writers", () => {
        const result = distributeSplits(1000, "USD", twoWriters);
        expect(result.totalAmount).toBe(1000);
        expect(result.allocations).toHaveLength(2);
        expect(result.allocations[0].amount).toBe(500);
        expect(result.allocations[1].amount).toBe(500);
        expect(result.dustAmount).toBe(0);
    });

    it("should handle a 70/30 split correctly", () => {
        const writers: Collaborator[] = [
            { id: "w1", name: "Alice", splitPercent: 70 },
            { id: "w2", name: "Bob", splitPercent: 30 },
        ];
        const result = distributeSplits(1000, "USD", writers);
        expect(result.allocations[0].amount).toBe(700);
        expect(result.allocations[1].amount).toBe(300);
    });

    it("should preserve total across three writers with rounding dust in last writer", () => {
        const result = distributeSplits(100, "USD", threeWriters);
        const total = result.allocations.reduce((s, a) => s + a.amount, 0);
        expect(total).toBeCloseTo(100, 4);
    });

    it("should handle a zero amount gracefully", () => {
        const result = distributeSplits(0, "USD", twoWriters);
        expect(result.totalAmount).toBe(0);
        result.allocations.forEach(a => expect(a.amount).toBe(0));
        expect(result.dustAmount).toBe(0);
    });

    it("should return empty allocations when no collaborators are given", () => {
        const result = distributeSplits(500, "USD", []);
        expect(result.allocations).toHaveLength(0);
    });

    it("should propagate the correct currency to all allocations", () => {
        const result = distributeSplits(200, "GBP", twoWriters);
        result.allocations.forEach(a => expect(a.currency).toBe("GBP"));
    });

    it("should populate collaborator name on each allocation", () => {
        const result = distributeSplits(100, "USD", twoWriters);
        expect(result.allocations[0].collaboratorName).toBe("Alice");
        expect(result.allocations[1].collaboratorName).toBe("Bob");
    });

    it("should handle a single 100% writer", () => {
        const single: Collaborator[] = [{ id: "w1", name: "Solo", splitPercent: 100 }];
        const result = distributeSplits(333.33, "USD", single);
        expect(result.allocations[0].amount).toBe(333.33);
        expect(result.dustAmount).toBe(0);
    });
});

// ---------- applyStatementSplits ----------

describe("applyStatementSplits", () => {
    it("should aggregate allocations across all statement lines", () => {
        const lines = [
            makeLine("Song A", 200, "USD"),
            makeLine("Song B", 300, "USD"),
        ];
        const summaries = applyStatementSplits(lines, "2024-Q1", "ASCAP", twoWriters);

        expect(summaries).toHaveLength(2);
        const alice = summaries.find(s => s.collaboratorId === "w1")!;
        const bob = summaries.find(s => s.collaboratorId === "w2")!;

        expect(alice.totalAllocated).toBe(250); // 50% of 500
        expect(bob.totalAllocated).toBe(250);
        expect(alice.lineCount).toBe(2);
    });

    it("should include lineTitle and lineIsrc on each allocation entry", () => {
        const lines = [makeLine("Song A", 100, "USD", "USRC17607839")];
        const summaries = applyStatementSplits(lines, "2024-Q1", "ASCAP", twoWriters);
        const alice = summaries[0];
        expect(alice.allocations[0].lineTitle).toBe("Song A");
        expect(alice.allocations[0].lineIsrc).toBe("USRC17607839");
    });

    it("should return correct period and source on summaries", () => {
        const summaries = applyStatementSplits(
            [makeLine("Song A", 100)],
            "2024-Q3",
            "BMI",
            twoWriters
        );
        summaries.forEach(s => {
            expect(s.period).toBe("2024-Q3");
            expect(s.source).toBe("BMI");
        });
    });

    it("should handle an empty lines array returning zero totals", () => {
        const summaries = applyStatementSplits([], "2024-Q1", "ASCAP", twoWriters);
        summaries.forEach(s => {
            expect(s.totalAllocated).toBe(0);
            expect(s.lineCount).toBe(0);
        });
    });
});

// ---------- calculateTotalDust ----------

describe("calculateTotalDust", () => {
    it("should return zero dust for evenly divisible amounts", () => {
        const lines = [makeLine("Song A", 1000), makeLine("Song B", 200)];
        const dust = calculateTotalDust(lines, twoWriters);
        expect(dust).toBe(0);
    });

    it("should return near-zero dust for three writers on small amounts", () => {
        const lines = [makeLine("Song A", 0.01), makeLine("Song B", 0.01)];
        const dust = calculateTotalDust(lines, threeWriters);
        expect(Math.abs(dust)).toBeLessThan(0.001);
    });
});
