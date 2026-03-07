/**
 * Public API — Webhook Test Endpoint
 *
 * POST /api/v1/webhooks/[id]/test — Fire a test webhook delivery
 *
 * This sends a test payload to the webhook endpoint to verify
 * connectivity and signature verification.
 *
 * Authenticated via API key (Bearer token).
 */

import { NextResponse } from "next/server";
import { validateApiKey } from "@/lib/auth/api-auth";
import { db } from "@/lib/infra/db";
import {
    signPayload,
    type WebhookPayload,
    DELIVERY_TIMEOUT_MS,
    MAX_RESPONSE_BODY,
} from "@/lib/infra/webhook-delivery";
import crypto from "crypto";

export async function POST(
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

        // Create test payload
        const payload: WebhookPayload = {
            id: crypto.randomUUID(),
            event: "test.ping",
            timestamp: new Date().toISOString(),
            data: {
                message: "This is a test webhook delivery from RoyaltyRadar",
                webhookId: webhook.id,
                organizationId: organization.id,
                organizationName: organization.name,
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
                responseBody: responseBody?.slice(0, 500), // Limit response in API
            },
        });
    } catch (error: unknown) {
        console.error("Webhook test error:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 },
        );
    }
}
