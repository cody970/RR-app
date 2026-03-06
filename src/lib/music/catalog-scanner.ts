/**
 * Catalog Scanner Engine
 *
 * Core logic for discovering unregistered works and recordings.
 * Compares an org's catalog against PRO registrations (ASCAP/BMI)
 * and cross-references ISRCs↔ISWCs via MusicBrainz to find gaps.
 */

import { db } from "@/lib/infra/db";
import { logger } from "@/lib/infra/logger";
import { searchByTitle as songviewSearch, searchByISWC } from "@/lib/clients/songview-client";
import {
    lookupRecordingByISRC,
    isrcToISWC,
    searchWorkByTitle,
} from "@/lib/clients/musicbrainz-client";
import { searchByISRC as spotifySearchByISRC } from "@/lib/clients/spotify";
import { searchMLCByTitle } from "@/lib/clients/mlc-client";
import { searchByISRC as seSearchByISRC } from "@/lib/clients/soundexchange-client";
import { enrichRecordingCredits, findWriterIPI } from "@/lib/clients/muso-client";

export interface ScanProgress {
    scanId: string;
    totalItems: number;
    scannedItems: number;
    gapsFound: number;
}

export type ProgressCallback = (progress: ScanProgress) => Promise<void>;

/**
 * Run a full catalog scan for an organization.
 * Discovers works and recordings missing PRO registrations.
 */
export async function runCatalogScan(
    scanId: string,
    orgId: string,
    onProgress?: ProgressCallback
): Promise<{ totalGaps: number }> {
    // 1. Load the org's catalog
    const [works, recordings, existingRegistrations] = await Promise.all([
        db.work.findMany({
            where: { orgId },
            include: { writers: { include: { writer: true } } },
        }),
        db.recording.findMany({
            where: { orgId },
        }),
        db.registration.findMany({
            where: { work: { orgId } },
        }),
    ]);

    // Load DSP revenue data for impact estimation
    const dspReports = await db.dspReport.findMany({
        where: { orgId },
        select: { isrc: true, revenue: true, streams: true },
    });

    // Build a revenue lookup by ISRC
    const revenueByISRC = new Map<string, { totalRevenue: number; totalStreams: number }>();
    for (const report of dspReports) {
        const existing = revenueByISRC.get(report.isrc) || { totalRevenue: 0, totalStreams: 0 };
        existing.totalRevenue += report.revenue;
        existing.totalStreams += report.streams;
        revenueByISRC.set(report.isrc, existing);
    }

    // Build a set of registered work+society combos
    const registeredSet = new Set<string>();
    for (const reg of existingRegistrations) {
        registeredSet.add(`${reg.workId}:${reg.society}`);
    }

    const totalItems = works.length + recordings.length;
    let scannedItems = 0;
    let gapsFound = 0;

    // Update scan record with totals
    await db.catalogScan.update({
        where: { id: scanId },
        data: {
            totalWorks: works.length,
            totalRecordings: recordings.length,
            status: "SCANNING",
        },
    });

    // ---------- Phase 1: Check Works for PRO Registration Gaps ----------

    for (const work of works) {
        try {
            const writerName = work.writers?.[0]?.writer?.name;

            // Check if already registered at ASCAP
            const ascapRegistered = registeredSet.has(`${work.id}:ASCAP`);
            // Check if already registered at BMI
            const bmiRegistered = registeredSet.has(`${work.id}:BMI`);

            if (!ascapRegistered || !bmiRegistered) {
                // Query Songview to see if it's actually registered externally
                const songviewResult = work.iswc
                    ? await searchByISWC(work.iswc)
                    : await songviewSearch(work.title, writerName);

                if (!songviewResult.found) {
                    // Not found in any PRO — definite gap
                    await db.registrationGap.create({
                        data: {
                            scanId,
                            workId: work.id,
                            title: work.title,
                            iswc: work.iswc,
                            artistName: writerName,
                            society: "ASCAP/BMI",
                            gapType: "NO_REGISTRATION",
                            confidence: 85,
                            estimatedImpact: estimateWorkImpact(work.id, recordings, revenueByISRC),
                            songviewMatch: null,
                        },
                    });
                    gapsFound++;
                } else if (songviewResult.society === "ASCAP" && !bmiRegistered) {
                    // Registered at ASCAP but not BMI — partial gap
                    await db.registrationGap.create({
                        data: {
                            scanId,
                            workId: work.id,
                            title: work.title,
                            iswc: work.iswc || songviewResult.iswc,
                            artistName: writerName,
                            society: "BMI",
                            gapType: "MISSING_WORK",
                            confidence: 75,
                            estimatedImpact: estimateWorkImpact(work.id, recordings, revenueByISRC) * 0.3,
                            songviewMatch: songviewResult.rawData as object ?? null,
                        },
                    });
                    gapsFound++;
                } else if (songviewResult.society === "BMI" && !ascapRegistered) {
                    await db.registrationGap.create({
                        data: {
                            scanId,
                            workId: work.id,
                            title: work.title,
                            iswc: work.iswc || songviewResult.iswc,
                            artistName: writerName,
                            society: "ASCAP",
                            gapType: "MISSING_WORK",
                            confidence: 75,
                            estimatedImpact: estimateWorkImpact(work.id, recordings, revenueByISRC) * 0.3,
                            songviewMatch: songviewResult.rawData as object ?? null,
                        },
                    });
                    gapsFound++;
                }
            }

            // Check for missing ISWC
            if (!work.iswc) {
                const mbWorks = await searchWorkByTitle(work.title, writerName);
                if (mbWorks.length > 0 && mbWorks[0].iswcs?.length) {
                    // MusicBrainz has an ISWC for this work but our DB doesn't
                    await db.registrationGap.create({
                        data: {
                            scanId,
                            workId: work.id,
                            title: work.title,
                            iswc: mbWorks[0].iswcs[0],
                            artistName: writerName,
                            society: "ASCAP/BMI",
                            gapType: "MISSING_SPLIT",
                            confidence: mbWorks[0].iswcs ? 90 : 60,
                            musicbrainzId: mbWorks[0].id,
                        },
                    });
                    gapsFound++;
                }
            }
        } catch (e) {
            logger.error({ err: e, workId: work.id }, "Error scanning work");
        }

        scannedItems++;
        if (onProgress && scannedItems % 10 === 0) {
            await onProgress({ scanId, totalItems, scannedItems, gapsFound });
        }
    }

    // ---------- Phase 2: Check Recordings for Orphaned ISRCs ----------

    for (const recording of recordings) {
        try {
            if (recording.isrc) {
                // Check if this ISRC has revenue but no linked work
                const revenue = revenueByISRC.get(recording.isrc);

                if (!recording.workId) {
                    // Recording exists but is not linked to a composition work
                    const workLink = await isrcToISWC(recording.isrc);

                    await db.registrationGap.create({
                        data: {
                            scanId,
                            recordingId: recording.id,
                            title: recording.title,
                            isrc: recording.isrc,
                            artistName: null,
                            society: "ASCAP/BMI",
                            gapType: "MISSING_RECORDING",
                            confidence: workLink.iswc ? 90 : 70,
                            estimatedImpact: revenue?.totalRevenue ?? null,
                            iswc: workLink.iswc,
                            musicbrainzId: workLink.workId,
                        },
                    });
                    gapsFound++;
                }

                // Also validate the ISRC is on Spotify (exists in distribution)
                if (process.env.SPOTIFY_CLIENT_ID) {
                    const spotifyTrack = await spotifySearchByISRC(recording.isrc);
                    if (spotifyTrack && !recording.workId) {
                        // Track is actively streaming but has no composition registration
                        // (already flagged above, but this gives us artist info)
                    }
                }
            }
        } catch (e) {
            logger.error({ err: e, recordingId: recording.id }, "Error scanning recording");
        }

        scannedItems++;
        if (onProgress && scannedItems % 10 === 0) {
            await onProgress({ scanId, totalItems, scannedItems, gapsFound });
        }
    }

    // ---------- Phase 3: MLC + SoundExchange Gap Check ----------

    // Phase 3a: Check works against The MLC for mechanical licensing gaps
    if (process.env.MLC_API_KEY) {
        for (const work of works) {
            try {
                const writerName = work.writers?.[0]?.writer?.name;
                const mlcResult = await searchMLCByTitle(work.title, writerName);

                if (!mlcResult.found) {
                    await db.registrationGap.create({
                        data: {
                            scanId,
                            workId: work.id,
                            title: work.title,
                            iswc: work.iswc,
                            artistName: writerName,
                            society: "MLC",
                            gapType: "NO_REGISTRATION",
                            confidence: 80,
                            estimatedImpact: estimateWorkImpact(work.id, recordings, revenueByISRC) * 0.15,
                        },
                    });
                    gapsFound++;
                } else if (mlcResult.works.some((w) => w.claimStatus === "UNCLAIMED")) {
                    await db.registrationGap.create({
                        data: {
                            scanId,
                            workId: work.id,
                            title: work.title,
                            iswc: work.iswc,
                            artistName: writerName,
                            society: "MLC",
                            gapType: "MISSING_SPLIT",
                            confidence: 90,
                            estimatedImpact: mlcResult.unclaimedAmount ?? null,
                        },
                    });
                    gapsFound++;
                }
            } catch (e) {
                console.error(`MLC check error for work ${work.id}:`, e);
            }
        }
    }

    // Phase 3b: Check recordings against SoundExchange
    if (process.env.SOUNDEXCHANGE_API_KEY) {
        for (const recording of recordings) {
            try {
                if (recording.isrc) {
                    const seResult = await seSearchByISRC(recording.isrc);

                    if (!seResult.found) {
                        const revenue = revenueByISRC.get(recording.isrc);
                        await db.registrationGap.create({
                            data: {
                                scanId,
                                recordingId: recording.id,
                                title: recording.title,
                                isrc: recording.isrc,
                                artistName: null,
                                society: "SoundExchange",
                                gapType: "NO_REGISTRATION",
                                confidence: 80,
                                estimatedImpact: revenue ? revenue.totalRevenue * 0.10 : null,
                            },
                        });
                        gapsFound++;
                    }
                }
            } catch (e) {
                console.error(`SoundExchange check error for recording ${recording.id}:`, e);
            }
        }
    }

    // ---------- Phase 4: Enrichment & Revenue Matching ----------

    const scanGaps = await db.registrationGap.findMany({
        where: { scanId },
    });

    const workFindings = await db.finding.findMany({
        where: { orgId, type: "STATEMENT_UNMATCHED_WORK" },
    });

    for (const gap of scanGaps) {
        try {
            let updatedImpact = gap.estimatedImpact || 0;
            let needsUpdate = false;

            // 1. Muso.ai Enrichment
            if (gap.isrc) {
                const musoData = await enrichRecordingCredits(gap.isrc);
                if (musoData?.found && musoData.credits.length > 0) {
                    // Enrich artist name if missing
                    if (!gap.artistName) {
                        gap.artistName = musoData.credits[0].name;
                        needsUpdate = true;
                    }

                    // Look for missing writer IPIs
                    if (gap.gapType === "MISSING_SPLIT" || gap.gapType === "NO_REGISTRATION") {
                        // Find writers for this work
                        const work = works.find((w: any) => w.id === gap.workId);
                        if (work) {
                            for (const ww of work.writers) {
                                if (!ww.writer.ipiCae) {
                                    const musoWriter = await findWriterIPI(ww.writer.name);
                                    if (musoWriter.ipiNameNumber) {
                                        // Update the gap metadata (using songviewMatch for now as a catch-all)
                                        const matchData = (gap.songviewMatch as any) || {};
                                        matchData.musoEnrichment = {
                                            writerName: ww.writer.name,
                                            foundIpi: musoWriter.ipiNameNumber,
                                            musoProfileId: musoWriter.musoProfileId
                                        };
                                        gap.songviewMatch = matchData;
                                        needsUpdate = true;
                                    }
                                }
                            }
                        }
                    }
                }
            }

            // 2. Revenue Matching
            const matchingFinding = workFindings.find((f: any) =>
                (f.metadataFix?.toLowerCase().includes(gap.title.toLowerCase())) ||
                (gap.isrc && f.metadataFix?.includes(gap.isrc))
            );

            if (matchingFinding) {
                updatedImpact += (matchingFinding.estimatedImpact || 0);
                gap.estimatedImpact = updatedImpact;
                needsUpdate = true;
            }

            if (needsUpdate) {
                await db.registrationGap.update({
                    where: { id: gap.id },
                    data: {
                        artistName: gap.artistName,
                        estimatedImpact: gap.estimatedImpact,
                        songviewMatch: gap.songviewMatch as any
                    }
                });
            }
        } catch (e) {
            logger.error({ err: e, gapId: gap.id }, "Error enriching gap");
        }
    }

    // ---------- Finalize ----------

    await db.catalogScan.update({
        where: { id: scanId },
        data: {
            status: "COMPLETE",
            scannedCount: scannedItems,
            unregisteredCount: gapsFound,
        },
    });

    return { totalGaps: gapsFound };
}

/**
 * Estimate the revenue impact for a work based on its recordings' DSP data.
 */
function estimateWorkImpact(
    workId: string,
    recordings: { id: string; isrc: string | null; workId: string | null }[],
    revenueByISRC: Map<string, { totalRevenue: number; totalStreams: number }>
): number {
    const workRecordings = recordings.filter((r) => r.workId === workId);
    let totalImpact = 0;

    for (const rec of workRecordings) {
        if (rec.isrc) {
            const revenue = revenueByISRC.get(rec.isrc);
            if (revenue) {
                // Estimate publishing share as ~25% of total revenue
                totalImpact += revenue.totalRevenue * 0.25;
            }
        }
    }

    return totalImpact;
}
