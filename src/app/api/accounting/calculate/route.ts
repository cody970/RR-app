import { NextResponse, NextRequest } from "next/server";
import { db } from "@/lib/infra/db";
import { requireAuth } from "@/lib/auth/get-session";
import { validatePermission } from "@/lib/auth/rbac";
import { processStatementSplitsBulk, processLicenseSplits } from "@/lib/music/split-engine";
import { logger } from "@/lib/infra/logger";
import { z } from "zod";

const calculateSchema = z.object({
    source: z.enum(["STATEMENT", "LICENSE"]),
    sourceId: z.string().min(1),
});

export async function POST(req: NextRequest) {
    try {
        const { orgId, role } = await requireAuth();

        // RBAC: require FINANCE_EDIT for calculations
        try {
            validatePermission(role, "FINANCE_EDIT");
        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : "Forbidden";
            return NextResponse.json({ error: message }, { status: 403 });
        }

        const body = await req.json().catch(() => ({}));
        const parsed = calculateSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 });
        }

        const { source, sourceId } = parsed.data;

        let totalLedgersCreated = 0;

        if (source === "STATEMENT") {
            // Verify the statement exists and belongs to this org
            const statement = await db.statement.findUnique({
                where: { id: sourceId, orgId },
                select: { id: true },
            });

            if (!statement) return NextResponse.json({ error: "Statement not found" }, { status: 404 });

            // Use bulk processing to avoid N+1 queries (O(1) DB round-trips instead of O(N))
            try {
                totalLedgersCreated = await processStatementSplitsBulk(sourceId, orgId);
            } catch (e) {
                logger.warn(
                    { statementId: sourceId, error: e instanceof Error ? e.message : String(e) },
                    "Skipping statement bulk calculation"
                );
            }
        } else if (source === "LICENSE") {
            const license = await db.license.findUnique({
                where: { id: sourceId, orgId }
            });
            if (!license) return NextResponse.json({ error: "License not found" }, { status: 404 });

            try {
                totalLedgersCreated += await processLicenseSplits(license.id, orgId);
            } catch (e) {
                logger.warn(
                    { licenseId: license.id, error: e instanceof Error ? e.message : String(e) },
                    "Skipping license calculation"
                );
            }
        } else {
            return NextResponse.json({ error: "Invalid source. Use STATEMENT or LICENSE" }, { status: 400 });
        }

        return NextResponse.json({ success: true, ledgersCreated: totalLedgersCreated });
    } catch (error: unknown) {
        if (error && typeof error === "object" && "status" in error && (error as any).status === 401) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const message = error instanceof Error ? error.message : "Internal Server Error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
