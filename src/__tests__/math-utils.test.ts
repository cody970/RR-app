import { describe, it, expect } from "vitest";
import {
    round,
    roundMoney,
    sum,
    calculateShare,
    effectivelyEqual,
    linearRegression,
    forecastNextPeriods,
    movingAverage,
    growthRates,
} from "../lib/finance/math-utils";

// ---------- round ----------

describe("round", () => {
    it("should round to 4 decimal places by default", () => {
        expect(round(1.23456789)).toBe(1.2346);
    });

    it("should round to specified decimal places", () => {
        expect(round(1.23456789, 2)).toBe(1.23);
        expect(round(1.23456789, 6)).toBe(1.234568);
        expect(round(1.23456789, 0)).toBe(1);
    });

    it("should handle negative numbers", () => {
        expect(round(-1.23456789, 2)).toBe(-1.23);
    });

    it("should handle zero", () => {
        expect(round(0, 2)).toBe(0);
    });

    it("should handle edge case with 0.1 + 0.2", () => {
        // Classic floating point issue
        const result = round(0.1 + 0.2, 2);
        expect(result).toBe(0.3);
    });

    it("should handle very small numbers", () => {
        expect(round(0.000001, 6)).toBe(0.000001);
        expect(round(0.000001, 4)).toBe(0);
    });
});

// ---------- roundMoney ----------

describe("roundMoney", () => {
    it("should round to 2 decimal places", () => {
        expect(roundMoney(1.234)).toBe(1.23);
        expect(roundMoney(1.235)).toBe(1.24);
        expect(roundMoney(1.999)).toBe(2);
    });

    it("should handle typical royalty amounts", () => {
        expect(roundMoney(0.003)).toBe(0);
        expect(roundMoney(0.005)).toBe(0.01);
        expect(roundMoney(1234.567)).toBe(1234.57);
    });

    it("should handle zero", () => {
        expect(roundMoney(0)).toBe(0);
    });

    it("should handle negative amounts", () => {
        expect(roundMoney(-5.678)).toBe(-5.68);
    });
});

// ---------- sum ----------

describe("sum", () => {
    it("should sum an array of numbers", () => {
        expect(sum([1, 2, 3, 4, 5])).toBe(15);
    });

    it("should handle empty array", () => {
        expect(sum([])).toBe(0);
    });

    it("should handle floating point precision", () => {
        // 0.1 + 0.2 + 0.3 should be 0.6, not 0.6000000000000001
        const result = sum([0.1, 0.2, 0.3]);
        expect(result).toBeCloseTo(0.6, 6);
    });

    it("should handle single element", () => {
        expect(sum([42])).toBe(42);
    });

    it("should handle negative numbers", () => {
        expect(sum([10, -3, 5, -2])).toBe(10);
    });
});

// ---------- calculateShare ----------

describe("calculateShare", () => {
    it("should calculate percentage share", () => {
        expect(calculateShare(1000, 50)).toBe(500);
        expect(calculateShare(1000, 33.33)).toBeCloseTo(333.3, 1);
    });

    it("should handle 100%", () => {
        expect(calculateShare(1000, 100)).toBe(1000);
    });

    it("should handle 0%", () => {
        expect(calculateShare(1000, 0)).toBe(0);
    });

    it("should handle small percentages", () => {
        const result = calculateShare(1000, 0.01);
        expect(result).toBeCloseTo(0.1, 4);
    });
});

// ---------- effectivelyEqual ----------

describe("effectivelyEqual", () => {
    it("should return true for identical numbers", () => {
        expect(effectivelyEqual(1.0, 1.0)).toBe(true);
    });

    it("should return true for numbers within epsilon", () => {
        expect(effectivelyEqual(1.00001, 1.00002)).toBe(true);
    });

    it("should return false for numbers outside epsilon", () => {
        expect(effectivelyEqual(1.0, 1.001)).toBe(false);
    });

    it("should handle custom epsilon", () => {
        expect(effectivelyEqual(1.0, 1.01, 0.1)).toBe(true);
        expect(effectivelyEqual(1.0, 1.01, 0.001)).toBe(false);
    });

    it("should handle floating point comparison", () => {
        // 0.1 + 0.2 vs 0.3
        expect(effectivelyEqual(0.1 + 0.2, 0.3)).toBe(true);
    });

    it("should handle zero comparison", () => {
        expect(effectivelyEqual(0, 0)).toBe(true);
        expect(effectivelyEqual(0, 0.00001)).toBe(true);
    });
});

// ---------- linearRegression ----------

describe("linearRegression", () => {
    it("should compute perfect positive linear fit", () => {
        const points = [
            { x: 1, y: 2 },
            { x: 2, y: 4 },
            { x: 3, y: 6 },
            { x: 4, y: 8 },
        ];
        const result = linearRegression(points);
        expect(result.slope).toBe(2);
        expect(result.intercept).toBe(0);
        expect(result.rSquared).toBe(1);
        expect(result.predict(5)).toBe(10);
    });

    it("should compute perfect negative linear fit", () => {
        const points = [
            { x: 1, y: 10 },
            { x: 2, y: 8 },
            { x: 3, y: 6 },
            { x: 4, y: 4 },
        ];
        const result = linearRegression(points);
        expect(result.slope).toBe(-2);
        expect(result.intercept).toBe(12);
        expect(result.rSquared).toBe(1);
    });

    it("should handle noisy data", () => {
        const points = [
            { x: 1, y: 100 },
            { x: 2, y: 150 },
            { x: 3, y: 120 },
            { x: 4, y: 200 },
        ];
        const result = linearRegression(points);
        expect(result.slope).toBeGreaterThan(0);
        expect(result.rSquared).toBeGreaterThan(0);
        expect(result.rSquared).toBeLessThanOrEqual(1);
    });

    it("should handle single point", () => {
        const result = linearRegression([{ x: 1, y: 5 }]);
        expect(result.slope).toBe(0);
        expect(result.intercept).toBe(5);
        expect(result.predict(10)).toBe(5);
    });

    it("should handle empty data", () => {
        const result = linearRegression([]);
        expect(result.slope).toBe(0);
        expect(result.intercept).toBe(0);
        expect(result.predict(1)).toBe(0);
    });

    it("should handle flat data", () => {
        const points = [
            { x: 1, y: 5 },
            { x: 2, y: 5 },
            { x: 3, y: 5 },
        ];
        const result = linearRegression(points);
        expect(result.slope).toBe(0);
        expect(result.intercept).toBe(5);
        expect(result.predict(100)).toBe(5);
    });

    it("should handle vertical data (same x values)", () => {
        const points = [
            { x: 5, y: 10 },
            { x: 5, y: 20 },
            { x: 5, y: 30 },
        ];
        const result = linearRegression(points);
        // When denominator is 0 (all x values same), should return average y
        expect(result.slope).toBe(0);
        expect(result.intercept).toBe(20); // Average of 10, 20, 30
        expect(result.rSquared).toBe(0);
        expect(result.predict(5)).toBe(20);
    });
});

// ---------- forecastNextPeriods ----------

describe("forecastNextPeriods", () => {
    it("should forecast 2 periods ahead by default", () => {
        const data = [
            { x: 0, y: 100 },
            { x: 1, y: 200 },
            { x: 2, y: 300 },
        ];
        const { forecasts } = forecastNextPeriods(data);
        expect(forecasts).toHaveLength(2);
        expect(forecasts[0].x).toBe(3);
        expect(forecasts[1].x).toBe(4);
        expect(forecasts[0].y).toBe(400);
        expect(forecasts[1].y).toBe(500);
    });

    it("should forecast custom number of periods", () => {
        const data = [
            { x: 0, y: 100 },
            { x: 1, y: 200 },
        ];
        const { forecasts } = forecastNextPeriods(data, 5);
        expect(forecasts).toHaveLength(5);
    });

    it("should not return negative forecasts", () => {
        const data = [
            { x: 0, y: 100 },
            { x: 1, y: 50 },
            { x: 2, y: 10 },
        ];
        const { forecasts } = forecastNextPeriods(data, 5);
        for (const f of forecasts) {
            expect(f.y).toBeGreaterThanOrEqual(0);
        }
    });

    it("should handle empty data", () => {
        const { forecasts } = forecastNextPeriods([]);
        expect(forecasts).toHaveLength(0);
    });
});

// ---------- movingAverage ----------

describe("movingAverage", () => {
    it("should compute 3-period moving average", () => {
        const result = movingAverage([10, 20, 30, 40, 50], 3);
        expect(result).toHaveLength(5);
        expect(result[0]).toBe(10);      // only 1 value
        expect(result[1]).toBe(15);      // avg(10, 20)
        expect(result[2]).toBe(20);      // avg(10, 20, 30)
        expect(result[3]).toBe(30);      // avg(20, 30, 40)
        expect(result[4]).toBe(40);      // avg(30, 40, 50)
    });

    it("should handle window size of 1", () => {
        const result = movingAverage([10, 20, 30], 1);
        expect(result).toEqual([10, 20, 30]);
    });

    it("should handle empty array", () => {
        expect(movingAverage([])).toEqual([]);
    });

    it("should handle window larger than data", () => {
        const result = movingAverage([10, 20], 5);
        expect(result).toHaveLength(2);
    });
});

// ---------- growthRates ----------

describe("growthRates", () => {
    it("should calculate period-over-period growth", () => {
        const result = growthRates([100, 150, 120]);
        expect(result).toHaveLength(2);
        expect(result[0]).toBe(50);    // 50% growth
        expect(result[1]).toBe(-20);   // -20% decline
    });

    it("should handle zero base value with positive growth", () => {
        const result = growthRates([0, 100]);
        expect(result[0]).toBe(100);
    });

    it("should handle zero to zero transition", () => {
        const result = growthRates([0, 0]);
        expect(result[0]).toBe(0);
    });

    it("should handle single value", () => {
        expect(growthRates([100])).toEqual([]);
    });

    it("should handle empty array", () => {
        expect(growthRates([])).toEqual([]);
    });

    it("should handle flat values", () => {
        const result = growthRates([100, 100, 100]);
        expect(result).toEqual([0, 0]);
    });
});