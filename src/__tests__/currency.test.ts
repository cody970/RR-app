import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
    convertToUSD,
    convertFromUSD,
    formatCurrency,
    convert,
    currencyForSociety,
    detectCurrency,
    isSupportedCurrency,
    SUPPORTED_CURRENCIES,
    CURRENCY_REGISTRY,
    formatCurrencyCompact,
    type CurrencyCode,
} from "../lib/finance/currency";

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

        it("should format EUR correctly", () => {
            const formatted = formatCurrency(100, "EUR");
            expect(formatted).toContain("€");
            expect(formatted).toContain("100.00");
        });

        it("should format GBP correctly", () => {
            const formatted = formatCurrency(100, "GBP");
            expect(formatted).toContain("£");
            expect(formatted).toContain("100.00");
        });

        it("should format JPY without decimals", () => {
            const formatted = formatCurrency(1500, "JPY");
            expect(formatted).toContain("¥");
            expect(formatted).toContain("1,500");
        });
    });

    describe("convert", () => {
        it("should return same amount for same currency", () => {
            const result = convert(100, "USD", "USD");
            expect(result.convertedAmount).toBe(100);
            expect(result.rate).toBe(1.0);
        });

        it("should convert EUR to GBP via USD pivot", () => {
            const result = convert(92, "EUR", "GBP");
            // 92 EUR -> 100 USD -> 79 GBP
            expect(result.convertedAmount).toBe(79);
            expect(result.originalCurrency).toBe("EUR");
            expect(result.targetCurrency).toBe("GBP");
        });

        it("should include rate timestamp", () => {
            const result = convert(100, "USD", "EUR");
            expect(result.rateTimestamp).toBeDefined();
        });
    });

    describe("currencyForSociety", () => {
        it("should return USD for US societies", () => {
            expect(currencyForSociety("ASCAP")).toBe("USD");
            expect(currencyForSociety("BMI")).toBe("USD");
            expect(currencyForSociety("MLC")).toBe("USD");
            expect(currencyForSociety("SOUNDEXCHANGE")).toBe("USD");
        });

        it("should return GBP for UK societies", () => {
            expect(currencyForSociety("PRS")).toBe("GBP");
            expect(currencyForSociety("MCPS")).toBe("GBP");
            expect(currencyForSociety("PPL")).toBe("GBP");
        });

        it("should return EUR for European societies", () => {
            expect(currencyForSociety("GEMA")).toBe("EUR");
            expect(currencyForSociety("SACEM")).toBe("EUR");
            expect(currencyForSociety("SIAE")).toBe("EUR");
        });

        it("should return CAD for SOCAN", () => {
            expect(currencyForSociety("SOCAN")).toBe("CAD");
        });

        it("should return AUD for Australian societies", () => {
            expect(currencyForSociety("APRA")).toBe("AUD");
            expect(currencyForSociety("AMCOS")).toBe("AUD");
        });

        it("should handle case insensitivity", () => {
            expect(currencyForSociety("ascap")).toBe("USD");
            expect(currencyForSociety("Gema")).toBe("EUR");
        });

        it("should default to USD for unknown societies", () => {
            expect(currencyForSociety("UNKNOWN_SOCIETY")).toBe("USD");
        });
    });

    describe("detectCurrency", () => {
        it("should detect EUR from ISO code", () => {
            expect(detectCurrency("Amount EUR")).toBe("EUR");
        });

        it("should detect GBP from symbol", () => {
            expect(detectCurrency("£100.00")).toBe("GBP");
        });

        it("should detect EUR from symbol", () => {
            expect(detectCurrency("€100.00")).toBe("EUR");
        });

        it("should detect JPY from symbol", () => {
            expect(detectCurrency("¥1500")).toBe("JPY");
        });

        it("should default to USD", () => {
            expect(detectCurrency("$100.00")).toBe("USD");
            expect(detectCurrency("No currency indicator")).toBe("USD");
        });
    });

    describe("isSupportedCurrency", () => {
        it("should return true for supported currencies", () => {
            expect(isSupportedCurrency("USD")).toBe(true);
            expect(isSupportedCurrency("EUR")).toBe(true);
            expect(isSupportedCurrency("GBP")).toBe(true);
            expect(isSupportedCurrency("JPY")).toBe(true);
        });

        it("should handle case insensitivity", () => {
            expect(isSupportedCurrency("usd")).toBe(true);
            expect(isSupportedCurrency("Eur")).toBe(true);
        });

        it("should return false for unsupported currencies", () => {
            expect(isSupportedCurrency("XXX")).toBe(false);
            expect(isSupportedCurrency("BITCOIN")).toBe(false);
        });
    });

    describe("SUPPORTED_CURRENCIES", () => {
        it("should include common currencies", () => {
            expect(SUPPORTED_CURRENCIES).toContain("USD");
            expect(SUPPORTED_CURRENCIES).toContain("EUR");
            expect(SUPPORTED_CURRENCIES).toContain("GBP");
            expect(SUPPORTED_CURRENCIES).toContain("JPY");
            expect(SUPPORTED_CURRENCIES).toContain("CAD");
            expect(SUPPORTED_CURRENCIES).toContain("AUD");
        });

        it("should have at least 15 currencies", () => {
            expect(SUPPORTED_CURRENCIES.length).toBeGreaterThanOrEqual(15);
        });
    });

    describe("CURRENCY_REGISTRY", () => {
        it("should have correct info for USD", () => {
            expect(CURRENCY_REGISTRY.USD).toEqual({
                code: "USD",
                name: "US Dollar",
                symbol: "$",
                decimals: 2,
            });
        });

        it("should have correct decimals for JPY", () => {
            expect(CURRENCY_REGISTRY.JPY.decimals).toBe(0);
        });

        it("should have correct decimals for KRW", () => {
            expect(CURRENCY_REGISTRY.KRW.decimals).toBe(0);
        });
    });

    describe("formatCurrencyCompact", () => {
        it("should format millions with M suffix", () => {
            expect(formatCurrencyCompact(1500000, "USD")).toBe("$1.50M");
        });

        it("should format thousands with K suffix", () => {
            expect(formatCurrencyCompact(1500, "USD")).toBe("$1.5K");
        });

        it("should format small amounts normally", () => {
            expect(formatCurrencyCompact(150, "USD")).toBe("$150.00");
        });

        it("should use correct symbol for different currencies", () => {
            expect(formatCurrencyCompact(1500, "EUR")).toBe("€1.5K");
            expect(formatCurrencyCompact(1500, "GBP")).toBe("£1.5K");
        });
    });
});
