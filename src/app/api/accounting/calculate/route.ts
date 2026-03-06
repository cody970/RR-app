import { NextResponse, NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { db } from "@/lib/infra/db";
import { processStatementLineSplits, processLicenseSplits } from "@/lib/music/split-engine";

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return new Response("Unauthorized", { status: 401 });
        const orgId = session.user.orgId;

        const body = await req.json();
        const { source, sourceId } = body;

        if (!source || !sourceId) {
            return NextResponse.json({ error: "Missing source or sourceId" }, { status: 400 });
        }

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
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
