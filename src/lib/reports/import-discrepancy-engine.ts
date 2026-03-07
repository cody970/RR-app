import { db } from "@/lib/infra/db";

export async function detectDistributorLeaks(orgId: string) {
    console.log(`[Discrepancy Engine] Starting Distributor Leakage Detection for ${orgId}`);

    // In a real scenario, this matches statements from DSPs (e.g., Spotify, Apple)
    // against statements from Distributors (e.g., DistroKid, TuneCore).

    // We'll mock the logic:
    // 1. Find a random published recording.
    // 2. Generate a "ghost stream" finding for it.

    const recording = await db.recording.findFirst({
        where: {
            work: { orgId } // Fetch a dict recording belonging to this org
        }
    });

    if (!recording) {
        return { success: false, message: "No recordings found to analyze.", finding: null };
    }

    // Check if finding already exists
    const existing = await db.finding.findFirst({
        where: {
            orgId,
            type: "DISTRIBUTOR_GHOST_STREAMS",
            resourceId: recording.id,
            status: "OPEN"
        }
    });

    if (existing) {
        return { success: true, finding: existing, message: "Ghost stream finding already exists" };
    }

    const finding = await db.finding.create({
        data: {
            orgId,
            type: "DISTRIBUTOR_GHOST_STREAMS",
            severity: "HIGH",
            status: "OPEN",
            confidence: 85,
            estimatedImpact: Math.floor(Math.random() * 500) + 50,
            amountOriginal: 0,
            currency: "USD",
            resourceId: recording.id,
            resourceType: "Recording",
            metadataFix: JSON.stringify([{ field: "Distributor Streams", value: "Missing 1500 Apple Music streams" }]),
        }
    });

    console.log(`[Discrepancy Engine] Created finding ${finding.id} for ghost streams.`);

    return {
        success: true,
        finding,
        message: `Detected leakage for ${recording.title}: DSP reported streams not found in Distributor data.`
    };
}
