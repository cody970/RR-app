/**
 * Currency conversion utilities.
 *
 * In production, replace GET_LIVE_RATES with a real API call
 * (e.g., Open Exchange Rates, exchangerate-api.com).
 */

export type CurrencyCode = "USD" | "EUR" | "GBP" | "JPY";

const RATES: Record<CurrencyCode, number> = {
    USD: 1.0,
    EUR: 0.92,
    GBP: 0.79,
    JPY: 151.0,
};

export const SUPPORTED_CURRENCIES: CurrencyCode[] = ["USD", "EUR", "GBP", "JPY"];

function getRate(currency: string): number {
    const code = currency.toUpperCase() as CurrencyCode;
    const rate = RATES[code];
    if (rate === undefined) {
        throw new Error(`Unsupported currency: ${currency}. Supported: ${SUPPORTED_CURRENCIES.join(", ")}`);
    }
    return rate;
}

export function convertToUSD(amount: number, fromCurrency: string): number {
    return amount / getRate(fromCurrency);
}

export function convertFromUSD(amount: number, toCurrency: string): number {
    return amount * getRate(toCurrency);
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
