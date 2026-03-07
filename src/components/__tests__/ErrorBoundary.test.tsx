import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorBoundary } from '../ErrorBoundary';

// Component that throws an error
function ThrowError({ shouldThrow }: { shouldThrow: boolean }) {
    if (shouldThrow) {
        throw new Error('Test error');
    }
    return <div>No error</div>;
}

describe('ErrorBoundary', () => {
    it('renders children when there is no error', () => {
        render(
            <ErrorBoundary>
                <div>Test Child</div>
            </ErrorBoundary>
        );
        expect(screen.getByText('Test Child')).toBeInTheDocument();
    });

    it('catches errors and displays error UI', () => {
        render(
            <ErrorBoundary>
                <ThrowError shouldThrow={true} />
            </ErrorBoundary>
        );

        expect(screen.getByText('Something went wrong')).toBeInTheDocument();
        expect(screen.getByText(/We're sorry/)).toBeInTheDocument();
    });

    it('displays custom fallback when provided', () => {
        const fallback = <div>Custom Error UI</div>;
        render(
            <ErrorBoundary fallback={fallback}>
                <ThrowError shouldThrow={true} />
            </ErrorBoundary>
        );

        expect(screen.getByText('Custom Error UI')).toBeInTheDocument();
        expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
    });

    it('calls onError callback when error occurs', () => {
        const onError = vi.fn();
        render(
            <ErrorBoundary onError={onError}>
                <ThrowError shouldThrow={true} />
            </ErrorBoundary>
        );

        expect(onError).toHaveBeenCalled();
        expect(onError).toHaveBeenCalledWith(
            expect.any(Error),
            expect.objectContaining({
                componentStack: expect.any(String),
            })
        );
    });

    it('resets error state when Try Again button is clicked', () => {
        const { rerender } = render(
            <ErrorBoundary>
                <ThrowError shouldThrow={true} />
            </ErrorBoundary>
        );

        // Error UI should be visible
        expect(screen.getByText('Something went wrong')).toBeInTheDocument();

        // Click Try Again
        fireEvent.click(screen.getByText('Try Again'));

        // Rerender without error
        rerender(
            <ErrorBoundary>
                <ThrowError shouldThrow={false} />
            </ErrorBoundary>
        );

        // Should now show the child component
        expect(screen.getByText('No error')).toBeInTheDocument();
    });

    it('displays error details in development mode', () => {
        const originalEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'development';

        render(
            <ErrorBoundary>
                <ThrowError shouldThrow={true} />
            </ErrorBoundary>
        );

        const details = screen.getByText(/Error Details/);
        expect(details).toBeInTheDocument();

        process.env.NODE_ENV = originalEnv;
    });

    it('includes error ID in error UI', () => {
        render(
            <ErrorBoundary>
                <ThrowError shouldThrow={true} />
            </ErrorBoundary>
        );

        const errorId = screen.getByText(/Error ID:/);
        expect(errorId).toBeInTheDocument();
    });
});