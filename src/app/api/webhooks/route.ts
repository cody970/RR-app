/**
 * Dashboard API — Webhook Management (Session Auth)
 *
 * GET  /api/webhooks — List webhooks
 * POST /api/webhooks — Create a webhook
 *
 * Uses session-based auth for the dashboard UI.
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth";
import { db } from "@/lib/infra/db";
import { validatePermission } from "@/lib/auth/rbac";
import { WEBHOOK_EVENT_TYPES } from "@/lib/infra/webhook-delivery";
import { z } from "zod";
import crypto from "crypto";

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user) return new Response("Unauthorized", { status: 401 });

    try {
        const webhooks = await db.webhook.findMany({
            where: { orgId: session.user.orgId },
            orderBy: { createdAt: "desc" },
            select: {
                id: true,
                url: true,
                events: true,
                enabled: true,
                description: true,
                failureCount: true,
                lastDeliveredAt: true,
                lastFailedAt: true,
                lastStatusCode: true,
                createdAt: true,
                updatedAt: true,
            },
        });

        return NextResponse.json({ webhooks });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Internal Server Error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

const createWebhookSchema = z.object({
    url: z.string().url("Must be a valid URL").max(2048),
    events: z
        .array(z.string())
        .min(1, "At least one event type is required")
        .refine(
            (events) =>
                events.every((e) =>
                    (WEBHOOK_EVENT_TYPES as readonly string[]).includes(e),
                ),
            {
                message: `Invalid event type. Allowed: ${WEBHOOK_EVENT_TYPES.join(", ")}`,
            },
        ),
    description: z.string().max(500).optional(),
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
        const parsed = createWebhookSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                { error: "Invalid request", details: parsed.error.flatten() },
                { status: 400 },
            );
        }

        const { url, events, description } = parsed.data;
        const secret = `whsec_${crypto.randomBytes(24).toString("hex")}`;

        const existingCount = await db.webhook.count({
            where: { orgId: session.user.orgId },
        });

        if (existingCount >= 10) {
            return NextResponse.json(
                { error: "Maximum of 10 webhooks per organization" },
                { status: 400 },
            );
        }

        const webhook = await db.webhook.create({
            data: {
                orgId: session.user.orgId,
                url,
                secret,
                events,
                description: description ?? null,
                enabled: true,
            },
        });

        return NextResponse.json(
            {
                webhook: {
                    id: webhook.id,
                    url: webhook.url,
                    events: webhook.events,
                    enabled: webhook.enabled,
                    description: webhook.description,
                    createdAt: webhook.createdAt,
                },
                secret,
            },
            { status: 201 },
        );
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Internal Server Error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}