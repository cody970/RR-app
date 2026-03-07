import React from 'react';

interface LoadingStateProps {
    message?: string;
    size?: 'sm' | 'md' | 'lg';
    variant?: 'spinner' | 'skeleton' | 'dots';
}

/**
 * Reusable Loading State Component
 * Provides different loading visualizations for various use cases
 */
export function LoadingState({
    message = 'Loading...',
    size = 'md',
    variant = 'spinner'
}: LoadingStateProps) {
    const sizeClasses = {
        sm: 'w-4 h-4',
        md: 'w-8 h-8',
        lg: 'w-12 h-12',
    };

    const textClasses = {
        sm: 'text-sm',
        md: 'text-base',
        lg: 'text-lg',
    };

    if (variant === 'spinner') {
        return (
            <div className="flex flex-col items-center justify-center p-4">
                <div className={`animate-spin rounded-full border-2 border-gray-300 border-t-indigo-600 ${sizeClasses[size]}`} />
                {message && (
                    <p className={`mt-3 text-gray-600 ${textClasses[size]}`}>
                        {message}
                    </p>
                )}
            </div>
        );
    }

    if (variant === 'dots') {
        return (
            <div className="flex flex-col items-center justify-center p-4">
                <div className="flex gap-1">
                    {[0, 1, 2].map((i) => (
                        <div
                            key={i}
                            className={`${sizeClasses[size]} bg-indigo-600 rounded-full animate-bounce`}
                            style={{
                                animationDelay: `${i * 0.15}s`,
                                animationDuration: '1.4s',
                            }}
                        />
                    ))}
                </div>
                {message && (
                    <p className={`mt-3 text-gray-600 ${textClasses[size]}`}>
                        {message}
                    </p>
                )}
            </div>
        );
    }

    // Skeleton variant
    return (
        <div className="animate-pulse p-4">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
        </div>
    );
}

/**
 * Inline Loading Spinner for buttons and inline actions
 */
export function InlineSpinner({ size = 'sm' }: { size?: 'sm' | 'md' }) {
    const sizeClasses = {
        sm: 'w-4 h-4',
        md: 'w-6 h-6',
    };

    return (
        <div
            className={`animate-spin rounded-full border-2 border-white border-t-transparent ${sizeClasses[size]}`}
            role="status"
            aria-label="Loading"
        >
            <span className="sr-only">Loading...</span>
        </div>
    );
}

/**
 * Page-Level Loading State
 */
export function PageLoading({ message = 'Loading...' }: { message?: string }) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <LoadingState message={message} size="lg" variant="dots" />
        </div>
    );
}

/**
 * Card Loading Skeleton
 */
export function CardSkeleton() {
    return (
        <div className="animate-pulse bg-white rounded-lg shadow p-6">
            <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6 mb-4"></div>
            <div className="h-20 bg-gray-200 rounded w-full"></div>
        </div>
    );
}

/**
 * Table Loading Skeleton
 */
export function TableSkeleton({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
    return (
        <div className="animate-pulse">
            {/* Header */}
            <div className="flex gap-4 mb-2 border-b pb-2">
                {Array.from({ length: columns }).map((_, i) => (
                    <div key={`header-${i}`} className="h-4 bg-gray-200 rounded flex-1" />
                ))}
            </div>
            {/* Rows */}
            {Array.from({ length: rows }).map((_, rowIndex) => (
                <div key={`row-${rowIndex}`} className="flex gap-4 py-2 border-b">
                    {Array.from({ length: columns }).map((_, colIndex) => (
                        <div key={`cell-${rowIndex}-${colIndex}`} className="h-4 bg-gray-200 rounded flex-1" />
                    ))}
                </div>
            ))}
        </div>
    );
}

export default LoadingState;