import { NextResponse } from "next/server";

export type ApiErrorType =
    | "UNAUTHORIZED"
    | "FORBIDDEN"
    | "NOT_FOUND"
    | "BAD_REQUEST"
    | "INTERNAL_SERVER_ERROR"
    | "RATE_LIMIT_EXCEEDED"
    | "VALIDATION_ERROR";

export function createErrorResponse(
    message: string,
    type: ApiErrorType = "INTERNAL_SERVER_ERROR",
    status: number = 500,
    details?: any
) {
    return NextResponse.json({
        error: {
            message,
            type,
            details
        }
    }, { status });
}

export const ApiErrors = {
    Unauthorized: (msg = "Authentication required") =>
        createErrorResponse(msg, "UNAUTHORIZED", 401),
    Forbidden: (msg = "Permission denied") =>
        createErrorResponse(msg, "FORBIDDEN", 403),
    NotFound: (msg = "Resource not found") =>
        createErrorResponse(msg, "NOT_FOUND", 404),
    BadRequest: (msg = "Invalid request", details?: any) =>
        createErrorResponse(msg, "BAD_REQUEST", 400, details),
    Internal: (msg = "An unexpected error occurred") =>
        createErrorResponse(msg, "INTERNAL_SERVER_ERROR", 500),
    TooManyRequests: (msg = "Too many requests, please slow down") =>
        createErrorResponse(msg, "RATE_LIMIT_EXCEEDED", 429),
    Unprocessable: (msg = "Validation failed", details?: any) =>
        createErrorResponse(msg, "VALIDATION_ERROR", 422, details),
};
