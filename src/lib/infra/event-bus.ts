/**
 * Event Bus — Redis Pub/Sub for Real-Time Notifications
 *
 * Provides a centralized event system that workers and API routes can publish to,
 * and SSE endpoints can subscribe to for real-time client updates.
 *
 * Events are scoped by orgId so clients only receive events for their organization.
 */

import Redis from "ioredis";
import { logger } from "@/lib/infra/logger";

// ---------- Types ----------

export type EventType =
    | "scan.progress"
    | "scan.completed"
    | "scan.failed"
    | "audit.progress"
    | "audit.completed"
    | "audit.failed"
    | "statement.imported"
    | "statement.matched"
    | "finding.created"
    | "finding.recovered"
    | "registration.status_changed"
    | "payout.issued"
    | "enrichment.completed"
    | "notification";

export interface AppEvent {
    type: EventType;
    orgId: string;
    timestamp: string;
    data: Record<string, any>;
}

// ---------- Channel Naming ----------

const CHANNEL_PREFIX = "rr:events:";

/**
 * Get the Redis Pub/Sub channel name for an organization.
 */
export function getOrgChannel(orgId: string): string {
    return `${CHANNEL_PREFIX}${orgId}`;
}

/**
 * Get the global broadcast channel (all orgs).
 */
export function getGlobalChannel(): string {
    return `${CHANNEL_PREFIX}global`;
}

// ---------- Publisher ----------

let publisherClient: Redis | null = null;

/**
 * Get or create the publisher Redis client.
 * Uses a dedicated connection for publishing (separate from BullMQ).
 */
function getPublisher(): Redis {
    if (!publisherClient) {
        const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
        publisherClient = new Redis(redisUrl, {
            maxRetriesPerRequest: null,
            lazyConnect: true,
        });
        publisherClient.on("error", (err) => {
            logger.error({ err }, "Event bus publisher error");
        });
    }
    return publisherClient;
}

/**
 * Publish an event to the organization's channel.
 * Workers and API routes call this to broadcast real-time updates.
 */
export async function publishEvent(event: AppEvent): Promise<void> {
    try {
        const publisher = getPublisher();
        const channel = getOrgChannel(event.orgId);
        const payload = JSON.stringify(event);

        await publisher.publish(channel, payload);

        logger.info(
            { type: event.type, orgId: event.orgId },
            "Event published"
        );
    } catch (err) {
        logger.error({ err, event: event.type }, "Failed to publish event");
    }
}

/**
 * Publish a scan progress event.
 */
export async function publishScanProgress(
    orgId: string,
    scanId: string,
    scannedItems: number,
    totalItems: number,
    gapsFound: number
): Promise<void> {
    await publishEvent({
        type: "scan.progress",
        orgId,
        timestamp: new Date().toISOString(),
        data: {
            scanId,
            scannedItems,
            totalItems,
            gapsFound,
            percentComplete: totalItems > 0 ? Math.round((scannedItems / totalItems) * 100) : 0,
        },
    });
}

/**
 * Publish a scan completed event.
 */
export async function publishScanCompleted(
    orgId: string,
    scanId: string,
    totalGaps: number
): Promise<void> {
    await publishEvent({
        type: "scan.completed",
        orgId,
        timestamp: new Date().toISOString(),
        data: { scanId, totalGaps },
    });
}

/**
 * Publish a scan failed event.
 */
export async function publishScanFailed(
    orgId: string,
    scanId: string,
    error: string
): Promise<void> {
    await publishEvent({
        type: "scan.failed",
        orgId,
        timestamp: new Date().toISOString(),
        data: { scanId, error },
    });
}

/**
 * Publish an audit progress event.
 */
export async function publishAuditProgress(
    orgId: string,
    jobId: string,
    phase: string,
    progress: number
): Promise<void> {
    await publishEvent({
        type: "audit.progress",
        orgId,
        timestamp: new Date().toISOString(),
        data: { jobId, phase, progress },
    });
}

/**
 * Publish an audit completed event.
 */
export async function publishAuditCompleted(
    orgId: string,
    jobId: string,
    findingsCount: number
): Promise<void> {
    await publishEvent({
        type: "audit.completed",
        orgId,
        timestamp: new Date().toISOString(),
        data: { jobId, findingsCount },
    });
}

/**
 * Publish an audit failed event.
 */
export async function publishAuditFailed(
    orgId: string,
    jobId: string,
    error: string
): Promise<void> {
    await publishEvent({
        type: "audit.failed",
        orgId,
        timestamp: new Date().toISOString(),
        data: { jobId, error },
    });
}

/**
 * Publish a statement imported event.
 */
export async function publishStatementImported(
    orgId: string,
    statementId: string,
    source: string,
    matched: number,
    unmatched: number
): Promise<void> {
    await publishEvent({
        type: "statement.imported",
        orgId,
        timestamp: new Date().toISOString(),
        data: { statementId, source, matched, unmatched },
    });
}

/**
 * Publish a finding created event.
 */
export async function publishFindingCreated(
    orgId: string,
    findingId: string,
    type: string,
    severity: string,
    estimatedImpact: number
): Promise<void> {
    await publishEvent({
        type: "finding.created",
        orgId,
        timestamp: new Date().toISOString(),
        data: { findingId, type, severity, estimatedImpact },
    });
}

// ---------- Subscriber ----------

export interface EventSubscription {
    /** Async iterator of events */
    events: AsyncGenerator<AppEvent>;
    /** Call to unsubscribe and clean up */
    unsubscribe: () => void;
}

/**
 * Subscribe to real-time events for an organization.
 * Returns an async generator that yields events as they arrive.
 *
 * Used by the SSE endpoint to stream events to connected clients.
 */
export function subscribeToOrg(orgId: string): EventSubscription {
    const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
    const subscriber = new Redis(redisUrl, {
        maxRetriesPerRequest: null,
        lazyConnect: true,
    });

    const channel = getOrgChannel(orgId);
    let closed = false;

    // Event queue for the async generator
    const eventQueue: AppEvent[] = [];
    let resolveWaiting: ((value: IteratorResult<AppEvent>) => void) | null = null;

    subscriber.subscribe(channel).catch((err) => {
        logger.error({ err, orgId }, "Failed to subscribe to org channel");
    });

    subscriber.on("message", (_ch: string, message: string) => {
        try {
            const event: AppEvent = JSON.parse(message);

            if (resolveWaiting) {
                // Someone is waiting for the next event
                const resolve = resolveWaiting;
                resolveWaiting = null;
                resolve({ value: event, done: false });
            } else {
                // Buffer the event
                eventQueue.push(event);
                // Cap buffer to prevent memory leaks
                if (eventQueue.length > 100) {
                    eventQueue.shift();
                }
            }
        } catch (err) {
            logger.error({ err }, "Failed to parse event message");
        }
    });

    subscriber.on("error", (err) => {
        logger.error({ err, orgId }, "Event subscriber error");
    });

    // Async generator that yields events
    async function* eventGenerator(): AsyncGenerator<AppEvent> {
        while (!closed) {
            if (eventQueue.length > 0) {
                yield eventQueue.shift()!;
            } else {
                // Wait for the next event
                const event = await new Promise<IteratorResult<AppEvent>>((resolve) => {
                    resolveWaiting = resolve;
                });
                if (event.done) break;
                yield event.value;
            }
        }
    }

    const unsubscribe = () => {
        closed = true;
        if (resolveWaiting) {
            resolveWaiting({ value: undefined as any, done: true });
            resolveWaiting = null;
        }
        subscriber.unsubscribe(channel).catch(() => {});
        subscriber.disconnect();
    };

    return {
        events: eventGenerator(),
        unsubscribe,
    };
}