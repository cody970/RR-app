/**
 * Dashboard API — Webhook Delivery History (Session Auth)
 *
 * GET /api/webhooks/[id]/deliveries — List recent deliveries
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth";
import { db } from "@/lib/infra/db";

export async function GET(
    req: Request,
    { params }: { params: { id: string } },
) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return new Response("Unauthorized", { status: 401 });

    try {
        const webhook = await db.webhook.findFirst({
            where: { id: params.id, orgId: session.user.orgId },
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

        const deliveries = await db.webhookDelivery.findMany({
            where: { webhookId: params.id },
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
            },
        });

        return NextResponse.json({ deliveries });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Internal Server Error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}