/**
 * Lightweight structured logger.
 *
 * Drop-in compatible with pino's API surface (logger.info/warn/error/debug).
 * Uses plain console under the hood so no external package is needed.
 * Replace with `pino` any time by swapping out this module — the call sites
 * are identical.
 */

type LogContext = Record<string, unknown>;
type LogLevel = "debug" | "info" | "warn" | "error";

const LEVEL_ORDER: Record<LogLevel, number> = {
    debug: 10,
    info: 20,
    warn: 30,
    error: 40,
};

function getConfiguredLevel(): LogLevel {
    const env = (process.env.LOG_LEVEL ?? "info").toLowerCase() as LogLevel;
    return LEVEL_ORDER[env] !== undefined ? env : "info";
}

function log(level: LogLevel, ctx: LogContext | string, msg?: string) {
    const configuredLevel = getConfiguredLevel();
    if (LEVEL_ORDER[level] < LEVEL_ORDER[configuredLevel]) return;

    const isDev = process.env.NODE_ENV === "development";

    if (isDev) {
        // Human-readable output for local development
        const message = typeof ctx === "string" ? ctx : msg ?? "";
        const context = typeof ctx === "object" ? ctx : {};
        const prefix = `[${level.toUpperCase()}]`;
        if (Object.keys(context).length > 0) {
            console[level === "warn" ? "warn" : level === "error" ? "error" : "log"](
                prefix,
                message,
                context
            );
        } else {
            console[level === "warn" ? "warn" : level === "error" ? "error" : "log"](
                prefix,
                message
            );
        }
    } else {
        // Structured JSON output for production / log aggregators
        const entry = {
            level,
            time: new Date().toISOString(),
            msg: typeof ctx === "string" ? ctx : msg ?? "",
            ...(typeof ctx === "object" ? ctx : {}),
        };
        console[level === "warn" ? "warn" : level === "error" ? "error" : "log"](
            JSON.stringify(entry)
        );
    }
}

export const logger = {
    debug: (ctx: LogContext | string, msg?: string) => log("debug", ctx, msg),
    info: (ctx: LogContext | string, msg?: string) => log("info", ctx, msg),
    warn: (ctx: LogContext | string, msg?: string) => log("warn", ctx, msg),
    error: (ctx: LogContext | string, msg?: string) => log("error", ctx, msg),
};
