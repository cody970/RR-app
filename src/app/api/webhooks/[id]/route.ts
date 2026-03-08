/**
 * Dashboard API — Individual Webhook Management (Session Auth)
 *
 * PATCH  /api/webhooks/[id] — Update a webhook
 * DELETE /api/webhooks/[id] — Delete a webhook
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth";
import { db } from "@/lib/infra/db";
import { validatePermission } from "@/lib/auth/rbac";
import { WEBHOOK_EVENT_TYPES } from "@/lib/infra/webhook-delivery";
import { z } from "zod";

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
    { params }: { params: Promise<{ id: string }> },
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
        const existing = await db.webhook.findFirst({
            where: { id: (await params).id, orgId: session.user.orgId },
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
            where: { id: (await params).id },
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
        const message = error instanceof Error ? error.message : "Internal Server Error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

export async function DELETE(
    _req: Request,
    { params }: { params: Promise<{ id: string }> },
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
        const existing = await db.webhook.findFirst({
            where: { id: (await params).id, orgId: session.user.orgId },
        });

        if (!existing) {
            return NextResponse.json(
                { error: "Webhook not found" },
                { status: 404 },
            );
        }

        await db.webhook.delete({
            where: { id: (await params).id },
        });

        return new Response(null, { status: 204 });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Internal Server Error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}