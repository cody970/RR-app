/**
 * Scheduled Reports API
 *
 * GET  /api/reports/scheduled — List scheduled reports
 * POST /api/reports/scheduled — Create a scheduled report
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth";
import { db } from "@/lib/infra/db";
import { validatePermission } from "@/lib/auth/rbac";
import { z } from "zod";
import {
    REPORT_TYPES,
    SCHEDULE_OPTIONS,
    calculateNextRun,
    type ReportType,
    type ReportSchedule,
} from "@/lib/reports/report-generator";

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user) return new Response("Unauthorized", { status: 401 });

    try {
        const reports = await db.scheduledReport.findMany({
            where: { orgId: session.user.orgId },
            orderBy: { createdAt: "desc" },
        });

        return NextResponse.json({ reports });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Internal Server Error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

const createReportSchema = z.object({
    name: z.string().min(1, "Name is required").max(100),
    type: z.enum(["AUDIT_SUMMARY", "REVENUE_BREAKDOWN", "CATALOG_HEALTH", "RECOVERY_PROGRESS", "CUSTOM"]),
    format: z.enum(["PDF", "CSV", "JSON"]).optional(),
    schedule: z.enum(["DAILY", "WEEKLY", "MONTHLY", "QUARTERLY"]),
    recipients: z
        .array(z.string().email("Invalid email address"))
        .min(1, "At least one recipient is required")
        .max(10, "Maximum 10 recipients"),
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
        validatePermission(session.user.role, "SETTINGS_EDIT");
    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "Forbidden";
        return new NextResponse(message, { status: 403 });
    }

    try {
        const body = await req.json().catch(() => ({}));
        const parsed = createReportSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                { error: "Invalid request", details: parsed.error.flatten() },
                { status: 400 },
            );
        }

        const { name, type, format, schedule, recipients, filters } = parsed.data;

        // Limit scheduled reports per org
        const existingCount = await db.scheduledReport.count({
            where: { orgId: session.user.orgId },
        });

        if (existingCount >= 20) {
            return NextResponse.json(
                { error: "Maximum of 20 scheduled reports per organization" },
                { status: 400 },
            );
        }

        const nextRunAt = calculateNextRun(schedule as ReportSchedule);

        const report = await db.scheduledReport.create({
            data: {
                orgId: session.user.orgId,
                name,
                type,
                format: format || "PDF",
                schedule,
                recipients,
                filters: filters ? JSON.stringify(filters) : null,
                enabled: true,
                nextRunAt,
            },
        });

        return NextResponse.json({ report }, { status: 201 });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Internal Server Error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}