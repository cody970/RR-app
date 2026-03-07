"use client";

/**
 * useEventStream — React hook for consuming Server-Sent Events
 *
 * Connects to /api/events/stream and provides real-time event updates.
 * Automatically reconnects on disconnection with exponential backoff.
 *
 * Usage:
 *   const { lastEvent, isConnected, events } = useEventStream();
 *
 *   // Listen for specific event types:
 *   const { lastEvent } = useEventStream({ filter: ["scan.progress", "scan.completed"] });
 *
 *   // Use the callback for immediate handling:
 *   useEventStream({ onEvent: (event) => { console.log(event); } });
 */

import { useEffect, useState, useRef, useCallback } from "react";

export type EventType =
    | "connected"
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

export interface StreamEvent {
    type: EventType;
    orgId: string;
    timestamp: string;
    data: Record<string, any>;
}

export interface UseEventStreamOptions {
    /** Only receive events of these types. If empty/undefined, receive all. */
    filter?: EventType[];
    /** Callback fired immediately when an event arrives (before state update). */
    onEvent?: (event: StreamEvent) => void;
    /** Whether to connect automatically. Default: true */
    enabled?: boolean;
    /** Maximum number of events to keep in the buffer. Default: 50 */
    maxBufferSize?: number;
}

export interface UseEventStreamReturn {
    /** The most recent event received */
    lastEvent: StreamEvent | null;
    /** Whether the SSE connection is active */
    isConnected: boolean;
    /** Buffer of recent events (newest first) */
    events: StreamEvent[];
    /** Manually reconnect */
    reconnect: () => void;
}

export function useEventStream(
    options: UseEventStreamOptions = {}
): UseEventStreamReturn {
    const {
        filter,
        onEvent,
        enabled = true,
        maxBufferSize = 50,
    } = options;

    const [lastEvent, setLastEvent] = useState<StreamEvent | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [events, setEvents] = useState<StreamEvent[]>([]);

    const eventSourceRef = useRef<EventSource | null>(null);
    const retryCountRef = useRef(0);
    const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const onEventRef = useRef(onEvent);
    const filterRef = useRef(filter);

    // Keep refs up to date
    onEventRef.current = onEvent;
    filterRef.current = filter;

    const connect = useCallback(() => {
        // Clean up existing connection
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
            eventSourceRef.current = null;
        }

        if (!enabled) return;

        const eventSource = new EventSource("/api/events/stream");
        eventSourceRef.current = eventSource;

        eventSource.onopen = () => {
            setIsConnected(true);
            retryCountRef.current = 0; // Reset retry count on successful connection
        };

        eventSource.onmessage = (e) => {
            try {
                const event: StreamEvent = JSON.parse(e.data);

                // Apply filter if specified
                if (filterRef.current && filterRef.current.length > 0) {
                    if (!filterRef.current.includes(event.type)) return;
                }

                // Fire callback immediately
                onEventRef.current?.(event);

                // Update state
                setLastEvent(event);
                setEvents((prev) => {
                    const next = [event, ...prev];
                    return next.slice(0, maxBufferSize);
                });
            } catch {
                // Ignore parse errors (e.g., heartbeat comments)
            }
        };

        eventSource.onerror = () => {
            setIsConnected(false);
            eventSource.close();
            eventSourceRef.current = null;

            // Exponential backoff reconnection
            const delay = Math.min(1000 * Math.pow(2, retryCountRef.current), 30000);
            retryCountRef.current++;

            retryTimeoutRef.current = setTimeout(() => {
                connect();
            }, delay);
        };
    }, [enabled, maxBufferSize]);

    const reconnect = useCallback(() => {
        retryCountRef.current = 0;
        connect();
    }, [connect]);

    useEffect(() => {
        connect();

        return () => {
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
                eventSourceRef.current = null;
            }
            if (retryTimeoutRef.current) {
                clearTimeout(retryTimeoutRef.current);
            }
        };
    }, [connect]);

    return { lastEvent, isConnected, events, reconnect };
}

/**
 * Convenience hook: subscribe to scan progress events only.
 */
export function useScanProgress(scanId?: string) {
    const [progress, setProgress] = useState<{
        scannedItems: number;
        totalItems: number;
        gapsFound: number;
        percentComplete: number;
    } | null>(null);
    const [completed, setCompleted] = useState(false);
    const [failed, setFailed] = useState(false);

    useEventStream({
        filter: ["scan.progress", "scan.completed", "scan.failed"],
        onEvent: (event) => {
            // If scanId is specified, only handle events for that scan
            if (scanId && event.data.scanId !== scanId) return;

            if (event.type === "scan.progress") {
                setProgress({
                    scannedItems: event.data.scannedItems,
                    totalItems: event.data.totalItems,
                    gapsFound: event.data.gapsFound,
                    percentComplete: event.data.percentComplete,
                });
            } else if (event.type === "scan.completed") {
                setCompleted(true);
            } else if (event.type === "scan.failed") {
                setFailed(true);
            }
        },
    });

    return { progress, completed, failed };
}

/**
 * Convenience hook: subscribe to audit progress events only.
 */
export function useAuditProgress(jobId?: string) {
    const [progress, setProgress] = useState<{
        phase: string;
        progress: number;
    } | null>(null);
    const [completed, setCompleted] = useState(false);
    const [findingsCount, setFindingsCount] = useState(0);

    useEventStream({
        filter: ["audit.progress", "audit.completed", "audit.failed"],
        onEvent: (event) => {
            if (jobId && event.data.jobId !== jobId) return;

            if (event.type === "audit.progress") {
                setProgress({
                    phase: event.data.phase,
                    progress: event.data.progress,
                });
            } else if (event.type === "audit.completed") {
                setCompleted(true);
                setFindingsCount(event.data.findingsCount || 0);
            }
        },
    });

    return { progress, completed, findingsCount };
}

/**
 * Convenience hook: subscribe to real-time notifications.
 */
export function useRealtimeNotifications(
    onNotification?: (event: StreamEvent) => void
) {
    const [unreadCount, setUnreadCount] = useState(0);

    const { events } = useEventStream({
        filter: [
            "notification",
            "finding.created",
            "scan.completed",
            "audit.completed",
            "statement.imported",
        ],
        onEvent: (event) => {
            setUnreadCount((prev) => prev + 1);
            onNotification?.(event);
        },
    });

    const clearCount = useCallback(() => setUnreadCount(0), []);

    return { events, unreadCount, clearCount };
}