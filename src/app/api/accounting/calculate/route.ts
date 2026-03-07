import { NextResponse, NextRequest } from "next/server";
import { db } from "@/lib/infra/db";
import { requireAuth } from "@/lib/auth/get-session";
import { validatePermission } from "@/lib/auth/rbac";
import { processStatementLineSplits, processLicenseSplits } from "@/lib/music/split-engine";
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
            // Process ALL lines in a statement
            const statement = await db.statement.findUnique({
                where: { id: sourceId, orgId },
                include: { lines: true }
            });

            if (!statement) return NextResponse.json({ error: "Statement not found" }, { status: 404 });

            for (const line of statement.lines) {
                // Only process splits if matched to a work
                if (line.workId) {
                    try {
                        totalLedgersCreated += await processStatementLineSplits(line.id, orgId);
                    } catch (e) {
                        console.warn(`Skipping line ${line.id} calculation:`, e);
                    }
                }
            }
        } else if (source === "LICENSE") {
            const license = await db.license.findUnique({
                where: { id: sourceId, orgId }
            });
            if (!license) return NextResponse.json({ error: "License not found" }, { status: 404 });

            try {
                totalLedgersCreated += await processLicenseSplits(license.id, orgId);
            } catch (e) {
                console.warn(`Skipping license ${license.id} calculation:`, e);
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
