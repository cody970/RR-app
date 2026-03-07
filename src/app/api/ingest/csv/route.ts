import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { db } from "@/lib/infra/db";
import { fileSchemas, TemplateType, industryTemplates, IndustrySource } from "@/lib/reports/templates";
import { autoMapHeaders, applyMapping } from "@/lib/ingest/mapping-utils";
import Papa from "papaparse";
import { checkRateLimit } from "@/lib/infra/rate-limit";
import { validatePermission } from "@/lib/auth/rbac";
import { logger } from "@/lib/infra/logger";
import { ApiErrors } from "@/lib/api/error-response";

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return ApiErrors.Unauthorized();

        const orgId = session.user.orgId;
        const role = session.user.role;

        if (!orgId) return ApiErrors.Forbidden("No organization linked to account");

        // RBAC Check
        try {
            validatePermission(role, "CATALOG_EDIT");
        } catch (e: any) {
            return ApiErrors.Forbidden(e.message);
        }

        // Reusable Rate Limiting
        const limitCheck = await checkRateLimit({
            key: `import_${orgId}`,
            limit: 5,
            windowMs: 10 * 60 * 1000,
        });

        if (!limitCheck.success) {
            return ApiErrors.TooManyRequests("Import Rate Limit Exceeded");
        }

        const body = await req.json().catch(() => ({}));
        const { type, csvData, sourceTemplate, customMapping } = body as {
            type: TemplateType;
            csvData: string;
            sourceTemplate?: IndustrySource;
            customMapping?: Record<string, string>;
        };

        if (!type || !csvData) {
            return ApiErrors.BadRequest("Missing required fields: type and csvData");
        }

        // Limit CSV data size (approx 10MB assuming UTF-8)
        if (csvData.length > 10 * 1024 * 1024) {
            return ApiErrors.BadRequest("CSV data too large (max 10MB)");
        }

        if (!fileSchemas[type]) {
            return ApiErrors.BadRequest("Invalid template type");
        }

        // Basic CSV Injection Protection
        const sanitizedData = csvData.split('\n').map(line =>
            line.split(',').map(cell => {
                const trimmed = cell.trim();
                if (['=', '+', '-', '@'].some(char => trimmed.startsWith(char))) {
                    return `'${cell}`;
                }
                return cell;
            }).join(',')
        ).join('\n');

        // Auto-detect delimiter (CSV or TSV)
        const { data, errors: parseErrors, meta } = Papa.parse(sanitizedData, {
            header: true,
            skipEmptyLines: 'greedy',
            dynamicTyping: true
        });

        if (parseErrors.length > 0 && data.length === 0) {
            return ApiErrors.BadRequest("Failed to parse CSV", parseErrors);
        }

        // Determine Mapping
        let mapping = customMapping;
        if (!mapping && sourceTemplate && industryTemplates[sourceTemplate]) {
            mapping = industryTemplates[sourceTemplate].mapping;
        }
        if (!mapping) {
            mapping = autoMapHeaders(meta.fields || [], type);
        }

        const validRows: any[] = [];
        const validationErrors: { row: number; errors: string[] }[] = [];

        data.forEach((row: any, index: number) => {
            // Apply Mapping
            const mappedRow = applyMapping(row, mapping!);

            // Normalize Keys (strip whitespace)
            const normalizedRow: Record<string, any> = {};
            Object.keys(mappedRow).forEach(key => {
                const cleanKey = key.trim().replace(/\s+/g, "");
                normalizedRow[cleanKey] = mappedRow[key];
            });

            const parsed = fileSchemas[type].safeParse(normalizedRow);
            if (parsed.success) {
                validRows.push(parsed.data);
            } else {
                validationErrors.push({
                    row: index + 2,
                    errors: parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`)
                });
            }
        });

        // 3. Create IngestJob record
        const ingestJob = await db.ingestJob.create({
            data: {
                type,
                orgId,
                userId: session.user.id,
                status: "PROCESSING",
                totalRows: data.length,
            }
        });

        // 4. Ingest with Batching
        const BATCH_SIZE = 500;
        try {
            for (let i = 0; i < validRows.length; i += BATCH_SIZE) {
                const batch = validRows.slice(i, i + BATCH_SIZE);

                await db.$transaction(async (tx: any) => {
                    if (type === "Works") {
                        for (const row of batch) {
                            await tx.work.upsert({
                                where: { iswc_orgId: { iswc: row.ISWC || `MOCK-${Date.now()}-${Math.random()}`, orgId } },
                                update: { title: row.Title },
                                create: { title: row.Title, iswc: row.ISWC, orgId },
                            });
                        }
                    } else if (type === "Recordings") {
                        for (const row of batch) {
                            await tx.recording.upsert({
                                where: { isrc_orgId: { isrc: row.ISRC || `MOCK-${Date.now()}-${Math.random()}`, orgId } },
                                update: { title: row.Title, durationSec: row.DurationSec },
                                create: { title: row.Title, isrc: row.ISRC, durationSec: row.DurationSec, orgId },
                            });
                        }
                    } else if (type === "Writers") {
                        for (const row of batch) {
                            const work = await tx.work.findFirst({
                                where: { title: row.WorkTitle, orgId }
                            });
                            if (work) {
                                const writer = await tx.writer.upsert({
                                    where: { ipiCae_orgId: { ipiCae: row.IPI || `MOCK-${Date.now()}`, orgId } },
                                    update: { name: row.Name },
                                    create: { name: row.Name, ipiCae: row.IPI, orgId },
                                });

                                await tx.workWriter.upsert({
                                    where: { workId_writerId: { workId: work.id, writerId: writer.id } },
                                    update: { splitPercent: row.SplitPercent, role: row.Role },
                                    create: { workId: work.id, writerId: writer.id, splitPercent: row.SplitPercent, role: row.Role },
                                });
                            }
                        }
                    } else if (type === "Statement Lines") {
                        const statementMap = new Map<string, string>();
                        for (const row of batch) {
                            const key = `${row.Source}-${row.Period}`;
                            if (!statementMap.has(key)) {
                                let statement = await tx.statement.findFirst({
                                    where: { source: row.Source, period: row.Period, orgId }
                                });
                                if (!statement) {
                                    statement = await tx.statement.create({
                                        data: { source: row.Source, period: row.Period, orgId }
                                    });
                                }
                                statementMap.set(key, statement!.id);
                            }
                            const statementId = statementMap.get(key);
                            await tx.statementLine.create({
                                data: {
                                    statementId,
                                    isrc: row.ISRC,
                                    uses: row.Uses,
                                    amount: row.Amount,
                                    title: row.Title,
                                    artist: row.Artist
                                }
                            });
                        }
                    } else if (type === "DSP Report") {
                        for (const row of batch) {
                            // Fix financial math: Avoid direct float division where possible
                            // Store revenue in cents/micros if needed, but here we just ensure a safe calculation
                            const revenueInMicros = Math.round(row.Revenue * 1000000);
                            const perStreamRateMicros = row.Streams > 0 ? Math.floor(revenueInMicros / row.Streams) : 0;
                            const perStreamRate = perStreamRateMicros / 1000000;

                            await tx.dspReport.create({
                                data: {
                                    source: row.Source,
                                    period: row.Period,
                                    territory: row.Territory || null,
                                    isrc: row.ISRC,
                                    title: row.Title,
                                    artist: row.Artist,
                                    streams: row.Streams,
                                    revenue: row.Revenue,
                                    perStreamRate,
                                    orgId,
                                }
                            });
                        }
                    } else if (type === "CWR File") {
                        const { parseCwrFile } = await import("@/lib/cwr/cwr-parser");
                        const cwrRecords = parseCwrFile(csvData);
                        for (const rec of cwrRecords) {
                            await tx.cwrRegistration.create({
                                data: {
                                    workTitle: rec.workTitle,
                                    iswc: rec.iswc,
                                    society: rec.society,
                                    territory: rec.territory,
                                    publisherName: rec.publisherName,
                                    publisherIpi: rec.publisherIpi,
                                    writerName: rec.writerName,
                                    writerIpi: rec.writerIpi,
                                    shares: rec.shares,
                                    recordType: rec.recordType,
                                    rawRecord: rec.rawRecord,
                                    orgId,
                                }
                            });
                        }
                    }
                });
            }

            // Post-Ingest
            await db.activity.create({
                data: {
                    action: `CATALOG_IMPORTED`,
                    details: `Imported ${validRows.length} ${type} records (Job: ${ingestJob.id})`,
                    orgId,
                    userId: session.user.id,
                    resourceType: "Catalog",
                }
            });

            await db.auditLog.create({
                data: {
                    action: `IMPORTED_${type.toUpperCase()}`,
                    details: JSON.stringify({ valid: validRows.length, errors: validationErrors.length, jobId: ingestJob.id, mappingUsed: !!mapping }),
                    evidenceHash: "import-job-" + ingestJob.id,
                    orgId,
                    userId: session.user.id
                }
            });

            await db.ingestJob.update({
                where: { id: ingestJob.id },
                data: {
                    status: "COMPLETED",
                    importedRows: validRows.length,
                    failedRows: validationErrors.length,
                    errors: validationErrors.length > 0 ? JSON.stringify(validationErrors) : null
                }
            });

            return NextResponse.json({
                success: true,
                jobId: ingestJob.id,
                imported: validRows.length,
                errors: validationErrors,
                mappingUsed: mapping
            });

        } catch (txnError: any) {
            const message = txnError?.message || "Internal Server Error during ingestion";
            logger.error({ err: txnError, jobId: ingestJob.id }, "Ingestion transaction failed");
            await db.ingestJob.update({
                where: { id: ingestJob.id },
                data: { status: "FAILED", errors: message }
            }).catch(() => { });
            return ApiErrors.Internal(message);
        }

    } catch (error: any) {
        logger.error({ err: error }, "Ingestion route error");
        return ApiErrors.Internal(error?.message || "An unexpected error occurred during ingestion");
    }
}
