import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { fileSchemas, TemplateType } from "@/lib/templates";
import Papa from "papaparse";
import { checkRateLimit } from "@/lib/rate-limit";
import { validatePermission } from "@/lib/rbac";

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return new Response("Unauthorized", { status: 401 });

        const orgId = session.user.orgId;
        const role = (session.user as any).role;

        // RBAC Check
        try {
            validatePermission(role, "CATALOG_EDIT");
        } catch (e: any) {
            return new NextResponse(e.message, { status: 403 });
        }

        // Reusable Rate Limiting
        const limitCheck = await checkRateLimit({
            key: `import_${orgId}`,
            limit: 5,
            windowMs: 10 * 60 * 1000,
        });

        if (!limitCheck.success) {
            return new Response("Too Many Requests - Import Rate Limit Exceeded", { status: 429 });
        }

        const { type, csvData } = await req.json() as { type: TemplateType; csvData: string };

        if (!fileSchemas[type]) {
            return new Response("Invalid template type", { status: 400 });
        }

        const { data, errors } = Papa.parse(csvData, { header: true, skipEmptyLines: true });

        const validRows: any[] = [];
        const validationErrors: any[] = [];

        data.forEach((row: any, index) => {
            // 1. Key Normalization (e.g., "Work Title" -> "WorkTitle")
            const normalizedRow: any = {};
            Object.keys(row).forEach(key => {
                const cleanKey = key.trim().replace(/\s+/g, "");
                normalizedRow[cleanKey] = row[key];
            });

            // 2. Perform Zod Schema Validation
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

        // 3. Create IngestJob record (PENDING)
        const ingestJob = await db.ingestJob.create({
            data: {
                type,
                orgId,
                userId: (session.user as any).id,
                status: "PROCESSING",
                totalRows: data.length,
            }
        });

        // Ingest what's valid
        try {
            if (validRows.length > 0) {
                await db.$transaction(async (tx) => {
                    if (type === "Works") {
                        for (const row of validRows) {
                            await tx.work.upsert({
                                where: { iswc_orgId: { iswc: row.ISWC || `MOCK-${Date.now()}-${Math.random()}`, orgId } },
                                update: { title: row.Title },
                                create: { title: row.Title, iswc: row.ISWC, orgId },
                            });
                        }
                    } else if (type === "Recordings") {
                        for (const row of validRows) {
                            await tx.recording.upsert({
                                where: { isrc_orgId: { isrc: row.ISRC || `MOCK-${Date.now()}-${Math.random()}`, orgId } },
                                update: { title: row.Title, durationSec: row.DurationSec },
                                create: { title: row.Title, isrc: row.ISRC, durationSec: row.DurationSec, orgId },
                            });
                        }
                    } else if (type === "Writers") {
                        for (const row of validRows) {
                            const work = await tx.work.findFirst({
                                where: { title: row.WorkTitle, orgId }
                            });
                            if (work) {
                                const writer = await tx.writer.upsert({
                                    where: {
                                        ipiCae_orgId: { ipiCae: row.IPI || `MOCK-${Date.now()}`, orgId }
                                    },
                                    update: { name: row.Name },
                                    create: { name: row.Name, ipiCae: row.IPI, orgId },
                                });

                                await tx.workWriter.upsert({
                                    where: {
                                        workId_writerId: { workId: work.id, writerId: writer.id }
                                    },
                                    update: {
                                        splitPercent: row.SplitPercent,
                                        role: row.Role
                                    },
                                    create: {
                                        workId: work.id,
                                        writerId: writer.id,
                                        splitPercent: row.SplitPercent,
                                        role: row.Role
                                    },
                                });
                            }
                        }
                    } else if (type === "Statement Lines") {
                        const statementMap = new Map();
                        for (const row of validRows) {
                            const key = `${row.Source}-${row.Period}`;
                            if (!statementMap.has(key)) {
                                const statement = await tx.statement.create({
                                    data: { source: row.Source, period: row.Period, orgId }
                                });
                                statementMap.set(key, statement.id);
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
                        for (const row of validRows) {
                            const perStreamRate = row.Streams > 0 ? row.Revenue / row.Streams : 0;
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
                        const { parseCwrFile } = await import("@/lib/cwr-parser");
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

                    // Activity & Audit Logs
                    await tx.activity.create({
                        data: {
                            action: `CATALOG_IMPORTED`,
                            details: `Imported ${validRows.length} ${type} records (Job: ${ingestJob.id})`,
                            orgId,
                            userId: (session.user as any).id,
                            resourceType: "Catalog",
                        }
                    });

                    await tx.auditLog.create({
                        data: {
                            action: `IMPORTED_${type.toUpperCase()}`,
                            details: JSON.stringify({ valid: validRows.length, errors: validationErrors.length, jobId: ingestJob.id }),
                            evidenceHash: "import-job-" + ingestJob.id,
                            orgId,
                            userId: (session.user as any).id
                        }
                    });
                });
            }

            // Update Job Status
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
                errors: validationErrors
            });

        } catch (txnError: any) {
            await db.ingestJob.update({
                where: { id: ingestJob.id },
                data: { status: "FAILED", errors: txnError.message }
            });
            throw txnError;
        }

    } catch (err: any) {
        return new Response(err.message, { status: 500 });
    }
}
