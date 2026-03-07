import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth";
import { db } from "@/lib/infra/db";
import { validatePermission } from "@/lib/auth/rbac";
import { createCheckpoint } from "@/lib/infra/audit-chain";

// ---------------------------------------------------------------------------
// GET /api/audit-logs/checkpoints — list all checkpoints for the org
// ---------------------------------------------------------------------------

export async function GET(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    try {
        const orgId = session.user.orgId;
        const { searchParams } = new URL(req.url);
        const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
        const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20")));
        const skip = (page - 1) * limit;

        const [checkpoints, total] = await Promise.all([
            db.auditCheckpoint.findMany({
                where: { orgId },
                orderBy: { createdAt: "desc" },
                skip,
                take: limit,
            }),
            db.auditCheckpoint.count({ where: { orgId } }),
        ]);

        return NextResponse.json({
            checkpoints: checkpoints.map((cp) => ({
                id: cp.id,
                merkleRoot: cp.merkleRoot,
                logCount: cp.logCount,
                periodStart: cp.periodStart.toISOString(),
                periodEnd: cp.periodEnd.toISOString(),
                previousHash: cp.previousHash,
                anchorTxHash: cp.anchorTxHash,
                anchorChain: cp.anchorChain,
                anchorStatus: cp.anchorStatus,
                verifiedAt: cp.verifiedAt?.toISOString() ?? null,
                createdAt: cp.createdAt.toISOString(),
            })),
            pagination: {
                total,
                pages: Math.ceil(total / limit),
                currentPage: page,
            },
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Internal Server Error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

// ---------------------------------------------------------------------------
// POST /api/audit-logs/checkpoints — create a new checkpoint
// ---------------------------------------------------------------------------

export async function POST() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    const allowed = await validatePermission(session.user.id, "SETTINGS_EDIT");
    if (!allowed) {
        return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    try {
        const result = await createCheckpoint(session.user.orgId);

        return NextResponse.json({
            success: true,
            checkpoint: {
                id: result.checkpointId,
                merkleRoot: result.merkleRoot,
                logCount: result.logCount,
                periodStart: result.periodStart.toISOString(),
                periodEnd: result.periodEnd.toISOString(),
            },
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Internal Server Error";
        // "No new audit logs to checkpoint" is a known non-error condition
        const status = message.includes("No new audit logs") ? 409 : 500;
        return NextResponse.json({ error: message }, { status });
    }
}