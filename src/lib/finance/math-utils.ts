/**
 * Standardized Financial Math Utilities
 * 
 * Used across split-engine, discrepancy-engine, and reporting routes
 * to ensure consistent rounding and precision.
 */

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
