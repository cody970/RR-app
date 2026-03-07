/**
 * Webhook Delivery System
 *
 * Handles signing, sending, and recording webhook deliveries.
 * Integrates with the event bus so that published events are
 * automatically dispatched to matching webhook subscriptions.
 */

import crypto from "crypto";
import { db } from "@/lib/infra/db";
import { logger } from "@/lib/infra/logger";

// ---------- Types ----------

export interface WebhookPayload {
    id: string;
    event: string;
    timestamp: string;
    data: Record<string, unknown>;
}

// ---------- Signing ----------

/**
 * Generate an HMAC-SHA256 signature for a webhook payload.
 * The receiving server can verify this using the shared secret.
 */
export function signPayload(payload: string, secret: string): string {
    return crypto
        .createHmac("sha256", secret)
        .update(payload, "utf8")
        .digest("hex");
}

// ---------- Delivery ----------

const DELIVERY_TIMEOUT_MS = 10_000; // 10 seconds
const MAX_RESPONSE_BODY = 1024; // Store first 1KB of response

/**
 * Deliver a webhook payload to a single endpoint.
 * Records the delivery attempt in the database.
 */
async function deliverToEndpoint(
    webhookId: string,
    url: string,
    secret: string,
    payload: WebhookPayload,
): Promise<{ success: boolean; statusCode?: number }> {
    const body = JSON.stringify(payload);
    const signature = signPayload(body, secret);
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

        const response = await fetch(url, {
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

        // Capture first 1KB of response for debugging
        try {
            const text = await response.text();
            responseBody = text.slice(0, MAX_RESPONSE_BODY);
        } catch {
            responseBody = "[Could not read response body]";
        }
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Unknown error";
        responseBody = `Delivery failed: ${message}`;
        logger.error({ err, webhookId, url }, "Webhook delivery failed");
    }

    const duration = Date.now() - startTime;

    // Record the delivery attempt
    try {
        await db.webhookDelivery.create({
            data: {
                webhookId,
                event: payload.event,
                payload: body,
                statusCode: statusCode ?? null,
                responseBody: responseBody ?? null,
                duration,
                success,
            },
        });

        // Update webhook metadata
        const updateData: Record<string, unknown> = {
            lastStatusCode: statusCode ?? null,
        };

        if (success) {
            updateData.lastDeliveredAt = new Date();
            updateData.failureCount = 0;
        } else {
            updateData.lastFailedAt = new Date();
            updateData.failureCount = { increment: 1 };
        }

        await db.webhook.update({
            where: { id: webhookId },
            data: updateData,
        });
    } catch (dbErr) {
        logger.error(
            { err: dbErr, webhookId },
            "Failed to record webhook delivery",
        );
    }

    return { success, statusCode };
}

// ---------- Dispatch ----------

/**
 * Dispatch an event to all matching webhooks for an organization.
 * This is the main entry point called by the event bus integration.
 *
 * Webhooks are matched by:
 * 1. Belonging to the same org
 * 2. Being enabled
 * 3. Having the event type in their subscribed events list (or "*" for all)
 * 4. Not having exceeded the failure threshold (10 consecutive failures)
 */
export async function dispatchWebhooks(
    orgId: string,
    event: string,
    data: Record<string, unknown>,
): Promise<{ delivered: number; failed: number }> {
    const MAX_CONSECUTIVE_FAILURES = 10;

    try {
        // Find all active webhooks for this org that subscribe to this event
        const webhooks = await db.webhook.findMany({
            where: {
                orgId,
                enabled: true,
                failureCount: { lt: MAX_CONSECUTIVE_FAILURES },
            },
        });

        // Filter to webhooks that subscribe to this event type
        const matching = webhooks.filter(
            (wh) => wh.events.includes("*") || wh.events.includes(event),
        );

        if (matching.length === 0) {
            return { delivered: 0, failed: 0 };
        }

        const payload: WebhookPayload = {
            id: crypto.randomUUID(),
            event,
            timestamp: new Date().toISOString(),
            data,
        };

        // Deliver to all matching webhooks concurrently
        const results = await Promise.allSettled(
            matching.map((wh) =>
                deliverToEndpoint(wh.id, wh.url, wh.secret, payload),
            ),
        );

        let delivered = 0;
        let failed = 0;

        for (const result of results) {
            if (
                result.status === "fulfilled" &&
                result.value.success
            ) {
                delivered++;
            } else {
                failed++;
            }
        }

        logger.info(
            { orgId, event, delivered, failed, total: matching.length },
            "Webhook dispatch complete",
        );

        return { delivered, failed };
    } catch (err) {
        logger.error({ err, orgId, event }, "Webhook dispatch error");
        return { delivered: 0, failed: 0 };
    }
}

// ---------- Event Types ----------

/**
 * All supported webhook event types.
 * Used for validation when creating/updating webhooks.
 */
export const WEBHOOK_EVENT_TYPES = [
    "*",
    "finding.created",
    "finding.recovered",
    "finding.status_changed",
    "statement.imported",
    "statement.matched",
    "audit.completed",
    "scan.completed",
    "registration.status_changed",
    "enrichment.completed",
    "payout.issued",
    "catalog.updated",
] as const;

export type WebhookEventType = (typeof WEBHOOK_EVENT_TYPES)[number];