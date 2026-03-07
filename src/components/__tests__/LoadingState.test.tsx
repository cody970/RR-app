import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { LoadingState, InlineSpinner, PageLoading, CardSkeleton, TableSkeleton } from '../LoadingState';

describe('LoadingState', () => {
    describe('Spinner variant', () => {
        it('renders spinner with default message', () => {
            render(<LoadingState variant="spinner" />);
            expect(screen.getByText('Loading...')).toBeInTheDocument();
            expect(screen.getByRole('status', { hidden: true })).toBeInTheDocument();
        });

        it('renders spinner with custom message', () => {
            render(<LoadingState variant="spinner" message="Custom loading message" />);
            expect(screen.getByText('Custom loading message')).toBeInTheDocument();
        });

        it('renders spinner with different sizes', () => {
            const { rerender } = render(<LoadingState variant="spinner" size="sm" />);
            const spinnerSm = document.querySelector('.w-4.h-4');
            expect(spinnerSm).toBeInTheDocument();

            rerender(<LoadingState variant="spinner" size="lg" />);
            const spinnerLg = document.querySelector('.w-12.h-12');
            expect(spinnerLg).toBeInTheDocument();
        });
    });

    describe('Dots variant', () => {
        it('renders dots animation', () => {
            render(<LoadingState variant="dots" />);
            const dots = document.querySelectorAll('.animate-bounce');
            expect(dots).toHaveLength(3);
        });

        it('renders dots with custom message', () => {
            render(<LoadingState variant="dots" message="Please wait..." />);
            expect(screen.getByText('Please wait...')).toBeInTheDocument();
        });
    });

    describe('Skeleton variant', () => {
        it('renders skeleton placeholders', () => {
            render(<LoadingState variant="skeleton" />);
            const skeletons = document.querySelectorAll('.animate-pulse');
            expect(skeletons.length).toBeGreaterThan(0);
        });
    });
});

describe('InlineSpinner', () => {
    it('renders small inline spinner by default', () => {
        render(<InlineSpinner />);
        const spinner = document.querySelector('.w-4.h-4');
        expect(spinner).toBeInTheDocument();
        expect(screen.getByText('Loading...')).toHaveClass('sr-only');
    });

    it('renders medium inline spinner', () => {
        render(<InlineSpinner size="md" />);
        const spinner = document.querySelector('.w-6.h-6');
        expect(spinner).toBeInTheDocument();
    });
});

describe('PageLoading', () => {
    it('renders page-level loading state', () => {
        render(<PageLoading />);
        expect(screen.getByText('Loading...')).toBeInTheDocument();
        const container = document.querySelector('.min-h-screen');
        expect(container).toBeInTheDocument();
    });

    it('renders with custom message', () => {
        render(<PageLoading message="Loading dashboard..." />);
        expect(screen.getByText('Loading dashboard...')).toBeInTheDocument();
    });
});

describe('CardSkeleton', () => {
    it('renders card skeleton structure', () => {
        render(<CardSkeleton />);
        const card = document.querySelector('.bg-white.rounded-lg.shadow');
        expect(card).toBeInTheDocument();
        
        const skeletons = document.querySelectorAll('.animate-pulse .bg-gray-200');
        expect(skeletons.length).toBeGreaterThan(0);
    });
});

describe('TableSkeleton', () => {
    it('renders table skeleton with default rows and columns', () => {
        render(<TableSkeleton />);
        const rows = document.querySelectorAll('.flex.py-2.border-b');
        expect(rows).toHaveLength(5);
    });

    it('renders table skeleton with custom rows and columns', () => {
        render(<TableSkeleton rows={3} columns={6} />);
        const rows = document.querySelectorAll('.flex.py-2.border-b');
        expect(rows).toHaveLength(3);
        
        const headerCells = document.querySelectorAll('.flex.mb-2.border-b > div');
        expect(headerCells).toHaveLength(6);
    });
});