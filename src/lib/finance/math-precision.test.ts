import { describe, it, expect } from "vitest";
import { round, roundMoney, sum, calculateShare, effectivelyEqual } from "./math-utils";

describe("Math Precision", () => {
    describe("round", () => {
        it("should round to specified decimal places", () => {
            expect(round(1.234567, 4)).toBe(1.2346);
            expect(round(1.234567, 2)).toBe(1.23);
            expect(round(1.235, 0)).toBe(1);
        });

        it("should handle negative numbers", () => {
            expect(round(-1.234567, 4)).toBe(-1.2346);
        });

        it("should handle zero", () => {
            expect(round(0, 4)).toBe(0);
        });
    });

    describe("roundMoney", () => {
        it("should round to 2 decimal places for money", () => {
            expect(roundMoney(1.235)).toBe(1.24);
            expect(roundMoney(1.234)).toBe(1.23);
        });

        it("should handle edge cases", () => {
            expect(roundMoney(1.005)).toBe(1.01);
            expect(roundMoney(0.999)).toBe(1.00);
        });
    });

    describe("sum", () => {
        it("should sum values correctly", () => {
            expect(sum([0.1, 0.2, 0.3])).toBeCloseTo(0.6);
            expect(sum([1, 2, 3])).toBe(6);
        });

        it("should handle floating point precision", () => {
            const result = sum([0.1, 0.2]);
            expect(effectivelyEqual(result, 0.3)).toBe(true);
        });

        it("should handle empty array", () => {
            expect(sum([])).toBe(0);
        });
    });

    describe("calculateShare", () => {
        it("should calculate share correctly", () => {
            expect(calculateShare(100, 50)).toBe(50);
            expect(calculateShare(100, 33.3333)).toBeCloseTo(33.3333);
        });

        it("should handle dust distribution", () => {
            const share1 = calculateShare(100, 33.3333);
            const share2 = calculateShare(100, 33.3333);
            const share3 = calculateShare(100, 33.3334);
            const total = sum([share1, share2, share3]);
            expect(effectivelyEqual(total, 100)).toBe(true);
        });
    });

    describe("effectivelyEqual", () => {
        it("should determine if numbers are effectively equal", () => {
            expect(effectivelyEqual(0.1 + 0.2, 0.3)).toBe(true);
            expect(effectivelyEqual(1, 1)).toBe(true);
            expect(effectivelyEqual(1.000001, 1)).toBe(true);
        });

        it("should return false for significantly different numbers", () => {
            expect(effectivelyEqual(1, 2)).toBe(false);
            expect(effectivelyEqual(0.1, 0.2)).toBe(false);
        });
    });
});