/**
 * Enhanced Async Logger with Correlation IDs and Error Tracking
 * 
 * Provides comprehensive logging with:
 * - Correlation IDs for tracing requests across systems
 * - Error categorization and tracking
 * - Performance metrics
 * - Structured logging for production analysis
 */

type LogContext = Record<string, unknown>;
type LogLevel = "debug" | "info" | "warn" | "error";
type ErrorCategory = "NETWORK" | "DATABASE" | "REDIS" | "EXTERNAL_API" | "VALIDATION" | "AUTHORIZATION" | "UNKNOWN";

interface LogEntry {
  level: LogLevel;
  time: string;
  correlationId?: string;
  msg: string;
  context?: LogContext;
  error?: {
    category: ErrorCategory;
    message: string;
    stack?: string;
    code?: string;
  };
  performance?: {
    duration?: number;
    operation?: string;
  };
}

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const ERROR_CATEGORIES: Record<string, ErrorCategory> = {
  'ECONNREFUSED': 'NETWORK',
  'ETIMEDOUT': 'NETWORK',
  'ENOTFOUND': 'NETWORK',
  'P1001': 'DATABASE',
  'P1002': 'DATABASE',
  'P2002': 'DATABASE',
  'ConnectionError': 'DATABASE',
  'RedisError': 'REDIS',
  'RateLimitError': 'EXTERNAL_API',
  'ValidationError': 'VALIDATION',
  'Unauthorized': 'AUTHORIZATION',
  'Forbidden': 'AUTHORIZATION',
};

function getConfiguredLevel(): LogLevel {
  const env = (process.env.LOG_LEVEL ?? "info").toLowerCase() as LogLevel;
  return LEVEL_ORDER[env] !== undefined ? env : "info";
}

function categorizeError(error: Error): ErrorCategory {
  for (const [pattern, category] of Object.entries(ERROR_CATEGORIES)) {
    if (error.name.includes(pattern) || error.message.includes(pattern)) {
      return category;
    }
  }
  return "UNKNOWN";
}

function getCorrelationId(): string {
  // Try to get from async context or generate new one
  return crypto.randomUUID();
}

function log(level: LogLevel, msg: string, ctx: LogContext = {}, error?: Error) {
  const configuredLevel = getConfiguredLevel();
  if (LEVEL_ORDER[level] < LEVEL_ORDER[configuredLevel]) return;

  const isDev = process.env.NODE_ENV === "development";
  const correlationId = getCorrelationId();

  const entry: LogEntry = {
    level,
    time: new Date().toISOString(),
    correlationId,
    msg,
    ...(Object.keys(ctx).length > 0 && { context: ctx }),
    ...(error && {
      error: {
        category: categorizeError(error),
        message: error.message,
        stack: isDev ? error.stack : undefined,
        code: (error as any).code,
      }
    }),
  };

  if (isDev) {
    // Human-readable output for local development
    const prefix = `[${level.toUpperCase()}]${correlationId ? ` [${correlationId.slice(0, 8)}]` : ''}`;
    const contextStr = Object.keys(ctx).length > 0 ? JSON.stringify(ctx, null, 2) : '';
    const errorStr = error ? `\n  Error: ${error.message}` : '';
    
    console[level === "warn" ? "warn" : level === "error" ? "error" : "log"](
      prefix,
      msg,
      contextStr,
      errorStr
    );
  } else {
    // Structured JSON output for production / log aggregators
    console[level === "warn" ? "warn" : level === "error" ? "error" : "log"](
      JSON.stringify(entry)
    );
  }

  // Store error for tracking (in production, this would go to error tracking service)
  if (error && level === "error") {
    trackError(entry);
  }
}

function trackError(entry: LogEntry) {
  // In production, this would send to error tracking service (Sentry, etc.)
  // For now, we'll log it with a special marker
  if (process.env.NODE_ENV === "production") {
    console.error("[ERROR_TRACKING]", JSON.stringify({
      correlationId: entry.correlationId,
      category: entry.error?.category,
      message: entry.error?.message,
      code: entry.error?.code,
      timestamp: entry.time,
      context: entry.context,
    }));
  }
}

// Performance tracking helper
function withPerformanceTracking<T>(
  operation: string,
  fn: () => Promise<T>,
  ctx: LogContext = {}
): Promise<T> {
  const startTime = Date.now();
  return fn().then(
    (result) => {
      const duration = Date.now() - startTime;
      log("debug", `Operation completed: ${operation}`, {
        ...ctx,
        performance: { duration, operation }
      });
      return result;
    },
    (error) => {
      const duration = Date.now() - startTime;
      log("error", `Operation failed: ${operation}`, {
        ...ctx,
        performance: { duration, operation }
      }, error);
      throw error;
    }
  );
}

export const asyncLogger = {
  debug: (msg: string, ctx?: LogContext) => log("debug", msg, ctx),
  info: (msg: string, ctx?: LogContext) => log("info", msg, ctx),
  warn: (msg: string, ctx?: LogContext) => log("warn", msg, ctx),
  error: (msg: string, error?: Error, ctx?: LogContext) => log("error", msg, ctx, error),
  
  // Performance tracking
  track: <T>(operation: string, fn: () => Promise<T>, ctx?: LogContext) => 
    withPerformanceTracking(operation, fn, ctx),
  
  // Correlation ID helper
  withCorrelationId: (correlationId: string, fn: () => void) => {
    // In a real implementation, this would use async context
    // For now, just execute the function
    fn();
  },
};