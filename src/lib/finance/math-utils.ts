/**
 * Standardized Financial Math Utilities
 * 
 * Used across split-engine, discrepancy-engine, and reporting routes
 * to ensure consistent rounding and precision.
 */

// Re-export currency conversion functions for convenience
export {
    convert,
    convertToUSD,
    convertFromUSD,
    convertCurrency,
    formatCurrency,
} from "@/lib/finance/currency";

/**
 * Rounds a number to a specific number of decimal places.
 * Default is 4 for intermediate calculations (e.g., shares).
 */
export function round(value: number, decimals: number = 4): number {
    const factor = Math.pow(10, decimals);
    return Math.round((value + Number.EPSILON) * factor) / factor;
}

/**
 * Rounds a monetary value to 2 decimal places (standard currency).
 */
export function roundMoney(value: number): number {
    return round(value, 2);
}

/**
 * Safely sums an array of numbers, handling floating point errors.
 */
export function sum(values: number[]): number {
    return round(values.reduce((acc, val) => acc + val, 0), 8);
}

/**
 * Calculates a percentage share safely.
 */
export function calculateShare(total: number, percent: number): number {
    return round(total * (percent / 100), 8);
}

/**
 * Checks if two numbers are effectively equal within a small epsilon.
 */
export function effectivelyEqual(a: number, b: number, epsilon: number = 0.0001): boolean {
    return Math.abs(a - b) < epsilon;
}

// ---------- Forecasting ----------

export interface DataPoint {
    x: number;
    y: number;
}

export interface LinearRegressionResult {
    slope: number;
    intercept: number;
    rSquared: number;
    predict: (x: number) => number;
}

/**
 * Simple linear regression (least squares method).
 * Returns slope, intercept, R² value, and a predict function.
 *
 * Used for revenue trend forecasting — projects future quarters
 * based on historical period data.
 */
export function linearRegression(points: DataPoint[]): LinearRegressionResult {
    const n = points.length;
    if (n < 2) {
        return {
            slope: 0,
            intercept: n === 1 ? points[0].y : 0,
            rSquared: 0,
            predict: (x: number) => (n === 1 ? points[0].y : 0),
        };
    }

    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;

    for (const { x, y } of points) {
        sumX += x;
        sumY += y;
        sumXY += x * y;
        sumX2 += x * x;
        sumY2 += y * y;
    }

    const denominator = n * sumX2 - sumX * sumX;
    if (denominator === 0) {
        const avgY = sumY / n;
        return { slope: 0, intercept: avgY, rSquared: 0, predict: () => avgY };
    }

    const slope = round((n * sumXY - sumX * sumY) / denominator, 6);
    const intercept = round((sumY - slope * sumX) / n, 6);

    // R² (coefficient of determination)
    const meanY = sumY / n;
    let ssRes = 0, ssTot = 0;
    for (const { x, y } of points) {
        const predicted = slope * x + intercept;
        ssRes += (y - predicted) ** 2;
        ssTot += (y - meanY) ** 2;
    }
    const rSquared = ssTot === 0 ? 0 : round(1 - ssRes / ssTot, 4);

    return {
        slope,
        intercept,
        rSquared,
        predict: (x: number) => round(slope * x + intercept, 2),
    };
}

/**
 * Forecast future values using linear regression.
 * Takes historical data points and returns predictions for the next N periods.
 */
export function forecastNextPeriods(
    historicalData: DataPoint[],
    periodsAhead: number = 2
): { forecasts: DataPoint[]; regression: LinearRegressionResult } {
    const regression = linearRegression(historicalData);

    if (historicalData.length === 0) {
        return { forecasts: [], regression };
    }

    const lastX = Math.max(...historicalData.map(p => p.x));
    const forecasts: DataPoint[] = [];

    for (let i = 1; i <= periodsAhead; i++) {
        const x = lastX + i;
        forecasts.push({
            x,
            y: Math.max(0, regression.predict(x)), // Revenue can't be negative
        });
    }

    return { forecasts, regression };
}

/**
 * Calculate moving average for smoothing time-series data.
 */
export function movingAverage(values: number[], windowSize: number = 3): number[] {
    if (values.length === 0 || windowSize < 1) return [];
    if (windowSize > values.length) windowSize = values.length;

    const result: number[] = [];
    for (let i = 0; i < values.length; i++) {
        const start = Math.max(0, i - windowSize + 1);
        const window = values.slice(start, i + 1);
        result.push(round(window.reduce((a, b) => a + b, 0) / window.length, 2));
    }
    return result;
}

/**
 * Calculate period-over-period growth rates from a series of values.
 */
export function growthRates(values: number[]): number[] {
    if (values.length < 2) return [];
    const rates: number[] = [];
    for (let i = 1; i < values.length; i++) {
        if (values[i - 1] === 0) {
            rates.push(values[i] > 0 ? 100 : 0);
        } else {
            rates.push(round(((values[i] - values[i - 1]) / values[i - 1]) * 100, 2));
        }
    }
    return rates;
}
