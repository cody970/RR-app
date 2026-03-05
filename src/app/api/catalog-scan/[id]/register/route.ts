/**
 * POST /api/catalog-scan/:id/register — Submit gaps for registration via TuneRegistry
 *
 * Accepts a list of gap IDs and submits them for PRO registration
 * using the TuneRegistry Enterprise API.
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import {
    submitWorkRegistration,
    submitRecordingRegistration,
    convertGapToRegistration,
} from "@/lib/tuneregistry-client";

export async function POST(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.orgId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Verify scan belongs to org
        const scan = await db.catalogScan.findFirst({
            where: { id: params.id, orgId: session.user.orgId },
        });
        if (!scan) {
            return NextResponse.json({ error: "Scan not found" }, { status: 404 });
        }

        // Check TuneRegistry credentials
        if (!process.env.TUNEREGISTRY_API_KEY) {
            return NextResponse.json(
                { error: "TuneRegistry API key not configured. Set TUNEREGISTRY_API_KEY in environment." },
                { status: 503 }
            );
        }

        const body = await req.json();
        const { gapIds } = body as { gapIds: string[] };

        if (!gapIds?.length) {
            return NextResponse.json({ error: "gapIds is required" }, { status: 400 });
        }

        // Load the gaps
        const gaps = await db.registrationGap.findMany({
            where: {
                id: { in: gapIds },
                scanId: params.id,
                status: "OPEN",
            },
        });

        if (gaps.length === 0) {
            return NextResponse.json({ error: "No eligible gaps found" }, { status: 404 });
        }

        const results = {
            submitted: 0,
            failed: 0,
            errors: [] as string[],
        };

        for (const gap of gaps) {
            try {
                // Determine target societies from the gap
                const societies = gap.society.includes("/")
                    ? gap.society.split("/")
                    : [gap.society];

                let response;

                if (gap.workId || gap.gapType === "NO_REGISTRATION" || gap.gapType === "MISSING_WORK") {
                    // Submit as a work registration
                    const work = convertGapToRegistration({
                        title: gap.title,
                        iswc: gap.iswc,
                        artistName: gap.artistName,
                        society: gap.society,
                    });
                    response = await submitWorkRegistration(work, societies);
                } else if (gap.recordingId && gap.isrc) {
                    // Submit as a recording registration
                    response = await submitRecordingRegistration(
                        {
                            title: gap.title,
                            isrc: gap.isrc,
                            artist: gap.artistName || "Unknown",
                        },
                        societies
                    );
                } else {
                    results.errors.push(`Gap ${gap.id}: Cannot determine registration type`);
                    results.failed++;
                    continue;
                }

                if (response.success) {
                    // Mark gap as registering
                    await db.registrationGap.update({
                        where: { id: gap.id },
                        data: { status: "REGISTERING" },
                    });
                    results.submitted++;
                } else {
                    results.errors.push(`Gap ${gap.id}: ${response.message}`);
                    results.failed++;
                }
            } catch (e) {
                const msg = e instanceof Error ? e.message : String(e);
                results.errors.push(`Gap ${gap.id}: ${msg}`);
                results.failed++;
            }
        }

        return NextResponse.json({
            message: `Submitted ${results.submitted} of ${gaps.length} gaps for registration`,
            ...results,
        });
    } catch (error) {
        console.error("Registration submission error:", error);
        return NextResponse.json({ error: "Failed to submit registrations" }, { status: 500 });
    }
}
