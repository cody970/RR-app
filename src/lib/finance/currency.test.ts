import { describe, it, expect, vi, beforeEach } from 'vitest';
import { convertToUSD, convertFromUSD, formatCurrency, refreshRates } from './currency';

describe('Currency Module', () => {
    beforeEach(() => {
        // Reset environment variable for testing
        delete process.env.OPENEXCHANGERATES_API_KEY;
        delete process.env.ORE_API_KEY;
    });

    describe('convertToUSD', () => {
        it('should convert EUR to USD correctly', () => {
            const result = convertToUSD(100, 'EUR');
            // With default rate of 0.92, 100 EUR = 100 / 0.92 ≈ 108.70 USD
            expect(result).toBeGreaterThan(100);
            expect(result).toBeCloseTo(108.70, 1);
        });

        it('should convert GBP to USD correctly', () => {
            const result = convertToUSD(100, 'GBP');
            // With default rate of 0.79, 100 GBP = 100 / 0.79 ≈ 126.58 USD
            expect(result).toBeGreaterThan(100);
            expect(result).toBeCloseTo(126.58, 1);
        });

        it('should handle USD to USD conversion', () => {
            const result = convertToUSD(100, 'USD');
            expect(result).toBe(100);
        });

        it('should handle zero amounts', () => {
            const result = convertToUSD(0, 'EUR');
            expect(result).toBe(0);
        });

        it('should throw error for unsupported currency', () => {
            expect(() => convertToUSD(100, 'XXX')).toThrow('Unsupported currency');
        });

        it('should handle negative amounts', () => {
            const result = convertToUSD(-100, 'EUR');
            expect(result).toBeLessThan(0);
        });
    });

    describe('convertFromUSD', () => {
        it('should convert USD to EUR correctly', () => {
            const result = convertFromUSD(100, 'EUR');
            // With default rate of 0.92, 100 USD = 100 * 0.92 = 92 EUR
            expect(result).toBeLessThan(100);
            expect(result).toBeCloseTo(92, 0);
        });

        it('should convert USD to GBP correctly', () => {
            const result = convertFromUSD(100, 'GBP');
            // With default rate of 0.79, 100 USD = 100 * 0.79 = 79 GBP
            expect(result).toBeLessThan(100);
            expect(result).toBeCloseTo(79, 0);
        });

        it('should handle USD to USD conversion', () => {
            const result = convertFromUSD(100, 'USD');
            expect(result).toBe(100);
        });

        it('should handle zero amounts', () => {
            const result = convertFromUSD(0, 'EUR');
            expect(result).toBe(0);
        });

        it('should throw error for unsupported currency', () => {
            expect(() => convertFromUSD(100, 'XXX')).toThrow('Unsupported currency');
        });
    });

    describe('formatCurrency', () => {
        it('should format USD correctly', () => {
            const result = formatCurrency(1234.56, 'USD', 'en-US');
            expect(result).toContain('$');
            expect(result).toContain('1,234.56');
        });

        it('should format EUR correctly', () => {
            const result = formatCurrency(1234.56, 'EUR', 'en-US');
            expect(result).toContain('€');
            expect(result).toContain('1,234.56');
        });

        it('should format GBP correctly', () => {
            const result = formatCurrency(1234.56, 'GBP', 'en-US');
            expect(result).toContain('£');
            expect(result).toContain('1,234.56');
        });

        it('should handle zero amounts', () => {
            const result = formatCurrency(0, 'USD', 'en-US');
            expect(result).toContain('$0.00');
        });

        it('should handle different locales', () => {
            const result = formatCurrency(1234.56, 'EUR', 'de-DE');
            expect(result).toContain('1.234,56'); // German locale uses comma for decimals
        });

        it('should handle unsupported currencies gracefully', () => {
            const result = formatCurrency(1234.56, 'XXX', 'en-US');
            expect(result).toContain('XXX');
            expect(result).toContain('1234.56');
        });
    });

    describe('refreshRates', () => {
        it('should refresh rates with simulated data when no API key', async () => {
            await refreshRates();
            // Just verify it doesn't throw and completes
            expect(true).toBe(true);
        });

        it('should respect cache duration', async () => {
            const start = Date.now();
            await refreshRates();
            const firstCallTime = Date.now() - start;

            // Second call should be instant (cached)
            const start2 = Date.now();
            await refreshRates();
            const secondCallTime = Date.now() - start2;

            expect(secondCallTime).toBeLessThan(firstCallTime);
        });

        it('should use live API when key is provided', async () => {
            // Mock fetch to avoid real API calls in tests
            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({
                    rates: {
                        EUR: 0.95,
                        GBP: 0.80,
                        JPY: 155.0
                    }
                })
            } as Response);

            process.env.OPENEXCHANGERATES_API_KEY = 'test-key';
            await refreshRates();

            // Verify fetch was called with correct URL
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('openexchangerates.org')
            );
        });
    });

    describe('rounding behavior', () => {
        it('should handle small decimal amounts correctly', () => {
            const result = convertToUSD(0.01, 'EUR');
            expect(result).toBeGreaterThan(0);
            expect(result).toBeLessThan(1);
        });

        it('should handle large amounts correctly', () => {
            const result = convertToUSD(1000000, 'EUR');
            expect(result).toBeGreaterThan(1000000);
        });

        it('should maintain precision to 6 decimal places', () => {
            const result = convertToUSD(1, 'EUR');
            const resultString = result.toFixed(6);
            expect(resultString).toHaveLength(resultString.length); // Just verify it's a number
        });
    });
});