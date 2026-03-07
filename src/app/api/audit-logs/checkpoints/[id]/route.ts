import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth";
import { db } from "@/lib/infra/db";
import { verifyCheckpoint, exportVerificationBundle } from "@/lib/infra/audit-chain";

// ---------------------------------------------------------------------------
// GET /api/audit-logs/checkpoints/[id] — verify or export a checkpoint
//
// Query params:
//   ?action=verify   — recompute Merkle root and validate integrity (default)
//   ?action=export   — return full verification bundle for independent audit
// ---------------------------------------------------------------------------

export async function GET(
    req: Request,
    { params }: { params: { id: string } },
) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    const orgId = session.user.orgId;
    const checkpointId = params.id;

    try {
        // Verify the checkpoint belongs to this org
        const checkpoint = await db.auditCheckpoint.findUnique({
            where: { id: checkpointId },
        });

        if (!checkpoint) {
            return NextResponse.json({ error: "Checkpoint not found" }, { status: 404 });
        }

        if (checkpoint.orgId !== orgId) {
            return NextResponse.json({ error: "Checkpoint not found" }, { status: 404 });
        }

        const { searchParams } = new URL(req.url);
        const action = searchParams.get("action") || "verify";

        if (action === "export") {
            const bundle = await exportVerificationBundle(checkpointId);

            return new NextResponse(JSON.stringify(bundle, null, 2), {
                status: 200,
                headers: {
                    "Content-Type": "application/json",
                    "Content-Disposition": `attachment; filename="checkpoint-${checkpointId}-bundle.json"`,
                },
            });
        }

        // Default: verify
        const result = await verifyCheckpoint(checkpointId);

        return NextResponse.json({
            verification: {
                valid: result.valid,
                checkpointId: result.checkpointId,
                merkleRoot: result.merkleRoot,
                recomputedRoot: result.recomputedRoot,
                logCount: result.logCount,
                chainValid: result.chainValid,
                details: result.details,
            },
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Internal Server Error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}