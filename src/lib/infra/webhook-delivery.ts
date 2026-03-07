/**
 * Webhook Delivery System
 *
 * Handles signing, sending, and recording webhook deliveries.
 * Integrates with the event bus so that published events are
 * automatically dispatched to matching webhook subscriptions.
 *
 * Features:
 * - HMAC-SHA256 signature verification
 * - Exponential backoff retry with jitter
 * - Delivery logging and failure tracking
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

// ---------- Constants ----------

export const DELIVERY_TIMEOUT_MS = 10_000; // 10 seconds
export const MAX_RESPONSE_BODY = 1024; // Store first 1KB of response
export const MAX_RETRY_ATTEMPTS = 5; // Maximum retry attempts
export const BASE_RETRY_DELAY_MS = 1000; // 1 second base delay
export const MAX_RETRY_DELAY_MS = 300_000; // 5 minutes max delay

/**
 * Check if a status code represents a non-retryable client error.
 * Client errors (4xx) are not retried, except for 429 (rate limited).
 */
export function isNonRetryableClientError(statusCode: number | undefined): boolean {
    if (!statusCode) return false;
    return statusCode >= 400 && statusCode < 500 && statusCode !== 429;
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

/**
 * Verify a webhook signature.
 * Useful for webhook receivers to validate incoming requests.
 */
export function verifySignature(
    payload: string,
    signature: string,
    secret: string,
): boolean {
    const expected = signPayload(payload, secret);
    // Use timing-safe comparison to prevent timing attacks
    try {
        return crypto.timingSafeEqual(
            Buffer.from(signature),
            Buffer.from(expected),
        );
    } catch {
        return false;
    }
}

// ---------- Retry Logic ----------

/**
 * Calculate the next retry delay using exponential backoff with jitter.
 * Formula: min(MAX_DELAY, BASE_DELAY * 2^attempt + random_jitter)
 */
export function calculateRetryDelay(attempt: number): number {
    const exponentialDelay = BASE_RETRY_DELAY_MS * Math.pow(2, attempt);
    const jitter = Math.random() * 1000; // 0-1 second random jitter
    return Math.min(MAX_RETRY_DELAY_MS, exponentialDelay + jitter);
}

/**
 * Calculate when the next retry should occur.
 */
export function getNextRetryTime(attempt: number): Date {
    const delay = calculateRetryDelay(attempt);
    return new Date(Date.now() + delay);
}

// ---------- Delivery ----------

/**
 * Deliver a webhook payload to a single endpoint.
 * Records the delivery attempt in the database.
 *
 * @param webhookId - The webhook ID
 * @param url - Target URL to deliver to
 * @param secret - Signing secret
 * @param payload - The webhook payload
 * @param attempt - Current attempt number (1-based)
 * @returns Delivery result with success status and status code
 */
async function deliverToEndpoint(
    webhookId: string,
    url: string,
    secret: string,
    payload: WebhookPayload,
    attempt: number = 1,
): Promise<{ success: boolean; statusCode?: number; deliveryId: string }> {
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

    // Calculate next retry time if delivery failed and retries remaining
    const shouldRetry = !success && attempt < MAX_RETRY_ATTEMPTS;
    const nextRetryAt = shouldRetry ? getNextRetryTime(attempt) : null;

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
                attempts: attempt,
                nextRetryAt,
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

    return { success, statusCode, deliveryId };
}

/**
 * Deliver a webhook with automatic retry using exponential backoff.
 * Retries are attempted inline for faster feedback on transient failures.
 */
async function deliverWithRetry(
    webhookId: string,
    url: string,
    secret: string,
    payload: WebhookPayload,
): Promise<{ success: boolean; attempts: number }> {
    let attempt = 1;

    while (attempt <= MAX_RETRY_ATTEMPTS) {
        const result = await deliverToEndpoint(webhookId, url, secret, payload, attempt);

        if (result.success) {
            return { success: true, attempts: attempt };
        }

        // Don't retry on non-retryable client errors (4xx except 429)
        if (isNonRetryableClientError(result.statusCode)) {
            logger.info(
                { webhookId, statusCode: result.statusCode, attempt },
                "Webhook delivery failed with client error, not retrying",
            );
            return { success: false, attempts: attempt };
        }

        // Calculate delay and wait before retry
        if (attempt < MAX_RETRY_ATTEMPTS) {
            const delay = calculateRetryDelay(attempt);
            logger.info(
                { webhookId, attempt, nextRetryDelay: delay },
                "Webhook delivery failed, scheduling retry",
            );
            await sleep(delay);
        }

        attempt++;
    }

    return { success: false, attempts: MAX_RETRY_ATTEMPTS };
}

/**
 * Sleep for a given number of milliseconds.
 */
function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
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
 *
 * @param orgId - Organization ID
 * @param event - Event type (e.g., "finding.created")
 * @param data - Event payload data
 * @param options - Optional dispatch settings
 * @returns Delivery statistics
 */
export async function dispatchWebhooks(
    orgId: string,
    event: string,
    data: Record<string, unknown>,
    options?: { retry?: boolean },
): Promise<{ delivered: number; failed: number }> {
    const MAX_CONSECUTIVE_FAILURES = 10;
    const shouldRetry = options?.retry ?? false;

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
        // Use retry logic if enabled, otherwise single attempt
        const results = await Promise.allSettled(
            matching.map((wh) =>
                shouldRetry
                    ? deliverWithRetry(wh.id, wh.url, wh.secret, payload)
                    : deliverToEndpoint(wh.id, wh.url, wh.secret, payload, 1),
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
            { orgId, event, delivered, failed, total: matching.length, retry: shouldRetry },
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