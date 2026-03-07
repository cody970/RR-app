"use client";

import { useState, useEffect, createContext, useContext, useCallback } from "react";

// ---------- Types ----------

interface CurrencyContextValue {
    /** The currently selected display currency */
    displayCurrency: string;
    /** Change the display currency */
    setDisplayCurrency: (code: string) => void;
    /** Convert an amount from its original currency to the display currency */
    convertForDisplay: (amount: number, fromCurrency?: string) => number;
    /** Format an amount in the display currency */
    formatAmount: (amount: number, fromCurrency?: string) => string;
    /** Format compact (e.g., $1.2K) */
    formatCompact: (amount: number, fromCurrency?: string) => string;
    /** Available currencies */
    currencies: Array<{ code: string; name: string; symbol: string }>;
    /** Whether rates are loading */
    loading: boolean;
}

// ---------- Constants ----------

const POPULAR_CURRENCIES = [
    { code: "USD", name: "US Dollar", symbol: "$" },
    { code: "EUR", name: "Euro", symbol: "€" },
    { code: "GBP", name: "British Pound", symbol: "£" },
    { code: "JPY", name: "Japanese Yen", symbol: "¥" },
    { code: "CAD", name: "Canadian Dollar", symbol: "CA$" },
    { code: "AUD", name: "Australian Dollar", symbol: "A$" },
    { code: "CHF", name: "Swiss Franc", symbol: "CHF" },
    { code: "SEK", name: "Swedish Krona", symbol: "kr" },
    { code: "NOK", name: "Norwegian Krone", symbol: "kr" },
    { code: "DKK", name: "Danish Krone", symbol: "kr" },
    { code: "NZD", name: "New Zealand Dollar", symbol: "NZ$" },
    { code: "MXN", name: "Mexican Peso", symbol: "MX$" },
    { code: "BRL", name: "Brazilian Real", symbol: "R$" },
    { code: "KRW", name: "South Korean Won", symbol: "₩" },
    { code: "ZAR", name: "South African Rand", symbol: "R" },
    { code: "INR", name: "Indian Rupee", symbol: "₹" },
    { code: "SGD", name: "Singapore Dollar", symbol: "S$" },
    { code: "HKD", name: "Hong Kong Dollar", symbol: "HK$" },
];

const STORAGE_KEY = "rr-display-currency";

// ---------- Context ----------

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

export function useCurrency(): CurrencyContextValue {
    const ctx = useContext(CurrencyContext);
    if (!ctx) {
        // Return a safe default when used outside provider
        return {
            displayCurrency: "USD",
            setDisplayCurrency: () => {},
            convertForDisplay: (amount) => amount,
            formatAmount: (amount) => `$${amount.toFixed(2)}`,
            formatCompact: (amount) => {
                if (Math.abs(amount) >= 1_000_000) return `$${(amount / 1_000_000).toFixed(2)}M`;
                if (Math.abs(amount) >= 1_000) return `$${(amount / 1_000).toFixed(1)}K`;
                return `$${amount.toFixed(2)}`;
            },
            currencies: POPULAR_CURRENCIES,
            loading: false,
        };
    }
    return ctx;
}

// ---------- Provider ----------

interface CurrencyProviderProps {
    children: React.ReactNode;
    defaultCurrency?: string;
}

export function CurrencyProvider({ children, defaultCurrency = "USD" }: CurrencyProviderProps) {
    const [displayCurrency, setDisplayCurrencyState] = useState(defaultCurrency);
    const [rates, setRates] = useState<Record<string, number>>({ USD: 1 });
    const [loading, setLoading] = useState(false);
    const [rateTimestamp, setRateTimestamp] = useState("");

    // Load saved preference
    useEffect(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved && POPULAR_CURRENCIES.some((c) => c.code === saved)) {
                setDisplayCurrencyState(saved);
            }
        } catch {
            // localStorage not available
        }
    }, []);

    // Fetch rates
    useEffect(() => {
        const fetchRates = async () => {
            setLoading(true);
            try {
                const res = await fetch("/api/currency/rates");
                if (res.ok) {
                    const data = await res.json();
                    setRates(data.rates || { USD: 1 });
                    setRateTimestamp(data.timestamp || "");
                }
            } catch {
                // Use defaults
            } finally {
                setLoading(false);
            }
        };

        fetchRates();
        // Refresh every hour
        const interval = setInterval(fetchRates, 3600_000);
        return () => clearInterval(interval);
    }, []);

    const setDisplayCurrency = useCallback((code: string) => {
        setDisplayCurrencyState(code);
        try {
            localStorage.setItem(STORAGE_KEY, code);
        } catch {
            // localStorage not available
        }
    }, []);

    const convertForDisplay = useCallback(
        (amount: number, fromCurrency: string = "USD"): number => {
            const from = fromCurrency.toUpperCase();
            const to = displayCurrency.toUpperCase();

            if (from === to) return amount;

            const fromRate = rates[from] || 1;
            const toRate = rates[to] || 1;

            // from → USD → to
            const usdAmount = amount / fromRate;
            const converted = usdAmount * toRate;

            return Math.round(converted * 100) / 100;
        },
        [displayCurrency, rates],
    );

    const formatAmount = useCallback(
        (amount: number, fromCurrency: string = "USD"): string => {
            const converted = convertForDisplay(amount, fromCurrency);
            try {
                return new Intl.NumberFormat("en-US", {
                    style: "currency",
                    currency: displayCurrency,
                }).format(converted);
            } catch {
                return `${displayCurrency} ${converted.toFixed(2)}`;
            }
        },
        [displayCurrency, convertForDisplay],
    );

    const formatCompact = useCallback(
        (amount: number, fromCurrency: string = "USD"): string => {
            const converted = convertForDisplay(amount, fromCurrency);
            const info = POPULAR_CURRENCIES.find((c) => c.code === displayCurrency);
            const symbol = info?.symbol ?? "$";

            if (Math.abs(converted) >= 1_000_000) return `${symbol}${(converted / 1_000_000).toFixed(2)}M`;
            if (Math.abs(converted) >= 1_000) return `${symbol}${(converted / 1_000).toFixed(1)}K`;
            return `${symbol}${converted.toFixed(2)}`;
        },
        [displayCurrency, convertForDisplay],
    );

    return (
        <CurrencyContext.Provider
            value={{
                displayCurrency,
                setDisplayCurrency,
                convertForDisplay,
                formatAmount,
                formatCompact,
                currencies: POPULAR_CURRENCIES,
                loading,
            }}
        >
            {children}
        </CurrencyContext.Provider>
    );
}

// ---------- Toggle Component ----------

interface CurrencyToggleProps {
    className?: string;
    compact?: boolean;
}

export function CurrencyToggle({ className = "", compact = false }: CurrencyToggleProps) {
    const { displayCurrency, setDisplayCurrency, currencies } = useCurrency();
    const [open, setOpen] = useState(false);

    const current = currencies.find((c) => c.code === displayCurrency);

    return (
        <div className={`relative ${className}`}>
            <button
                onClick={() => setOpen(!open)}
                className="flex items-center gap-1.5 h-8 px-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 transition-colors"
            >
                <span className="text-sm">{current?.symbol}</span>
                <span>{displayCurrency}</span>
                <svg
                    className={`h-3 w-3 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {open && (
                <>
                    {/* Backdrop */}
                    <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

                    {/* Dropdown */}
                    <div className="absolute right-0 top-full mt-1 z-50 w-56 max-h-72 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-lg py-1">
                        {currencies.map((c) => (
                            <button
                                key={c.code}
                                onClick={() => {
                                    setDisplayCurrency(c.code);
                                    setOpen(false);
                                }}
                                className={`w-full flex items-center gap-2.5 px-3 py-2 text-left text-xs hover:bg-slate-50 transition-colors ${
                                    c.code === displayCurrency
                                        ? "bg-indigo-50 text-indigo-700 font-medium"
                                        : "text-slate-700"
                                }`}
                            >
                                <span className="w-6 text-center text-sm">{c.symbol}</span>
                                <span className="flex-1">{compact ? c.code : c.name}</span>
                                <span className="text-slate-400 text-[10px]">{c.code}</span>
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}