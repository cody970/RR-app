import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth";
import { db } from "@/lib/infra/db";
import { validatePermission } from "@/lib/auth/rbac";
import { statementFetchQueue } from "@/lib/infra/queue";

// ---------------------------------------------------------------------------
// POST /api/settings/connections/[id]/fetch — trigger manual fetch
// ---------------------------------------------------------------------------

export async function POST(
    _req: Request,
    { params }: { params: { id: string } },
) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return new Response("Unauthorized", { status: 401 });

    try {
        validatePermission(session.user.role, "SETTINGS_EDIT");
    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "Forbidden";
        return new NextResponse(message, { status: 403 });
    }

    try {
        // Verify the source belongs to the user's org and is SFTP/API type
        const source = await db.ingestionSource.findFirst({
            where: { id: params.id, orgId: session.user.orgId },
        });

        if (!source) {
            return NextResponse.json(
                { error: "Ingestion source not found" },
                { status: 404 },
            );
        }

        if (source.type === "EMAIL") {
            return NextResponse.json(
                { error: "Manual fetch is only available for SFTP and API sources" },
                { status: 400 },
            );
        }

        // Trigger the fetch job via the queue
        const job = await statementFetchQueue.add(
            `manual-fetch-${params.id}`,
            {
                sourceId: params.id,
                orgId: session.user.orgId,
                manual: true,
            },
            {
                priority: 1, // High priority for manual requests
            }
        );

        return NextResponse.json({
            success: true,
            message: "Fetch job triggered",
            jobId: job.id,
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Internal Server Error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
