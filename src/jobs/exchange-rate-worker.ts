/**
 * Exchange Rate Worker
 *
 * BullMQ worker that fetches and stores daily exchange rates.
 * Designed to run once per day via a scheduled job or cron trigger.
 *
 * This worker:
 * - Fetches current exchange rates from an external API (Open Exchange Rates)
 * - Stores rates in the ExchangeRate model for historical lookups
 * - Falls back to simulated rates if no API key is configured
 */

import { Worker, Job } from "bullmq";
import { redis } from "@/lib/infra/redis";
import { fetchAndStoreRates, SUPPORTED_CURRENCIES } from "@/lib/finance/currency";

interface ExchangeRateJobData {
    date?: string; // ISO date string, defaults to today
    force?: boolean; // Force refresh even if rates exist for the date
}

interface ExchangeRateJobResult {
    success: boolean;
    ratesStored: number;
    source: string;
    date: string;
}

/**
 * Process exchange rate fetch job.
 * Fetches rates from external API and stores in database.
 */
export async function processExchangeRateJob(
    job: Job<ExchangeRateJobData>
): Promise<ExchangeRateJobResult> {
    const { date: dateStr, force = false } = job.data;
    const targetDate = dateStr ? new Date(dateStr) : new Date();

    console.log(
        `[ExchangeRateWorker] Processing job ${job.id} for date ${targetDate.toISOString().split('T')[0]}`
    );

    // Check if we already have rates for this date (unless force is set)
    if (!force) {
        const { db } = await import("@/lib/infra/db");
        const dateOnly = new Date(targetDate.toISOString().split('T')[0]);

        const existingCount = await db.exchangeRate.count({
            where: {
                date: dateOnly,
                baseCurrency: "USD",
            },
        });

        // If we have most rates for this date, skip
        const expectedCurrencies = SUPPORTED_CURRENCIES.length - 1; // Exclude USD
        if (existingCount >= expectedCurrencies * 0.8) {
            console.log(
                `[ExchangeRateWorker] Rates already exist for ${dateOnly.toISOString().split('T')[0]} (${existingCount}/${expectedCurrencies}), skipping`
            );
            return {
                success: true,
                ratesStored: 0,
                source: "cached",
                date: dateOnly.toISOString().split('T')[0],
            };
        }
    }

    // Fetch and store rates
    const result = await fetchAndStoreRates(targetDate);

    console.log(
        `[ExchangeRateWorker] Job ${job.id} completed: ${result.ratesStored} rates stored from ${result.source}`
    );

    return {
        ...result,
        date: targetDate.toISOString().split('T')[0],
    };
}

// Create the worker
const exchangeRateWorker = new Worker<ExchangeRateJobData, ExchangeRateJobResult>(
    "exchange-rate-queue",
    processExchangeRateJob,
    {
        connection: redis as any,
        concurrency: 1, // Only process one at a time
    }
);

exchangeRateWorker.on("completed", (job, result) => {
    console.log(
        `[ExchangeRateWorker] Job ${job.id} completed: ${result.ratesStored} rates stored`
    );
});

exchangeRateWorker.on("failed", (job, err) => {
    console.error(
        `[ExchangeRateWorker] Job ${job?.id} failed: ${err.message}`
    );
});

console.log("[ExchangeRateWorker] Worker started!");

export { exchangeRateWorker };
