/**
 * Individual Scheduled Report Management
 *
 * PATCH  /api/reports/scheduled/[id] — Update a scheduled report
 * DELETE /api/reports/scheduled/[id] — Delete a scheduled report
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth";
import { db } from "@/lib/infra/db";
import { validatePermission } from "@/lib/auth/rbac";
import { z } from "zod";
import { calculateNextRun, type ReportSchedule } from "@/lib/reports/report-generator";

const updateReportSchema = z.object({
    name: z.string().min(1).max(100).optional(),
    type: z.enum(["AUDIT_SUMMARY", "REVENUE_BREAKDOWN", "CATALOG_HEALTH", "RECOVERY_PROGRESS", "CUSTOM"]).optional(),
    format: z.enum(["PDF", "CSV", "JSON"]).optional(),
    schedule: z.enum(["DAILY", "WEEKLY", "MONTHLY", "QUARTERLY"]).optional(),
    recipients: z
        .array(z.string().email())
        .min(1)
        .max(10)
        .optional(),
    filters: z
        .object({
            dateFrom: z.string().optional(),
            dateTo: z.string().optional(),
            societies: z.array(z.string()).optional(),
            severities: z.array(z.string()).optional(),
            statuses: z.array(z.string()).optional(),
            minImpact: z.number().optional(),
        })
        .nullable()
        .optional(),
    enabled: z.boolean().optional(),
});

export async function PATCH(
    req: Request,
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
        const existing = await db.scheduledReport.findFirst({
            where: { id: params.id, orgId: session.user.orgId },
        });

        if (!existing) {
            return NextResponse.json(
                { error: "Scheduled report not found" },
                { status: 404 },
            );
        }

        const body = await req.json().catch(() => ({}));
        const parsed = updateReportSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                { error: "Invalid request", details: parsed.error.flatten() },
                { status: 400 },
            );
        }

        const { name, type, format, schedule, recipients, filters, enabled } = parsed.data;

        const updateData: Record<string, unknown> = {};
        if (name !== undefined) updateData.name = name;
        if (type !== undefined) updateData.type = type;
        if (format !== undefined) updateData.format = format;
        if (recipients !== undefined) updateData.recipients = recipients;
        if (filters !== undefined) {
            updateData.filters = filters ? JSON.stringify(filters) : null;
        }
        if (enabled !== undefined) updateData.enabled = enabled;

        // Recalculate next run if schedule changes
        if (schedule !== undefined) {
            updateData.schedule = schedule;
            updateData.nextRunAt = calculateNextRun(schedule as ReportSchedule);
        }

        if (Object.keys(updateData).length === 0) {
            return NextResponse.json(
                { error: "No valid fields to update" },
                { status: 400 },
            );
        }

        const updated = await db.scheduledReport.update({
            where: { id: params.id },
            data: updateData,
        });

        return NextResponse.json({ report: updated });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Internal Server Error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

export async function DELETE(
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
        const existing = await db.scheduledReport.findFirst({
            where: { id: params.id, orgId: session.user.orgId },
        });

        if (!existing) {
            return NextResponse.json(
                { error: "Scheduled report not found" },
                { status: 404 },
            );
        }

        await db.scheduledReport.delete({
            where: { id: params.id },
        });

        return new Response(null, { status: 204 });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Internal Server Error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}