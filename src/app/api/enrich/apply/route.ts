import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth";
import { db } from "@/lib/infra/db";

/**
 * Whitelist of fields that can be updated via enrichment.
 * This prevents arbitrary field writes (security vulnerability CRIT-2).
 * Never include orgId, id, or other sensitive fields.
 */
const ALLOWED_WORK_FIELDS = new Set([
    "title",
    "iswc",
    "workId",
    "versionType",
    "originalTitle",
    "durationSec",
    "recordedIndicator",
    "libraryCode",
    "cdIdentifier",
    "language",
]);

const ALLOWED_RECORDING_FIELDS = new Set([
    "title",
    "isrc",
    "durationSec",
    "recordingTitle",
    "versionTitle",
    "releaseDate",
    "recordLabel",
    "artistName",
    "artistIsni",
    "ean",
    "audioFileUrl",
]);

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return new Response("Unauthorized", { status: 401 });

    try {
        const { resourceType, resourceId, field, value } = await req.json();

        if (!resourceType || !resourceId || !field || value === undefined) {
            return new NextResponse("Missing required fields", { status: 400 });
        }

        const orgId = session.user.orgId;

        if (resourceType === "Work") {
            // Validate field against whitelist to prevent arbitrary writes
            if (!ALLOWED_WORK_FIELDS.has(field)) {
                return new NextResponse(`Field '${field}' is not allowed for enrichment`, { status: 400 });
            }
            await db.work.update({
                where: { id: resourceId, orgId },
                data: { [field]: value }
            });
        } else if (resourceType === "Recording") {
            // Validate field against whitelist to prevent arbitrary writes
            if (!ALLOWED_RECORDING_FIELDS.has(field)) {
                return new NextResponse(`Field '${field}' is not allowed for enrichment`, { status: 400 });
            }
            await db.recording.update({
                where: { id: resourceId, orgId },
                data: { [field]: value }
            });
        } else {
            return new NextResponse(`Unsupported resource type: ${resourceType}`, { status: 400 });
        }

        // Close all findings related to this resource/field anomaly if needed
        // For simplicity, we just return success
        return NextResponse.json({ status: "success" });

    } catch (e) {
        console.error("Apply fix error:", e);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}
