/**
 * Statement Fetch Worker
 *
 * BullMQ worker that polls external sources (SFTP, API) for royalty statements.
 * Runs on a schedule defined per ingestion source.
 *
 * Supported source types:
 * - SFTP: Connects to society SFTP servers to download CSV files
 * - API: Pulls data from MLC/SoundExchange APIs
 *
 * After successful ingestion, auto-triggers discrepancy checks.
 */

import { Worker, Job } from "bullmq";
import { redis } from "@/lib/infra/redis";
import { db } from "@/lib/infra/db";
import { parseStatement, importStatement, type StatementFormat } from "@/lib/finance/statement-parser";
import { runDiscrepancyChecks } from "@/lib/music/discrepancy-engine";
import { notifyOrg } from "@/lib/infra/notify";
import { statementFetchQueue } from "@/lib/infra/queue";

// ---------- Types ----------

interface FetchJobData {
    sourceId: string;
    orgId: string;
    /** Whether this is a manual trigger vs scheduled */
    manual?: boolean;
}

interface FetchResult {
    filesProcessed: number;
    filesImported: number;
    filesFailed: number;
    errors: string[];
}

// ---------- Helpers ----------

/**
 * Get the current quarter period string (e.g., "2025-Q1").
 */
function getCurrentQuarterPeriod(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth(); // 0-indexed
    const quarter = Math.floor(month / 3) + 1;
    return `${year}-Q${quarter}`;
}

/**
 * Map society hint to statement format for parsing.
 */
function getStatementFormat(societyHint: string | null): StatementFormat | undefined {
    const formatMap: Record<string, StatementFormat> = {
        "MLC": "MLC_CSV",
        "SOUNDEXCHANGE": "SOUNDEXCHANGE_CSV",
        "ASCAP": "ASCAP_CSV",
        "BMI": "BMI_CSV",
    };
    return societyHint ? formatMap[societyHint] : undefined;
}

// ---------- SFTP Client ----------

/**
 * Fetch files from an SFTP server.
 * Uses ssh2-sftp-client for connectivity.
 */
async function fetchFromSFTP(
    host: string,
    port: number,
    username: string,
    password: string,
    remotePath: string
): Promise<Array<{ filename: string; content: string }>> {
    // Dynamic import to avoid bundling ssh2-sftp-client in the main bundle
    // In production, you'd install: npm install ssh2-sftp-client
    try {
        const SftpClient = (await import("ssh2-sftp-client")).default;
        const sftp = new SftpClient();

        await sftp.connect({
            host,
            port,
            username,
            password,
            readyTimeout: 20000,
            retries: 2,
            retry_minTimeout: 2000,
        });

        const files: Array<{ filename: string; content: string }> = [];

        // List files in remote directory
        const listing = await sftp.list(remotePath);

        for (const item of listing) {
            // Only process CSV files
            if (item.type === "-" && item.name.toLowerCase().endsWith(".csv")) {
                const fullPath = `${remotePath}/${item.name}`;
                const content = await sftp.get(fullPath);

                if (content) {
                    files.push({
                        filename: item.name,
                        content: content.toString("utf-8"),
                    });

                    // Optionally archive processed files
                    // await sftp.rename(fullPath, `${remotePath}/processed/${item.name}`);
                }
            }
        }

        await sftp.end();
        return files;
    } catch (error) {
        console.error("[SFTP] Connection/fetch error:", error);
        throw error;
    }
}

// ---------- API Clients ----------

/**
 * Fetch statement data from The MLC API.
 */
async function fetchFromMLCApi(
    orgId: string,
    apiKey?: string
): Promise<Array<{ filename: string; content: string }>> {
    const mlcApiKey = apiKey || process.env.MLC_API_KEY;
    if (!mlcApiKey) {
        throw new Error("MLC API key not configured");
    }

    // Import MLC client functions
    const { fetchDURPUnmatchedRecordings } = await import("@/lib/clients/mlc-client");

    try {
        // Fetch unmatched recordings data which contains royalty information
        const result = await fetchDURPUnmatchedRecordings({ limit: 1000 });

        if (!result.recordings || result.recordings.length === 0) {
            return [];
        }

        // Convert to CSV format for processing through existing parser
        const headers = [
            "Song Title",
            "ISRC",
            "Release Title",
            "Artist",
            "Royalty Amount",
            "Period",
        ].join(",");

        const rows = result.recordings.map((r) =>
            [
                `"${(r.songTitle || "").replace(/"/g, '""')}"`,
                r.isrc || "",
                `"${(r.releaseTitle || "").replace(/"/g, '""')}"`,
                `"${(r.featuredArtist || "").replace(/"/g, '""')}"`,
                r.royaltyAmount || 0,
                r.period || "",
            ].join(",")
        );

        const csvContent = [headers, ...rows].join("\n");
        const period = getCurrentQuarterPeriod();

        return [
            {
                filename: `mlc-durp-${period}.csv`,
                content: csvContent,
            },
        ];
    } catch (error) {
        console.error("[MLC API] Fetch error:", error);
        throw error;
    }
}

/**
 * Fetch statement data from SoundExchange API.
 */
async function fetchFromSoundExchangeApi(
    orgId: string,
    isrcs: string[]
): Promise<Array<{ filename: string; content: string }>> {
    const seApiKey = process.env.SOUNDEXCHANGE_API_KEY;
    if (!seApiKey) {
        throw new Error("SoundExchange API key not configured");
    }

    // Import SoundExchange client functions
    const { batchCheckISRCs } = await import("@/lib/clients/soundexchange-client");

    try {
        // Batch check ISRCs to get registration status
        const results = await batchCheckISRCs(isrcs);

        if (results.size === 0) {
            return [];
        }

        // Convert to CSV format
        const headers = [
            "ISRC",
            "Title",
            "Artist",
            "Registration Status",
            "Label",
        ].join(",");

        const rows: string[] = [];
        results.forEach((result, isrc) => {
            if (result.found && result.recordings.length > 0) {
                const r = result.recordings[0];
                rows.push(
                    [
                        isrc,
                        `"${(r.title || "").replace(/"/g, '""')}"`,
                        `"${(r.artist || "").replace(/"/g, '""')}"`,
                        r.registrationStatus || "unknown",
                        `"${(r.label || "").replace(/"/g, '""')}"`,
                    ].join(",")
                );
            }
        });

        if (rows.length === 0) {
            return [];
        }

        const csvContent = [headers, ...rows].join("\n");
        const period = new Date().toISOString().slice(0, 10);

        return [
            {
                filename: `soundexchange-check-${period}.csv`,
                content: csvContent,
            },
        ];
    } catch (error) {
        console.error("[SoundExchange API] Fetch error:", error);
        throw error;
    }
}

// ---------- Main Job Processor ----------

export async function processStatementFetchJob(
    job: Job<FetchJobData>
): Promise<FetchResult> {
    const { sourceId, orgId, manual } = job.data;
    console.log(
        `[StatementFetchWorker] Processing job for source ${sourceId}, org ${orgId}${manual ? " (manual)" : ""}`
    );

    const result: FetchResult = {
        filesProcessed: 0,
        filesImported: 0,
        filesFailed: 0,
        errors: [],
    };

    try {
        // Fetch the ingestion source configuration
        const source = await db.ingestionSource.findUnique({
            where: { id: sourceId },
            include: { organization: true },
        });

        if (!source) {
            throw new Error(`Ingestion source ${sourceId} not found`);
        }

        if (!source.enabled && !manual) {
            console.log(`[StatementFetchWorker] Source ${sourceId} is disabled, skipping`);
            return result;
        }

        let files: Array<{ filename: string; content: string }> = [];

        // Fetch files based on source type
        switch (source.type) {
            case "SFTP":
                if (!source.sftpHost || !source.sftpUsername) {
                    throw new Error("SFTP configuration incomplete");
                }
                // Note: In production, credentials should be stored encrypted in a secrets manager
                // (e.g., AWS Secrets Manager, HashiCorp Vault) rather than environment variables.
                // This implementation uses env vars as a baseline that can be swapped for a vault.
                const sftpPassword = process.env[`SFTP_PASSWORD_${sourceId}`] || process.env.SFTP_DEFAULT_PASSWORD;
                if (!sftpPassword) {
                    throw new Error("SFTP password not configured. Set SFTP_PASSWORD_{sourceId} or SFTP_DEFAULT_PASSWORD env var.");
                }
                files = await fetchFromSFTP(
                    source.sftpHost,
                    source.sftpPort || 22,
                    source.sftpUsername,
                    sftpPassword,
                    source.sftpPath || "/"
                );
                break;

            case "API":
                if (source.societyHint === "MLC") {
                    files = await fetchFromMLCApi(orgId);
                } else if (source.societyHint === "SOUNDEXCHANGE") {
                    // Get org's ISRCs to check
                    const recordings = await db.recording.findMany({
                        where: { orgId },
                        select: { isrc: true },
                    });
                    const isrcs = recordings
                        .filter((r) => r.isrc)
                        .map((r) => r.isrc as string);

                    if (isrcs.length > 0) {
                        files = await fetchFromSoundExchangeApi(orgId, isrcs);
                    }
                } else {
                    throw new Error(`Unsupported API society: ${source.societyHint}`);
                }
                break;

            default:
                throw new Error(`Unsupported source type: ${source.type}`);
        }

        console.log(`[StatementFetchWorker] Fetched ${files.length} files`);

        // Process each file
        for (const file of files) {
            result.filesProcessed++;

            try {
                // Parse the statement using the appropriate format for the society
                const format = getStatementFormat(source.societyHint);
                const parsed = parseStatement(file.content, format);

                if (parsed.source === "UNKNOWN" || parsed.lines.length === 0) {
                    result.filesFailed++;
                    result.errors.push(`${file.filename}: Could not parse or empty`);
                    continue;
                }

                // Import the statement
                const importResult = await importStatement(parsed, orgId, file.filename);

                // Run discrepancy checks in background
                runDiscrepancyChecks(importResult.statementId, orgId).catch((e) =>
                    console.error(`[StatementFetchWorker] Discrepancy check error:`, e)
                );

                result.filesImported++;
            } catch (error) {
                result.filesFailed++;
                result.errors.push(
                    `${file.filename}: ${error instanceof Error ? error.message : "Unknown error"}`
                );
            }
        }

        // Update source metadata
        await db.ingestionSource.update({
            where: { id: sourceId },
            data: {
                lastSyncAt: new Date(),
                lastReceivedAt: result.filesImported > 0 ? new Date() : undefined,
                totalImported: {
                    increment: result.filesImported,
                },
            },
        });

        // Log the fetch operation
        await db.ingestionLog.create({
            data: {
                sourceId,
                orgId,
                senderEmail: source.type === "SFTP" ? source.sftpHost || "sftp" : source.apiEndpoint || "api",
                subject: `${source.type} fetch: ${result.filesImported}/${result.filesProcessed} imported`,
                status: result.filesImported > 0 ? "SUCCESS" : result.filesProcessed > 0 ? "FAILED" : "SKIPPED",
                message:
                    result.errors.length > 0
                        ? result.errors.join("; ")
                        : `Successfully imported ${result.filesImported} files`,
                filesProcessed: result.filesProcessed,
            },
        });

        // Notify on completion
        if (result.filesImported > 0) {
            await notifyOrg(orgId, {
                type: "STATEMENT_IMPORT",
                title: "Statements Auto-Imported",
                message: `${result.filesImported} statement(s) automatically imported from ${source.name}`,
            });
        }

        console.log(
            `[StatementFetchWorker] Job complete: ${result.filesImported} imported, ${result.filesFailed} failed`
        );

        return result;
    } catch (error) {
        console.error(`[StatementFetchWorker] Job failed:`, error);

        // Log the failure
        await db.ingestionLog.create({
            data: {
                sourceId,
                orgId,
                senderEmail: "system",
                subject: "Automated fetch failed",
                status: "FAILED",
                message: error instanceof Error ? error.message : "Unknown error",
                filesProcessed: 0,
            },
        });

        throw error;
    }
}

// ---------- Worker Instance ----------

const statementFetchWorker = new Worker<FetchJobData>(
    "statement-fetch-queue",
    processStatementFetchJob,
    {
        connection: redis as ReturnType<typeof redis["duplicate"]>,
        concurrency: 2,
    }
);

statementFetchWorker.on("completed", (job, result) => {
    console.log(
        `[StatementFetchWorker] Job ${job.id} completed: ${result?.filesImported || 0} imported`
    );
});

statementFetchWorker.on("failed", (job, err) => {
    console.error(`[StatementFetchWorker] Job ${job?.id} failed: ${err.message}`);
});

console.log("[StatementFetchWorker] Worker started!");

// ---------- Scheduler ----------

/**
 * Schedule recurring jobs for all enabled sources.
 * Call this periodically (e.g., every hour) to maintain schedules.
 */
export async function scheduleIngestionJobs(): Promise<void> {
    const sources = await db.ingestionSource.findMany({
        where: {
            enabled: true,
            type: { in: ["SFTP", "API"] },
            schedule: { not: null },
        },
    });

    for (const source of sources) {
        if (!source.schedule) continue;

        try {
            // Add or update the repeatable job
            await statementFetchQueue.add(
                `fetch-${source.id}`,
                {
                    sourceId: source.id,
                    orgId: source.orgId,
                },
                {
                    repeat: {
                        pattern: source.schedule,
                    },
                    jobId: `scheduled-${source.id}`,
                }
            );

            console.log(
                `[StatementFetchWorker] Scheduled job for source ${source.id} with pattern: ${source.schedule}`
            );
        } catch (error) {
            console.error(
                `[StatementFetchWorker] Failed to schedule job for source ${source.id}:`,
                error
            );
        }
    }
}

/**
 * Trigger a manual fetch for a specific source.
 */
export async function triggerManualFetch(sourceId: string, orgId: string): Promise<string> {
    const job = await statementFetchQueue.add(
        `manual-fetch-${sourceId}`,
        {
            sourceId,
            orgId,
            manual: true,
        },
        {
            priority: 1, // High priority for manual requests
        }
    );

    return job.id || "unknown";
}

export default statementFetchWorker;
