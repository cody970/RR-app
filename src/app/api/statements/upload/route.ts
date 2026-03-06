import { NextResponse, NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { parseStatement, importStatement } from "@/lib/finance/statement-parser";
import { runDiscrepancyChecks } from "@/lib/music/discrepancy-engine";

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return new Response("Unauthorized", { status: 401 });
        const orgId = session.user.orgId;

        const formData = await req.formData();
        const file = formData.get("file") as File | null;
        const periodOverride = formData.get("period") as string | null;
        const formatOverride = formData.get("format") as string | null;

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        // Read file content
        const content = await file.text();

        if (!content.trim()) {
            return NextResponse.json({ error: "File is empty" }, { status: 400 });
        }

        // Parse the statement
        const parsed = parseStatement(
            content,
            formatOverride as any || undefined
        );

        if (parsed.errors.length > 0 && parsed.lines.length === 0) {
            return NextResponse.json({
                error: "Failed to parse statement",
                details: parsed.errors,
            }, { status: 400 });
        }

        // Override period if provided
        if (periodOverride) {
            parsed.period = periodOverride;
        }

        // Import to database
        const result = await importStatement(parsed, orgId, file.name);

        // Run discrepancy checks in background
        runDiscrepancyChecks(result.statementId, orgId).catch(console.error);

        return NextResponse.json({
            success: true,
            statementId: result.statementId,
            source: parsed.source,
            period: parsed.period,
            totalAmount: parsed.totalAmount,
            totalLines: parsed.lines.length,
            matched: result.matched,
            unmatched: result.unmatched,
            parseErrors: parsed.errors.length,
        });
    } catch (err: any) {
        console.error("Statement upload error:", err);
        return NextResponse.json({ error: err.message || "Upload failed" }, { status: 500 });
    }
}
