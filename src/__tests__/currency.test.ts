import { describe, it, expect } from "vitest";
import { convertToUSD, convertFromUSD, formatCurrency } from "../lib/finance/currency";

describe("Currency Logic", () => {
    describe("convertToUSD", () => {
        it("should handle same currency", () => {
            expect(convertToUSD(100, "USD")).toBe(100);
        });

        it("should convert EUR to USD correctly", () => {
            // Rate is 0.92, 92 EUR / 0.92 = 100 USD
            expect(convertToUSD(92, "EUR")).toBe(100);
        });

        it("should handle lowercase currency codes", () => {
            expect(convertToUSD(92, "eur")).toBe(100);
        });
    });

    describe("convertFromUSD", () => {
        it("should convert USD to GBP correctly", () => {
            // Rate is 0.79, 100 USD * 0.79 = 79 GBP
            expect(convertFromUSD(100, "GBP")).toBe(79);
        });
    });

    describe("formatCurrency", () => {
        it("should format USD correctly", () => {
            const formatted = formatCurrency(100, "USD");
            expect(formatted).toContain("$");
            expect(formatted).toContain("100.00");
        });
    });
});
