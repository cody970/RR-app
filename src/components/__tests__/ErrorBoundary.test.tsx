// @vitest-environment happy-dom
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorBoundary } from '../ErrorBoundary';

// Use a module-level variable to control throwing
let shouldThrowError = false;

function ThrowError() {
    if (shouldThrowError) {
        throw new Error('Test error');
    }
    return <div>No error</div>;
}

describe('ErrorBoundary', () => {
    beforeEach(() => {
        shouldThrowError = false;
    });

    it('renders children when there is no error', () => {
        render(
            <ErrorBoundary>
                <div>Test Child</div>
            </ErrorBoundary>
        );
        expect(screen.getByText('Test Child')).toBeInTheDocument();
    });

    it('catches errors and displays error UI', () => {
        shouldThrowError = true;
        render(
            <ErrorBoundary>
                <ThrowError />
            </ErrorBoundary>
        );

        expect(screen.getByText('Something went wrong')).toBeInTheDocument();
        expect(screen.getByText(/We're sorry/)).toBeInTheDocument();
    });

    it('displays custom fallback when provided', () => {
        shouldThrowError = true;
        const fallback = <div>Custom Error UI</div>;
        render(
            <ErrorBoundary fallback={fallback}>
                <ThrowError />
            </ErrorBoundary>
        );

        expect(screen.getByText('Custom Error UI')).toBeInTheDocument();
        expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
    });

    it('calls onError callback when error occurs', () => {
        shouldThrowError = true;
        const onError = vi.fn();
        render(
            <ErrorBoundary onError={onError}>
                <ThrowError />
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
        shouldThrowError = true;
        render(
            <ErrorBoundary>
                <ThrowError />
            </ErrorBoundary>
        );

        // Error UI should be visible
        expect(screen.getByText('Something went wrong')).toBeInTheDocument();

        // Stop throwing before clicking Try Again
        shouldThrowError = false;

        // Click Try Again - this resets the error boundary state
        fireEvent.click(screen.getByText('Try Again'));

        // Should now show the child component
        expect(screen.getByText('No error')).toBeInTheDocument();
    });

    it('displays error details in development mode', () => {
        const originalEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'development';

        shouldThrowError = true;
        render(
            <ErrorBoundary>
                <ThrowError />
            </ErrorBoundary>
        );

        const details = screen.getByText(/Error Details/);
        expect(details).toBeInTheDocument();

        process.env.NODE_ENV = originalEnv;
    });

    it('includes error ID in error UI', () => {
        shouldThrowError = true;
        render(
            <ErrorBoundary>
                <ThrowError />
            </ErrorBoundary>
        );

        const errorId = screen.getByText(/Error ID:/);
        expect(errorId).toBeInTheDocument();
    });
});