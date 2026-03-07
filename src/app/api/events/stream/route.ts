/**
 * Server-Sent Events (SSE) Streaming Endpoint
 *
 * GET /api/events/stream
 *
 * Provides real-time event streaming to authenticated clients.
 * Events are scoped by organization — clients only receive events
 * for their own org.
 *
 * Replaces polling patterns used in catalog-scan, audit, and notification UIs.
 *
 * Usage:
 *   const eventSource = new EventSource('/api/events/stream');
 *   eventSource.onmessage = (e) => { const event = JSON.parse(e.data); ... };
 */

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { subscribeToOrg } from "@/lib/infra/event-bus";
import { logger } from "@/lib/infra/logger";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
    // Authenticate the request
    const session = await getServerSession(authOptions);
    if (!session?.user?.orgId) {
        return new Response("Unauthorized", { status: 401 });
    }

    const orgId = session.user.orgId;
    const userId = session.user.id;

    logger.info({ orgId, userId }, "SSE client connected");

    // Create a readable stream for SSE
    const encoder = new TextEncoder();
    let subscription: ReturnType<typeof subscribeToOrg> | null = null;

    const stream = new ReadableStream({
        async start(controller) {
            // Send initial connection event
            controller.enqueue(
                encoder.encode(
                    `data: ${JSON.stringify({
                        type: "connected",
                        orgId,
                        timestamp: new Date().toISOString(),
                        data: { message: "Connected to event stream" },
                    })}\n\n`
                )
            );

            // Subscribe to org events via Redis Pub/Sub
            subscription = subscribeToOrg(orgId);

            // Send heartbeat every 30 seconds to keep connection alive
            const heartbeatInterval = setInterval(() => {
                try {
                    controller.enqueue(
                        encoder.encode(
                            `: heartbeat ${new Date().toISOString()}\n\n`
                        )
                    );
                } catch {
                    clearInterval(heartbeatInterval);
                }
            }, 30000);

            try {
                // Stream events as they arrive
                for await (const event of subscription.events) {
                    try {
                        const sseData = `data: ${JSON.stringify(event)}\n\n`;
                        controller.enqueue(encoder.encode(sseData));
                    } catch {
                        // Client disconnected
                        break;
                    }
                }
            } catch (err) {
                logger.error({ err, orgId }, "SSE stream error");
            } finally {
                clearInterval(heartbeatInterval);
                subscription?.unsubscribe();
                logger.info({ orgId, userId }, "SSE client disconnected");
            }
        },

        cancel() {
            // Client disconnected — clean up subscription
            subscription?.unsubscribe();
            logger.info({ orgId, userId }, "SSE stream cancelled by client");
        },
    });

    return new Response(stream, {
        headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache, no-transform",
            Connection: "keep-alive",
            "X-Accel-Buffering": "no", // Disable nginx buffering
        },
    });
}