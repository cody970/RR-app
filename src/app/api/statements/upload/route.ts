import { NextResponse, NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { parseStatement, importStatement } from "@/lib/finance/statement-parser";
import { runDiscrepancyChecks } from "@/lib/music/discrepancy-engine";
import { ApiErrors } from "@/lib/api/error-response";

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return ApiErrors.Unauthorized();
        const orgId = session.user.orgId;

        const formData = await req.formData();
        const file = formData.get("file") as File | null;
        const periodOverride = formData.get("period") as string | null;
        const formatOverride = formData.get("format") as string | null;

        if (!file) {
            return ApiErrors.BadRequest("No file provided");
        }

        // Read file content
        const content = await file.text();

        if (!content.trim()) {
            return ApiErrors.BadRequest("File is empty");
        }

        // Parse the statement
        const parsed = parseStatement(
            content,
            formatOverride as any || undefined
        );

        if (parsed.errors.length > 0 && parsed.lines.length === 0) {
            return ApiErrors.BadRequest("Failed to parse statement", parsed.errors);
        }

        // Override period if provided
        if (periodOverride) {
            parsed.period = periodOverride;
        }

        if (!orgId) {
            return ApiErrors.Forbidden("No organization linked to user");
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
        return ApiErrors.Internal(err.message || "Upload failed");
    }
}
