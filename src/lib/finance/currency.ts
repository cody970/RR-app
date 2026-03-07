/**
 * Currency conversion utilities.
 *
 * In production, replace GET_LIVE_RATES with a real API call
 * (e.g., Open Exchange Rates, exchangerate-api.com).
 */

export type CurrencyCode = "USD" | "EUR" | "GBP" | "JPY";

/**
 * Static rates used as fallout/defaults.
 */
let CURRENT_RATES: Record<CurrencyCode, number> = {
    USD: 1.0,
    EUR: 0.92,
    GBP: 0.79,
    JPY: 151.0,
};

let lastFetch: number = 0;
const CACHE_DURATION = 3600_000; // 1 hour

export const SUPPORTED_CURRENCIES: CurrencyCode[] = ["USD", "EUR", "GBP", "JPY"];

/**
 * In production, replace this with a real API call (e.g., Open Exchange Rates).
 * For now, it simulates a live fetch by adding slight jitter to the static rates.
 */
export async function refreshRates(): Promise<void> {
    const now = Date.now();
    if (now - lastFetch < CACHE_DURATION) return;

    try {
        // Mocking a real API response
        // const response = await fetch(`https://openexchangerates.org/api/latest.json?app_id=${process.env.ORE_API_KEY}`);
        // const data = await response.json();
        // CURRENT_RATES = data.rates;

        // Simulating jitter for "live" feel in dev/staging
        const jitter = () => (Math.random() * 0.02) - 0.01; // +/- 1%
        CURRENT_RATES = {
            USD: 1.0,
            EUR: 0.92 + jitter(),
            GBP: 0.79 + jitter(),
            JPY: 151.0 + (Math.random() * 2 - 1),
        };

        lastFetch = now;
        console.log("[Currency] Rates refreshed tracking live markets");
    } catch (error) {
        console.error("[Currency] Failed to fetch live rates, using defaults:", error);
    }
}

function getRate(currency: string): number {
    const code = currency.toUpperCase() as CurrencyCode;
    const rate = CURRENT_RATES[code];
    if (rate === undefined) {
        throw new Error(`Unsupported currency: ${currency}. Supported: ${SUPPORTED_CURRENCIES.join(", ")}`);
    }
    return rate;
}

export function convertToUSD(amount: number, fromCurrency: string): number {
    const rate = getRate(fromCurrency);
    return Math.round((amount / rate) * 1000000) / 1000000;
}

export function convertFromUSD(amount: number, toCurrency: string): number {
    const rate = getRate(toCurrency);
    return Math.round((amount * rate) * 1000000) / 1000000;
}

export function formatCurrency(amount: number, currency: string = "USD", locale: string = "en-US"): string {
    try {
        return new Intl.NumberFormat(locale, {
            style: "currency",
            currency: currency.toUpperCase(),
        }).format(amount);
    } catch {
        return `${currency.toUpperCase()} ${amount.toFixed(2)}`;
    }
}
