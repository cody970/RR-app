// Simulated exchange rates (Base: USD)
// In a real app, these would be fetched from an API like exchangerate-api.com
const GET_LIVE_RATES = () => {
    return {
        USD: 1.0,
        EUR: 0.92,
        GBP: 0.79,
        JPY: 151.0,
    };
};

export function convertToUSD(amount: number, fromCurrency: string): number {
    const rates = GET_LIVE_RATES();
    const rate = (rates as any)[fromCurrency.toUpperCase()] || 1.0;
    return amount / rate;
}

export function convertFromUSD(amount: number, toCurrency: string): number {
    const rates = GET_LIVE_RATES();
    const rate = (rates as any)[toCurrency.toUpperCase()] || 1.0;
    return amount * rate;
}

export function formatCurrency(amount: number, currency: string = "USD", locale: string = "en-US"): string {
    try {
        return new Intl.NumberFormat(locale, {
            style: "currency",
            currency: currency.toUpperCase(),
        }).format(amount);
    } catch (e) {
        // Fallback for invalid currency codes
        return `${currency.toUpperCase()} ${amount.toFixed(2)}`;
    }
}

export const SUPPORTED_CURRENCIES = ["USD", "EUR", "GBP", "JPY"];
