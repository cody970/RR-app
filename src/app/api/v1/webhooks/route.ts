/**
 * Public API — Webhook Management
 *
 * GET  /api/v1/webhooks       — List webhooks for the org
 * POST /api/v1/webhooks       — Create a new webhook
 *
 * Authenticated via API key (Bearer token).
 */

import { NextResponse } from "next/server";
import { validateApiKey } from "@/lib/auth/api-auth";
import { db } from "@/lib/infra/db";
import { WEBHOOK_EVENT_TYPES } from "@/lib/infra/webhook-delivery";
import { z } from "zod";
import crypto from "crypto";

// ---------- GET ----------

export async function GET(req: Request) {
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
        const webhooks = await db.webhook.findMany({
            where: { orgId: organization.id },
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
                // secret is intentionally excluded
            },
        });

        return NextResponse.json({ webhooks });
    } catch (error: unknown) {
        console.error("Webhooks list error:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 },
        );
    }
}

// ---------- POST ----------

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
    enabled: z.boolean().optional(),
});

export async function POST(req: Request) {
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
        const body = await req.json().catch(() => ({}));
        const parsed = createWebhookSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                { error: "Invalid request", details: parsed.error.flatten() },
                { status: 400 },
            );
        }

        const { url, events, description, enabled } = parsed.data;

        // Generate a signing secret
        const secret = `whsec_${crypto.randomBytes(24).toString("hex")}`;

        // Limit webhooks per org (max 10)
        const existingCount = await db.webhook.count({
            where: { orgId: organization.id },
        });

        if (existingCount >= 10) {
            return NextResponse.json(
                { error: "Maximum of 10 webhooks per organization" },
                { status: 400 },
            );
        }

        const webhook = await db.webhook.create({
            data: {
                orgId: organization.id,
                url,
                secret,
                events,
                description: description ?? null,
                enabled: enabled ?? true,
            },
        });

        // Return the secret only on creation — it cannot be retrieved later
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
                secret, // Only returned once!
            },
            { status: 201 },
        );
    } catch (error: unknown) {
        console.error("Webhook creation error:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 },
        );
    }
}