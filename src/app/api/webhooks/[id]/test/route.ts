/**
 * Dashboard API — Webhook Test Endpoint (Session Auth)
 *
 * POST /api/webhooks/[id]/test — Fire a test webhook delivery
 *
 * Uses session-based auth for the dashboard UI.
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth";
import { db } from "@/lib/infra/db";
import { validatePermission } from "@/lib/auth/rbac";
import {
    signPayload,
    type WebhookPayload,
    DELIVERY_TIMEOUT_MS,
    MAX_RESPONSE_BODY,
} from "@/lib/infra/webhook-delivery";
import crypto from "crypto";

export async function POST(
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
        // Verify webhook belongs to this org
        const webhook = await db.webhook.findFirst({
            where: { id: params.id, orgId: session.user.orgId },
        });

        if (!webhook) {
            return NextResponse.json(
                { error: "Webhook not found" },
                { status: 404 },
            );
        }

        // Get org name for test payload
        const org = await db.organization.findUnique({
            where: { id: session.user.orgId },
            select: { name: true },
        });

        // Create test payload
        const payload: WebhookPayload = {
            id: crypto.randomUUID(),
            event: "test.ping",
            timestamp: new Date().toISOString(),
            data: {
                message: "This is a test webhook delivery from RoyaltyRadar",
                webhookId: webhook.id,
                organizationId: session.user.orgId,
                organizationName: org?.name || "Unknown",
            },
        };

        const body = JSON.stringify(payload);
        const signature = signPayload(body, webhook.secret);
        const deliveryId = crypto.randomUUID();

        const startTime = Date.now();
        let statusCode: number | undefined;
        let responseBody: string | undefined;
        let success = false;

        try {
            const controller = new AbortController();
            const timeout = setTimeout(
                () => controller.abort(),
                DELIVERY_TIMEOUT_MS,
            );

            const response = await fetch(webhook.url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-RoyaltyRadar-Signature": `sha256=${signature}`,
                    "X-RoyaltyRadar-Event": payload.event,
                    "X-RoyaltyRadar-Delivery": deliveryId,
                    "User-Agent": "RoyaltyRadar-Webhooks/1.0",
                },
                body,
                signal: controller.signal,
            });

            clearTimeout(timeout);
            statusCode = response.status;
            success = response.ok;

            try {
                const text = await response.text();
                responseBody = text.slice(0, MAX_RESPONSE_BODY);
            } catch {
                responseBody = "[Could not read response body]";
            }
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Unknown error";
            responseBody = `Delivery failed: ${message}`;
        }

        const duration = Date.now() - startTime;

        // Record the test delivery
        await db.webhookDelivery.create({
            data: {
                webhookId: webhook.id,
                event: payload.event,
                payload: body,
                statusCode: statusCode ?? null,
                responseBody: responseBody ?? null,
                duration,
                success,
            },
        });

        return NextResponse.json({
            success,
            delivery: {
                id: deliveryId,
                event: payload.event,
                statusCode,
                duration,
                responseBody: responseBody?.slice(0, 500),
            },
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Internal Server Error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
