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
        // Try to fetch live rates if API key is provided
        const apiKey = process.env.OPENEXCHANGERATES_API_KEY || process.env.ORE_API_KEY;
        
        if (apiKey) {
            console.log("[Currency] Fetching live rates from Open Exchange Rates");
            const response = await fetch(`https://openexchangerates.org/api/latest.json?app_id=${apiKey}`);
            if (response.ok) {
                const data = await response.json();
                CURRENT_RATES = {
                    USD: 1.0,
                    EUR: data.rates.EUR || 0.92,
                    GBP: data.rates.GBP || 0.79,
                    JPY: data.rates.JPY || 151.0,
                };
                lastFetch = now;
                console.log("[Currency] Live rates updated successfully");
                return;
            }
        }

        // Fallback to simulated rates for dev/staging
        console.log("[Currency] Using simulated rates (dev/staging mode)");
        const jitter = () => (Math.random() * 0.02) - 0.01; // +/- 1%
        CURRENT_RATES = {
            USD: 1.0,
            EUR: 0.92 + jitter(),
            GBP: 0.79 + jitter(),
            JPY: 151.0 + (Math.random() * 2 - 1),
        };

        lastFetch = now;
        console.log("[Currency] Rates refreshed with simulated values");
    } catch (error) {
        console.error("[Currency] Failed to fetch live rates, using previous defaults:", error);
        // Don't update lastFetch so we retry on next call
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
