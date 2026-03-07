/**
 * Registration Service
 *
 * Orchestrates work/recording registration across all societies.
 * Routes to TuneRegistry API or CWR file generation depending on method.
 */

import { db } from "@/lib/infra/db";
import { submitWorkRegistration, convertGapToRegistration, checkSubmissionStatus } from "@/lib/clients/tuneregistry-client";
import { generateCwrFile, generateCwrWithCoPublisher } from "@/lib/cwr/cwr-generator";

// ---------- Types ----------

export type RegistrationMethod = "TUNEREGISTRY" | "CWR_GENERATE" | "MANUAL";

export interface RegisterWorksInput {
    orgId: string;
    workIds: string[];
    societies: string[];
    method: RegistrationMethod;
    publisherName?: string;
    publisherIpi?: string;
    coPublisherSplit?: number; // default 5
}

export interface RegisterFromGapsInput {
    orgId: string;
    gapIds: string[];
    societies?: string[];
    method: RegistrationMethod;
    publisherName?: string;
    publisherIpi?: string;
    coPublisherSplit?: number;
}

export interface RegistrationResult {
    batchId: string;
    totalWorks: number;
    submitted: number;
    failed: number;
    cwrFileContent?: string; // Only for CWR_GENERATE method
    errors: string[];
}

// ---------- Main Functions ----------

/**
 * Register works with specified societies via chosen method.
 */
export async function registerWorks(
    input: RegisterWorksInput
): Promise<RegistrationResult> {
    const { orgId, workIds, societies, method } = input;

    // Create batch record
    const batch = await db.registrationBatch.create({
        data: {
            orgId,
            totalWorks: workIds.length,
            societies,
            submittedVia: method,
            status: "PROCESSING",
        },
    });

    // Fetch works with writers
    const works = await db.work.findMany({
        where: { id: { in: workIds }, orgId },
        include: {
            writers: { include: { writer: true } },
        },
    });

    if (works.length === 0) {
        await db.registrationBatch.update({
            where: { id: batch.id },
            data: { status: "FAILED" },
        });
        return {
            batchId: batch.id,
            totalWorks: 0,
            submitted: 0,
            failed: 0,
            errors: ["No works found for the given IDs"],
        };
    }

    if (method === "CWR_GENERATE") {
        return handleCwrGeneration(batch.id, works, societies, input);
    }

    if (method === "TUNEREGISTRY") {
        return handleTuneRegistrySubmission(batch.id, works, societies);
    }

    // MANUAL — just create registration records with PENDING status
    return handleManualRegistration(batch.id, works, societies);
}

/**
 * Register directly from catalog scan gaps.
 */
export async function registerFromGaps(
    input: RegisterFromGapsInput
): Promise<RegistrationResult> {
    const { orgId, gapIds, method } = input;

    // Fetch gaps
    const gaps = await db.registrationGap.findMany({
        where: { id: { in: gapIds } },
    });

    if (gaps.length === 0) {
        return {
            batchId: "",
            totalWorks: 0,
            submitted: 0,
            failed: 0,
            errors: ["No gaps found"],
        };
    }

    // Determine societies from gaps if not specified
    const societies =
        input.societies || [...new Set(gaps.map((g) => g.society))];

    // Create batch
    const batch = await db.registrationBatch.create({
        data: {
            orgId,
            totalWorks: gaps.length,
            societies,
            submittedVia: method,
            status: "PROCESSING",
        },
    });

    if (method === "TUNEREGISTRY") {
        let submitted = 0;
        let failed = 0;
        const errors: string[] = [];

        for (const gap of gaps) {
            try {
                const work = convertGapToRegistration({
                    title: gap.title,
                    iswc: gap.iswc,
                    artistName: gap.artistName,
                    society: gap.society,
                });

                const targetSocieties = societies.includes(gap.society)
                    ? [gap.society]
                    : societies;

                const result = await submitWorkRegistration(
                    work,
                    targetSocieties
                );

                if (result.success) {
                    submitted++;
                    await db.registrationGap.update({
                        where: { id: gap.id },
                        data: { status: "REGISTERING" },
                    });
                } else {
                    failed++;
                    errors.push(
                        `${gap.title}: ${result.message || "Unknown error"}`
                    );
                }
            } catch (e) {
                failed++;
                errors.push(
                    `${gap.title}: ${e instanceof Error ? e.message : String(e)}`
                );
            }
        }

        await db.registrationBatch.update({
            where: { id: batch.id },
            data: {
                submitted,
                rejected: failed,
                status: "COMPLETE",
            },
        });

        return {
            batchId: batch.id,
            totalWorks: gaps.length,
            submitted,
            failed,
            errors,
        };
    }

    // CWR_GENERATE for gaps
    const cwrWorks: CwrWorkInput[] = gaps.map((gap) => {
        const nameParts = (gap.artistName || "Unknown").split(" ");
        const lastName = nameParts.pop() || "Unknown";
        const firstName = nameParts.join(" ") || "";

        return {
            title: gap.title,
            iswc: gap.iswc,
            writers: [
                {
                    firstName,
                    lastName,
                    role: "CA",
                    prShare: 100,
                },
            ],
            publishers: [],
        };
    });

    const options: CwrFileOptions = {
        senderName: input.publisherName || "RoyaltyRadar",
        senderId: input.publisherIpi || "000000000",
    };

    const cwrContent =
        input.publisherName && input.publisherIpi
            ? generateCwrWithCoPublisher(
                cwrWorks,
                input.publisherName,
                input.publisherIpi,
                input.coPublisherSplit || 5,
                options
            )
            : generateCwrFile(cwrWorks, options);

    await db.registrationBatch.update({
        where: { id: batch.id },
        data: { submitted: gaps.length, status: "COMPLETE" },
    });

    return {
        batchId: batch.id,
        totalWorks: gaps.length,
        submitted: gaps.length,
        failed: 0,
        cwrFileContent: cwrContent,
        errors: [],
    };
}

/**
 * Generate downloadable CWR file from works.
 */
export async function generateCwrForDownload(
    orgId: string,
    workIds: string[],
    publisherName?: string,
    publisherIpi?: string,
    coPublisherSplit: number = 5
): Promise<string> {
    const works = await db.work.findMany({
        where: { id: { in: workIds }, orgId },
        include: {
            writers: { include: { writer: true } },
        },
    });

    const cwrWorks: CwrWorkInput[] = works.map((work) => ({
        title: work.title,
        iswc: work.iswc,
        writers: work.writers.map((ww) => ({
            firstName: ww.writer.name.split(" ").slice(0, -1).join(" ") || "",
            lastName: ww.writer.name.split(" ").pop() || ww.writer.name,
            ipiNameNumber: ww.writer.ipiCae || undefined,
            role: (ww.role as string) || "CA",
            prShare: ww.splitPercent,
        })),
        publishers: [],
    }));

    const options: CwrFileOptions = {
        senderName: publisherName || "RoyaltyRadar",
        senderId: publisherIpi || "000000000",
    };

    if (publisherName && publisherIpi) {
        return generateCwrWithCoPublisher(
            cwrWorks,
            publisherName,
            publisherIpi,
            coPublisherSplit,
            options
        );
    }

    return generateCwrFile(cwrWorks, options);
}

/**
 * Check and update registration statuses for a batch.
 */
export async function checkBatchStatuses(batchId: string): Promise<void> {
    const registrations = await db.registration.findMany({
        where: {
            submissionId: { not: null },
            status: { in: ["PENDING", "SUBMITTED"] },
        },
    });

    for (const reg of registrations) {
        if (!reg.submissionId) continue;
        const status = await checkSubmissionStatus(reg.submissionId);
        if (status && status.status !== reg.status) {
            await db.registration.update({
                where: { id: reg.id },
                data: {
                    status: status.status,
                    confirmationId: status.confirmationId || reg.confirmationId,
                    acknowledgedAt: status.acknowledgedAt
                        ? new Date(status.acknowledgedAt)
                        : reg.acknowledgedAt,
                    errors: status.errors?.join("; ") || reg.errors,
                },
            });
        }
    }
}

// ---------- Internal Handlers ----------

async function handleTuneRegistrySubmission(
    batchId: string,
    works: Awaited<ReturnType<typeof db.work.findMany>>,
    societies: string[]
): Promise<RegistrationResult> {
    let submitted = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const work of works) {
        try {
            const tuneWork = convertGapToRegistration({
                title: work.title,
                iswc: work.iswc,
                society: societies[0] || "ASCAP",
            });

            const result = await submitWorkRegistration(tuneWork, societies);

            if (result.success) {
                submitted++;
                // Create/update registration record
                for (const society of societies) {
                    await db.registration.upsert({
                        where: {
                            id: `${work.id}_${society}`, // pseudo-unique
                        },
                        create: {
                            workId: work.id,
                            society,
                            status: "SUBMITTED",
                            totalSplitRegistered: 100,
                            submissionId: result.submissionId,
                            submittedAt: new Date(),
                            submittedVia: "TUNEREGISTRY",
                        },
                        update: {
                            status: "SUBMITTED",
                            submissionId: result.submissionId,
                            submittedAt: new Date(),
                            submittedVia: "TUNEREGISTRY",
                        },
                    });
                }
            } else {
                failed++;
                errors.push(
                    `${work.title}: ${result.message || "Unknown error"}`
                );
            }
        } catch (e) {
            failed++;
            errors.push(
                `${work.title}: ${e instanceof Error ? e.message : String(e)}`
            );
        }
    }

    await db.registrationBatch.update({
        where: { id: batchId },
        data: { submitted, rejected: failed, status: "COMPLETE" },
    });

    return {
        batchId,
        totalWorks: works.length,
        submitted,
        failed,
        errors,
    };
}

async function handleCwrGeneration(
    batchId: string,
    works: Awaited<ReturnType<typeof db.work.findMany>>,
    societies: string[],
    input: RegisterWorksInput
): Promise<RegistrationResult> {
    const cwrWorks: CwrWorkInput[] = works.map((work) => ({
        title: work.title,
        iswc: work.iswc,
        writers:
            "writers" in work && Array.isArray((work as any).writers)
                ? (work as any).writers.map((ww: any) => ({
                    firstName:
                        ww.writer.name.split(" ").slice(0, -1).join(" ") ||
                        "",
                    lastName:
                        ww.writer.name.split(" ").pop() || ww.writer.name,
                    ipiNameNumber: ww.writer.ipiCae || undefined,
                    role: ww.role || "CA",
                    prShare: ww.splitPercent,
                }))
                : [],
        publishers: [],
    }));

    const options: CwrFileOptions = {
        senderName: input.publisherName || "RoyaltyRadar",
        senderId: input.publisherIpi || "000000000",
    };

    const cwrContent =
        input.publisherName && input.publisherIpi
            ? generateCwrWithCoPublisher(
                cwrWorks,
                input.publisherName,
                input.publisherIpi,
                input.coPublisherSplit || 5,
                options
            )
            : generateCwrFile(cwrWorks, options);

    // Create registration records
    for (const work of works) {
        for (const society of societies) {
            await db.registration.create({
                data: {
                    workId: work.id,
                    society,
                    status: "CWR_GENERATED",
                    totalSplitRegistered: 100,
                    submittedVia: "CWR_UPLOAD",
                },
            });
        }
    }

    await db.registrationBatch.update({
        where: { id: batchId },
        data: { submitted: works.length, status: "COMPLETE" },
    });

    return {
        batchId,
        totalWorks: works.length,
        submitted: works.length,
        failed: 0,
        cwrFileContent: cwrContent,
        errors: [],
    };
}

async function handleManualRegistration(
    batchId: string,
    works: Awaited<ReturnType<typeof db.work.findMany>>,
    societies: string[]
): Promise<RegistrationResult> {
    for (const work of works) {
        for (const society of societies) {
            await db.registration.create({
                data: {
                    workId: work.id,
                    society,
                    status: "PENDING",
                    totalSplitRegistered: 100,
                    submittedVia: "MANUAL",
                },
            });
        }
    }

    await db.registrationBatch.update({
        where: { id: batchId },
        data: {
            submitted: works.length,
            status: "COMPLETE",
        },
    });

    return {
        batchId,
        totalWorks: works.length,
        submitted: works.length,
        failed: 0,
        errors: [],
    };
}
