/**
 * On-Demand Report Generation
 *
 * POST /api/reports/generate — Generate a report immediately
 *
 * Returns the report data in the requested format (JSON or CSV).
 * PDF generation is handled client-side using the existing jsPDF utilities.
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth";
import { validatePermission } from "@/lib/auth/rbac";
import { z } from "zod";
import {
    generateReportData,
    reportDataToCSV,
    reportDataToJSON,
    type ReportType,
} from "@/lib/reports/report-generator";

const generateSchema = z.object({
    type: z.enum(["AUDIT_SUMMARY", "REVENUE_BREAKDOWN", "CATALOG_HEALTH", "RECOVERY_PROGRESS", "CUSTOM"]),
    format: z.enum(["JSON", "CSV"]).optional(),
    filters: z
        .object({
            dateFrom: z.string().optional(),
            dateTo: z.string().optional(),
            societies: z.array(z.string()).optional(),
            severities: z.array(z.string()).optional(),
            statuses: z.array(z.string()).optional(),
            minImpact: z.number().optional(),
        })
        .optional(),
});

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return new Response("Unauthorized", { status: 401 });

    try {
        validatePermission(session.user.role, "EXPORT_DATA");
    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "Forbidden";
        return new NextResponse(message, { status: 403 });
    }

    try {
        const body = await req.json().catch(() => ({}));
        const parsed = generateSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                { error: "Invalid request", details: parsed.error.flatten() },
                { status: 400 },
            );
        }

        const { type, format, filters } = parsed.data;

        const reportData = await generateReportData(
            session.user.orgId,
            type as ReportType,
            filters || {},
        );

        if (format === "CSV") {
            const csv = reportDataToCSV(reportData);
            return new Response(csv, {
                headers: {
                    "Content-Type": "text/csv",
                    "Content-Disposition": `attachment; filename="report_${type.toLowerCase()}_${new Date().toISOString().split("T")[0]}.csv"`,
                },
            });
        }

        // Default: return JSON
        return NextResponse.json(reportData);
    } catch (error: unknown) {
        console.error("Report generation error:", error);
        const message = error instanceof Error ? error.message : "Internal Server Error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}