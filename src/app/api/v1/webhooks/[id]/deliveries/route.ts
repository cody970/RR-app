/**
 * Public API — Webhook Delivery History
 *
 * GET /api/v1/webhooks/[id]/deliveries — List recent deliveries for a webhook
 *
 * Query Parameters:
 *   limit  — Max items (default: 20, max: 100)
 *   status — success, failed, all (default: all)
 *
 * Authenticated via API key (Bearer token).
 */

import { NextResponse } from "next/server";
import { validateApiKey } from "@/lib/auth/api-auth";
import { db } from "@/lib/infra/db";

export async function GET(
    req: Request,
    { params }: { params: { id: string } },
) {
    const authHeader = req.headers.get("Authorization");
    const key = authHeader?.replace("Bearer ", "");

    const organization = await validateApiKey(key || null);
    if (!organization) {
        return NextResponse.json(
            { error: "Unauthorized: Invalid API Key" },
            { status: 401 },
        );
    }

    try {
        // Verify webhook belongs to this org
        const webhook = await db.webhook.findFirst({
            where: { id: params.id, orgId: organization.id },
        });

        if (!webhook) {
            return NextResponse.json(
                { error: "Webhook not found" },
                { status: 404 },
            );
        }

        const { searchParams } = new URL(req.url);
        const limit = Math.min(
            100,
            Math.max(1, parseInt(searchParams.get("limit") || "20", 10)),
        );
        const status = searchParams.get("status") || "all";

        const where: Record<string, unknown> = { webhookId: params.id };
        if (status === "success") where.success = true;
        if (status === "failed") where.success = false;

        const deliveries = await db.webhookDelivery.findMany({
            where,
            orderBy: { createdAt: "desc" },
            take: limit,
            select: {
                id: true,
                event: true,
                statusCode: true,
                responseBody: true,
                duration: true,
                success: true,
                attempts: true,
                createdAt: true,
                // payload excluded by default (can be large)
            },
        });

        return NextResponse.json({ deliveries });
    } catch (error: unknown) {
        console.error("Webhook deliveries error:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 },
        );
    }
}