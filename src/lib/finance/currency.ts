/**
 * Multi-Currency Support
 *
 * Provides exchange rate management, cross-currency conversion,
 * currency detection from statement data, and formatting utilities.
 *
 * In production, replace refreshRates() internals with a real API call
 * (e.g., Open Exchange Rates, exchangerate-api.com, ECB).
 */

// ---------- Types ----------

export type CurrencyCode =
    | "USD" | "EUR" | "GBP" | "JPY" | "CAD" | "AUD"
    | "CHF" | "SEK" | "NOK" | "DKK" | "NZD" | "MXN"
    | "BRL" | "KRW" | "ZAR" | "INR" | "SGD" | "HKD";

export interface CurrencyInfo {
    code: CurrencyCode;
    name: string;
    symbol: string;
    decimals: number;
}

export interface ConversionResult {
    originalAmount: number;
    originalCurrency: string;
    convertedAmount: number;
    targetCurrency: string;
    rate: number;
    rateTimestamp: string;
}

// ---------- Currency Registry ----------

export const CURRENCY_REGISTRY: Record<CurrencyCode, CurrencyInfo> = {
    USD: { code: "USD", name: "US Dollar", symbol: "$", decimals: 2 },
    EUR: { code: "EUR", name: "Euro", symbol: "€", decimals: 2 },
    GBP: { code: "GBP", name: "British Pound", symbol: "£", decimals: 2 },
    JPY: { code: "JPY", name: "Japanese Yen", symbol: "¥", decimals: 0 },
    CAD: { code: "CAD", name: "Canadian Dollar", symbol: "CA$", decimals: 2 },
    AUD: { code: "AUD", name: "Australian Dollar", symbol: "A$", decimals: 2 },
    CHF: { code: "CHF", name: "Swiss Franc", symbol: "CHF", decimals: 2 },
    SEK: { code: "SEK", name: "Swedish Krona", symbol: "kr", decimals: 2 },
    NOK: { code: "NOK", name: "Norwegian Krone", symbol: "kr", decimals: 2 },
    DKK: { code: "DKK", name: "Danish Krone", symbol: "kr", decimals: 2 },
    NZD: { code: "NZD", name: "New Zealand Dollar", symbol: "NZ$", decimals: 2 },
    MXN: { code: "MXN", name: "Mexican Peso", symbol: "MX$", decimals: 2 },
    BRL: { code: "BRL", name: "Brazilian Real", symbol: "R$", decimals: 2 },
    KRW: { code: "KRW", name: "South Korean Won", symbol: "₩", decimals: 0 },
    ZAR: { code: "ZAR", name: "South African Rand", symbol: "R", decimals: 2 },
    INR: { code: "INR", name: "Indian Rupee", symbol: "₹", decimals: 2 },
    SGD: { code: "SGD", name: "Singapore Dollar", symbol: "S$", decimals: 2 },
    HKD: { code: "HKD", name: "Hong Kong Dollar", symbol: "HK$", decimals: 2 },
};

export const SUPPORTED_CURRENCIES = Object.keys(CURRENCY_REGISTRY) as CurrencyCode[];

// ---------- Exchange Rates ----------

/**
 * Rates are stored as USD-based (1 USD = X units of currency).
 * To convert FROM a currency TO USD: amount / rate
 * To convert FROM USD TO a currency: amount * rate
 */
let CURRENT_RATES: Record<string, number> = {
    USD: 1.0,
    EUR: 0.92,
    GBP: 0.79,
    JPY: 151.0,
    CAD: 1.36,
    AUD: 1.53,
    CHF: 0.88,
    SEK: 10.45,
    NOK: 10.65,
    DKK: 6.87,
    NZD: 1.64,
    MXN: 17.15,
    BRL: 4.97,
    KRW: 1320.0,
    ZAR: 18.65,
    INR: 83.12,
    SGD: 1.34,
    HKD: 7.82,
};

let lastFetch = 0;
let rateTimestamp = new Date().toISOString();
const CACHE_DURATION = 3600_000; // 1 hour

/**
 * Refresh exchange rates from an external source.
 * In production, replace the mock with a real API call.
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
                CURRENT_RATES = { USD: 1.0 } as Record<string, number>;
                for (const code of Object.keys(CURRENCY_REGISTRY)) {
                    if (code !== "USD" && data.rates[code]) {
                        CURRENT_RATES[code] = data.rates[code];
                    }
                }
                rateTimestamp = new Date().toISOString();
                lastFetch = now;
                console.log("[Currency] Live rates updated successfully");
                return;
            }
        }

        // Fallback to static rates for dev/staging when no API key is provided.
        // IMPORTANT: Do NOT add jitter/randomness to financial rates - this makes
        // calculations non-reproducible (CRIT-6).
        console.log("[Currency] Using static fallback rates (dev/staging mode)");
        
        // Static fallback rates - use a live API in production
        CURRENT_RATES = {
            USD: 1.0,
            EUR: 0.92,
            GBP: 0.79,
            JPY: 151.0,
            CAD: 1.36,
            AUD: 1.53,
            CHF: 0.88,
            SEK: 10.45,
            NOK: 10.65,
            DKK: 6.87,
            NZD: 1.64,
            MXN: 17.15,
            BRL: 4.97,
            KRW: 1320.0,
            ZAR: 18.65,
            INR: 83.12,
            SGD: 1.34,
            HKD: 7.82,
        };

        rateTimestamp = new Date().toISOString();
        lastFetch = now;
        console.log("[Currency] Rates set to static fallback values");
    } catch (error) {
        console.error("[Currency] Failed to fetch live rates, using previous defaults:", error);
        // Don't update lastFetch so we retry on next call
    }
}

/**
 * Get the current rate for a currency (relative to USD).
 */
function getRate(currency: string): number {
    const code = currency.toUpperCase();
    const rate = CURRENT_RATES[code];
    if (rate === undefined) {
        throw new Error(
            `Unsupported currency: ${currency}. Supported: ${SUPPORTED_CURRENCIES.join(", ")}`,
        );
    }
    return rate;
}

/**
 * Check if a currency code is supported.
 */
export function isSupportedCurrency(code: string): boolean {
    return code.toUpperCase() in CURRENT_RATES;
}

/**
 * Get current rates snapshot.
 */
export function getCurrentRates(): { rates: Record<string, number>; timestamp: string } {
    return {
        rates: { ...CURRENT_RATES },
        timestamp: rateTimestamp,
    };
}

// ---------- Conversion ----------

/**
 * Convert an amount from one currency to another.
 * Uses USD as the intermediate (pivot) currency.
 */
export function convert(
    amount: number,
    fromCurrency: string,
    toCurrency: string,
): ConversionResult {
    const from = fromCurrency.toUpperCase();
    const to = toCurrency.toUpperCase();

    if (from === to) {
        return {
            originalAmount: amount,
            originalCurrency: from,
            convertedAmount: amount,
            targetCurrency: to,
            rate: 1.0,
            rateTimestamp,
        };
    }

    const fromRate = getRate(from);
    const toRate = getRate(to);

    // Convert: from → USD → to
    const usdAmount = amount / fromRate;
    const convertedAmount = usdAmount * toRate;

    // Round to appropriate decimal places
    const info = CURRENCY_REGISTRY[to as CurrencyCode];
    const decimals = info?.decimals ?? 2;
    const rounded = Math.round(convertedAmount * Math.pow(10, decimals)) / Math.pow(10, decimals);

    return {
        originalAmount: amount,
        originalCurrency: from,
        convertedAmount: rounded,
        targetCurrency: to,
        rate: toRate / fromRate,
        rateTimestamp,
    };
}

/**
 * Convert an amount to USD.
 */
export function convertToUSD(amount: number, fromCurrency: string): number {
    return convert(amount, fromCurrency, "USD").convertedAmount;
}

/**
 * Convert an amount from USD to another currency.
 */
export function convertFromUSD(amount: number, toCurrency: string): number {
    return convert(amount, "USD", toCurrency).convertedAmount;
}

/**
 * Batch convert multiple amounts to a target currency.
 */
export function batchConvert(
    items: Array<{ amount: number; currency: string }>,
    targetCurrency: string,
): Array<ConversionResult> {
    return items.map((item) =>
        convert(item.amount, item.currency, targetCurrency),
    );
}

// ---------- Currency Detection ----------

/**
 * Detect currency from statement content or headers.
 * Looks for currency symbols, ISO codes, and common patterns.
 */
export function detectCurrency(text: string): CurrencyCode {
    const upper = text.toUpperCase();

    // Check for explicit ISO codes
    const isoMatch = upper.match(/\b(EUR|GBP|JPY|CAD|AUD|CHF|SEK|NOK|DKK|NZD|MXN|BRL|KRW|ZAR|INR|SGD|HKD)\b/);
    if (isoMatch) {
        return isoMatch[1] as CurrencyCode;
    }

    // Check for currency symbols in amount columns
    if (/€/.test(text)) return "EUR";
    if (/£/.test(text)) return "GBP";
    if (/¥/.test(text)) return "JPY";
    if (/₩/.test(text)) return "KRW";
    if (/₹/.test(text)) return "INR";
    if (/R\$/.test(text)) return "BRL";

    // Default to USD for US-based PROs
    return "USD";
}

/**
 * Detect currency from a society/PRO name.
 * Different societies typically pay in specific currencies.
 */
export function currencyForSociety(society: string): CurrencyCode {
    const s = society.toUpperCase();

    // US societies
    if (["ASCAP", "BMI", "SESAC", "SOUNDEXCHANGE", "MLC", "HFA"].includes(s)) return "USD";

    // UK societies
    if (["PRS", "MCPS", "PPL"].includes(s)) return "GBP";

    // European societies
    if (["GEMA"].includes(s)) return "EUR";
    if (["SACEM"].includes(s)) return "EUR";
    if (["SIAE"].includes(s)) return "EUR";
    if (["SGAE"].includes(s)) return "EUR";
    if (["BUMA", "STEMRA"].includes(s)) return "EUR";

    // Nordic societies
    if (["STIM"].includes(s)) return "SEK";
    if (["TONO"].includes(s)) return "NOK";
    if (["KODA"].includes(s)) return "DKK";

    // Other
    if (["SOCAN"].includes(s)) return "CAD";
    if (["APRA", "AMCOS"].includes(s)) return "AUD";
    if (["JASRAC"].includes(s)) return "JPY";
    if (["KOMCA"].includes(s)) return "KRW";
    if (["SAMRO"].includes(s)) return "ZAR";

    return "USD"; // Default
}

// ---------- Formatting ----------

/**
 * Format a monetary amount with proper currency symbol and locale.
 */
export function formatCurrency(
    amount: number,
    currency: string = "USD",
    locale: string = "en-US",
): string {
    try {
        return new Intl.NumberFormat(locale, {
            style: "currency",
            currency: currency.toUpperCase(),
            minimumFractionDigits: CURRENCY_REGISTRY[currency.toUpperCase() as CurrencyCode]?.decimals ?? 2,
            maximumFractionDigits: CURRENCY_REGISTRY[currency.toUpperCase() as CurrencyCode]?.decimals ?? 2,
        }).format(amount);
    } catch {
        const info = CURRENCY_REGISTRY[currency.toUpperCase() as CurrencyCode];
        const symbol = info?.symbol ?? currency.toUpperCase();
        return `${symbol}${amount.toFixed(info?.decimals ?? 2)}`;
    }
}

/**
 * Format a compact monetary amount (e.g., $1.2K, $3.4M).
 */
export function formatCurrencyCompact(
    amount: number,
    currency: string = "USD",
): string {
    const info = CURRENCY_REGISTRY[currency.toUpperCase() as CurrencyCode];
    const symbol = info?.symbol ?? "$";

    if (Math.abs(amount) >= 1_000_000) {
        return `${symbol}${(amount / 1_000_000).toFixed(2)}M`;
    }
    if (Math.abs(amount) >= 1_000) {
        return `${symbol}${(amount / 1_000).toFixed(1)}K`;
    }
    return `${symbol}${amount.toFixed(info?.decimals ?? 2)}`;
}