/**
 * Currency Rates API
 *
 * GET /api/currency/rates — Returns current exchange rates
 *
 * Public endpoint (no auth required) since rates are not sensitive.
 * Rates are cached and refreshed hourly.
 */

import { NextResponse } from "next/server";
import { refreshRates, getCurrentRates, SUPPORTED_CURRENCIES } from "@/lib/finance/currency";

export async function GET() {
    try {
        // Ensure rates are fresh
        await refreshRates();

        const { rates, timestamp } = getCurrentRates();

        return NextResponse.json({
            base: "USD",
            rates,
            timestamp,
            supported: SUPPORTED_CURRENCIES,
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Internal Server Error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}