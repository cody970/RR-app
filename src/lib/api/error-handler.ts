import { NextResponse } from 'next/server';

export type ErrorCode = 
    | 'BAD_REQUEST'
    | 'UNAUTHORIZED'
    | 'FORBIDDEN'
    | 'NOT_FOUND'
    | 'CONFLICT'
    | 'RATE_LIMIT_EXCEEDED'
    | 'VALIDATION_ERROR'
    | 'INTERNAL_ERROR'
    | 'SERVICE_UNAVAILABLE';

export interface ApiErrorResponse {
    success: false;
    error: {
        code: ErrorCode;
        message: string;
        details?: any;
        requestId?: string;
        timestamp: string;
    };
}

/**
 * Creates a standardized API error response
 */
export function createErrorResponse(
    code: ErrorCode,
    message: string,
    status: number,
    details?: any
): NextResponse {
    const errorResponse: ApiErrorResponse = {
        success: false,
        error: {
            code,
            message,
            details,
            requestId: crypto.randomUUID(),
            timestamp: new Date().toISOString()
        }
    };

    return NextResponse.json(errorResponse, { status });
}

/**
 * Predefined error creators for common scenarios
 */
export const ApiErrors = {
    BadRequest: (message: string, details?: any) => 
        createErrorResponse('BAD_REQUEST', message, 400, details),
    
    Unauthorized: (message: string = 'Authentication required') => 
        createErrorResponse('UNAUTHORIZED', message, 401),
    
    Forbidden: (message: string = 'Insufficient permissions') => 
        createErrorResponse('FORBIDDEN', message, 403),
    
    NotFound: (resource: string = 'Resource') => 
        createErrorResponse('NOT_FOUND', `${resource} not found`, 404),
    
    Conflict: (message: string) => 
        createErrorResponse('CONFLICT', message, 409),
    
    RateLimitExceeded: (message: string = 'Too many requests') => 
        createErrorResponse('RATE_LIMIT_EXCEEDED', message, 429),
    
    ValidationError: (message: string, details?: any) => 
        createErrorResponse('VALIDATION_ERROR', message, 400, details),
    
    Internal: (message: string = 'An unexpected error occurred') => 
        createErrorResponse('INTERNAL_ERROR', message, 500),
    
    ServiceUnavailable: (message: string = 'Service temporarily unavailable') => 
        createErrorResponse('SERVICE_UNAVAILABLE', message, 503),
};

/**
 * Creates a standardized success response
 */
export interface ApiSuccessResponse<T = any> {
    success: true;
    data: T;
    requestId: string;
    timestamp: string;
}

export function createSuccessResponse<T>(data: T, status: number = 200): NextResponse {
    const successResponse: ApiSuccessResponse<T> = {
        success: true,
        data,
        requestId: crypto.randomUUID(),
        timestamp: new Date().toISOString()
    };

    return NextResponse.json(successResponse, { status });
}

/**
 * Wraps async route handlers with consistent error handling
 */
export function withErrorHandler<T extends any[]>(
    handler: (...args: T) => Promise<NextResponse>
) {
    return async (...args: T): Promise<NextResponse> => {
        try {
            return await handler(...args);
        } catch (error: any) {
            console.error('[API Error]', error);
            
            // Handle known error types
            if (error?.code === 'P2002') {
                return ApiErrors.Conflict('A record with this unique identifier already exists');
            }
            
            if (error?.code === 'P2025') {
                return ApiErrors.NotFound('Record not found');
            }
            
            // Handle validation errors
            if (error?.name === 'ZodError') {
                return ApiErrors.ValidationError('Invalid request data', error.flatten());
            }
            
            // Default to internal error
            const message = error?.message || 'An unexpected error occurred';
            return ApiErrors.Internal(process.env.NODE_ENV === 'development' ? message : 'Internal server error');
        }
    };
}