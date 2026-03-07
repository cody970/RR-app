/**
 * Public API — Individual Webhook Management
 *
 * PATCH  /api/v1/webhooks/[id] — Update a webhook
 * DELETE /api/v1/webhooks/[id] — Delete a webhook
 *
 * Authenticated via API key (Bearer token).
 */

import { NextResponse } from "next/server";
import { validateApiKey } from "@/lib/auth/api-auth";
import { db } from "@/lib/infra/db";
import { WEBHOOK_EVENT_TYPES } from "@/lib/infra/webhook-delivery";
import { z } from "zod";

// ---------- PATCH ----------

const updateWebhookSchema = z.object({
    url: z.string().url().max(2048).optional(),
    events: z
        .array(z.string())
        .min(1)
        .refine(
            (events) =>
                events.every((e) =>
                    (WEBHOOK_EVENT_TYPES as readonly string[]).includes(e),
                ),
            {
                message: `Invalid event type. Allowed: ${WEBHOOK_EVENT_TYPES.join(", ")}`,
            },
        )
        .optional(),
    description: z.string().max(500).nullable().optional(),
    enabled: z.boolean().optional(),
});

export async function PATCH(
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
        const existing = await db.webhook.findFirst({
            where: { id: params.id, orgId: organization.id },
        });

        if (!existing) {
            return NextResponse.json(
                { error: "Webhook not found" },
                { status: 404 },
            );
        }

        const body = await req.json().catch(() => ({}));
        const parsed = updateWebhookSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                { error: "Invalid request", details: parsed.error.flatten() },
                { status: 400 },
            );
        }

        const { url, events, description, enabled } = parsed.data;

        const updateData: Record<string, unknown> = {};
        if (url !== undefined) updateData.url = url;
        if (events !== undefined) updateData.events = events;
        if (description !== undefined) updateData.description = description;
        if (enabled !== undefined) {
            updateData.enabled = enabled;
            // Reset failure count when re-enabling
            if (enabled && existing.failureCount > 0) {
                updateData.failureCount = 0;
            }
        }

        if (Object.keys(updateData).length === 0) {
            return NextResponse.json(
                { error: "No valid fields to update" },
                { status: 400 },
            );
        }

        const updated = await db.webhook.update({
            where: { id: params.id },
            data: updateData,
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

        return NextResponse.json({ webhook: updated });
    } catch (error: unknown) {
        console.error("Webhook update error:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 },
        );
    }
}

// ---------- DELETE ----------

export async function DELETE(
    _req: Request,
    { params }: { params: { id: string } },
) {
    const authHeader = _req.headers.get("Authorization");
    const key = authHeader?.replace("Bearer ", "");

    const organization = await validateApiKey(key || null);
    if (!organization) {
        return NextResponse.json(
            { error: "Unauthorized: Invalid API Key" },
            { status: 401 },
        );
    }

    try {
        const existing = await db.webhook.findFirst({
            where: { id: params.id, orgId: organization.id },
        });

        if (!existing) {
            return NextResponse.json(
                { error: "Webhook not found" },
                { status: 404 },
            );
        }

        // Cascade delete handles deliveries via schema relation
        await db.webhook.delete({
            where: { id: params.id },
        });

        return new Response(null, { status: 204 });
    } catch (error: unknown) {
        console.error("Webhook delete error:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 },
        );
    }
}