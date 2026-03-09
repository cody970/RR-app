/**
 * DSP Profile Duplicate Detection Engine
 *
 * Searches an org's DspReport data for artists whose names appear with
 * different spellings or casing across DSPs (e.g. "Taylor Swift" on Spotify vs
 * "T. Swift" on Apple Music).  Such fragmentation can cause revenue to be
 * attributed to separate unlinked profiles, making royalty recovery harder.
 *
 * Algorithm
 * ---------
 * 1. Collect every unique (source, artist) pair from the org's DspReport rows.
 * 2. Normalise every artist name (lower-case, strip punctuation / feat-tags).
 * 3. Build a graph where two entries are connected when their normalised names
 *    are ≥ SIMILARITY_THRESHOLD similar (using existing `similarity()` helper).
 * 4. Union-Find the connected components → each component is a "duplicate group".
 * 5. Only groups that span ≥ 2 distinct DSP sources *or* contain ≥ 2 different
 *    raw name variants are considered genuine duplicates.
 * 6. Persist each group as a DspDuplicateGroup row.
 */

import { db } from "@/lib/infra/db";
import { logger } from "@/lib/infra/logger";
import { similarity, normalizeTitle } from "@/lib/music/music";

/** Minimum similarity score (0–100) to consider two names the same artist. */
const SIMILARITY_THRESHOLD = 82;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DspEntry {
    source: string;
    rawName: string;
    normalizedName: string;
    totalStreams: number;
    totalRevenue: number;
}

export interface DuplicateGroup {
    canonicalName: string;
    aliases: string[];
    dsps: string[];
    totalStreams: number;
    estimatedRevenue: number;
    confidence: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Union-Find (disjoint set) for grouping similar entries.
 */
function makeUnionFind(n: number) {
    const parent = Array.from({ length: n }, (_, i) => i);
    const rank = new Array<number>(n).fill(0);

    function find(x: number): number {
        if (parent[x] !== x) parent[x] = find(parent[x]);
        return parent[x];
    }

    function union(x: number, y: number): void {
        const px = find(x);
        const py = find(y);
        if (px === py) return;
        if (rank[px] < rank[py]) {
            parent[px] = py;
        } else if (rank[px] > rank[py]) {
            parent[py] = px;
        } else {
            parent[py] = px;
            rank[px]++;
        }
    }

    return { find, union };
}

/**
 * Pick the most common (or longest) name from a set of aliases as the
 * canonical display name.
 */
function pickCanonicalName(names: string[]): string {
    const freq = new Map<string, number>();
    for (const n of names) freq.set(n, (freq.get(n) ?? 0) + 1);
    let best = names[0];
    let bestCount = 0;
    for (const [name, count] of freq) {
        if (count > bestCount || (count === bestCount && name.length > best.length)) {
            best = name;
            bestCount = count;
        }
    }
    return best;
}

// ---------------------------------------------------------------------------
// Core detection
// ---------------------------------------------------------------------------

/**
 * Detect duplicate artist profiles in the given org's DspReport data.
 * Returns an array of DuplicateGroup objects (not yet persisted).
 */
export function detectDuplicateProfiles(entries: DspEntry[]): DuplicateGroup[] {
    if (entries.length === 0) return [];

    // Build union-find over entry indices
    const uf = makeUnionFind(entries.length);

    for (let i = 0; i < entries.length; i++) {
        for (let j = i + 1; j < entries.length; j++) {
            // Skip if already in the same component
            if (uf.find(i) === uf.find(j)) continue;

            const score = similarity(entries[i].normalizedName, entries[j].normalizedName);
            if (score >= SIMILARITY_THRESHOLD) {
                uf.union(i, j);
            }
        }
    }

    // Collect components
    const components = new Map<number, DspEntry[]>();
    for (let i = 0; i < entries.length; i++) {
        const root = uf.find(i);
        if (!components.has(root)) components.set(root, []);
        components.get(root)!.push(entries[i]);
    }

    const groups: DuplicateGroup[] = [];

    for (const members of components.values()) {
        const uniqueNames = [...new Set(members.map((e) => e.rawName))];
        const uniqueDsps = [...new Set(members.map((e) => e.source))];

        // Only flag as duplicate when there are ≥2 distinct raw names OR
        // the same artist appears on ≥2 different DSPs
        const isMultiDsp = uniqueDsps.length >= 2;
        const hasNameVariants = uniqueNames.length >= 2;
        if (!isMultiDsp && !hasNameVariants) continue;

        // Aggregate totals across the component
        let totalStreams = 0;
        let totalRevenue = 0;
        for (const entry of members) {
            totalStreams += entry.totalStreams;
            totalRevenue += entry.totalRevenue;
        }

        // Confidence: higher when names are more similar and more DSPs are involved
        const maxSimilarity =
            uniqueNames.length === 1
                ? 100
                : (() => {
                      let best = 0;
                      for (let i = 0; i < uniqueNames.length; i++) {
                          for (let j = i + 1; j < uniqueNames.length; j++) {
                              best = Math.max(best, similarity(uniqueNames[i], uniqueNames[j]));
                          }
                      }
                      return best;
                  })();

        const dspBonus = Math.min((uniqueDsps.length - 1) * 5, 15);
        const confidence = Math.min(100, Math.round(maxSimilarity * 0.85 + dspBonus));

        groups.push({
            canonicalName: pickCanonicalName(members.map((e) => e.rawName)),
            aliases: uniqueNames,
            dsps: uniqueDsps,
            totalStreams,
            estimatedRevenue: totalRevenue,
            confidence,
        });
    }

    // Sort by total streams descending (most impactful first)
    groups.sort((a, b) => b.totalStreams - a.totalStreams);

    return groups;
}

// ---------------------------------------------------------------------------
// Database integration
// ---------------------------------------------------------------------------

/**
 * Run a full DSP duplicate profile scan for an org and persist results.
 * Updates the DspDuplicateScan row as it progresses.
 */
export async function runDspDuplicateScan(scanId: string, orgId: string): Promise<void> {
    try {
        await db.dspDuplicateScan.update({
            where: { id: scanId },
            data: { status: "SCANNING" },
        });

        // ----------------------------------------------------------------
        // 1. Load all DSP reports for this org
        // ----------------------------------------------------------------
        const reports = await db.dspReport.findMany({
            where: { orgId, artist: { not: null } },
            select: { source: true, artist: true, streams: true, revenue: true },
        });

        logger.info({ scanId, orgId, reportCount: reports.length }, "dsp_duplicate_scan: loaded reports");

        if (reports.length === 0) {
            await db.dspDuplicateScan.update({
                where: { id: scanId },
                data: { status: "COMPLETE", totalArtists: 0, duplicatesFound: 0 },
            });
            return;
        }

        // ----------------------------------------------------------------
        // 2. Aggregate by (source, artist)
        // ----------------------------------------------------------------
        const entryMap = new Map<string, DspEntry>();

        for (const report of reports) {
            const rawName = report.artist!.trim();
            if (!rawName) continue;
            const key = `${report.source}::${rawName.toLowerCase()}`;
            const existing = entryMap.get(key);
            if (existing) {
                existing.totalStreams += report.streams;
                existing.totalRevenue += Number(report.revenue);
            } else {
                entryMap.set(key, {
                    source: report.source,
                    rawName,
                    normalizedName: normalizeTitle(rawName),
                    totalStreams: report.streams,
                    totalRevenue: Number(report.revenue),
                });
            }
        }

        const entries = [...entryMap.values()];
        const totalArtists = new Set(entries.map((e) => e.normalizedName)).size;

        // ----------------------------------------------------------------
        // 3. Detect duplicates
        // ----------------------------------------------------------------
        const groups = detectDuplicateProfiles(entries);

        logger.info(
            { scanId, totalArtists, duplicatesFound: groups.length },
            "dsp_duplicate_scan: detection complete"
        );

        // ----------------------------------------------------------------
        // 4. Persist groups
        // ----------------------------------------------------------------
        for (const group of groups) {
            await db.dspDuplicateGroup.create({
                data: {
                    scanId,
                    canonicalName: group.canonicalName,
                    aliases: group.aliases,
                    dsps: group.dsps,
                    totalStreams: group.totalStreams,
                    estimatedRevenue: group.estimatedRevenue.toFixed(4),
                    confidence: group.confidence,
                },
            });
        }

        // ----------------------------------------------------------------
        // 5. Mark scan complete
        // ----------------------------------------------------------------
        await db.dspDuplicateScan.update({
            where: { id: scanId },
            data: {
                status: "COMPLETE",
                totalArtists,
                duplicatesFound: groups.length,
            },
        });

        logger.info({ scanId }, "dsp_duplicate_scan: completed");
    } catch (err) {
        logger.error({ err, scanId }, "dsp_duplicate_scan: failed");
        await db.dspDuplicateScan.update({
            where: { id: scanId },
            data: {
                status: "FAILED",
                error: err instanceof Error ? err.message : "Unknown error",
            },
        });
    }
}
