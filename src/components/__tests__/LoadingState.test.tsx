// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import {
    LoadingState,
    InlineSpinner,
    PageLoading,
    CardSkeleton,
    TableSkeleton
} from '../LoadingState';

describe('LoadingState', () => {
    it('renders spinner with default message', () => {
        render(<LoadingState />);
        expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('renders spinner with custom message', () => {
        render(<LoadingState message="Custom message" />);
        expect(screen.getByText('Custom message')).toBeInTheDocument();
    });

    it('renders spinner with different sizes', () => {
        const { rerender } = render(<LoadingState size="sm" />);
        expect(screen.getByText('Loading...')).toBeInTheDocument();
        
        rerender(<LoadingState size="lg" />);
        expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('renders dots animation', () => {
        render(<LoadingState variant="dots" />);
        expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('renders dots with custom message', () => {
        render(<LoadingState variant="dots" message="Loading data..." />);
        expect(screen.getByText('Loading data...')).toBeInTheDocument();
    });

    it('renders skeleton placeholders', () => {
        const { container } = render(<LoadingState variant="skeleton" />);
        expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
    });
});

describe('InlineSpinner', () => {
    it('renders small inline spinner by default', () => {
        render(<InlineSpinner />);
        const spinner = screen.getByRole('status');
        expect(spinner).toBeInTheDocument();
    });

    it('renders medium inline spinner', () => {
        render(<InlineSpinner size="md" />);
        const spinner = screen.getByRole('status');
        expect(spinner).toBeInTheDocument();
    });

    it('renders spinner with sr-only text', () => {
        render(<InlineSpinner />);
        expect(screen.getByText('Loading...')).toBeInTheDocument();
    });
});

describe('PageLoading', () => {
    it('renders page-level loading state', () => {
        render(<PageLoading />);
        expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('renders with custom message', () => {
        render(<PageLoading message="Loading dashboard..." />);
        expect(screen.getByText('Loading dashboard...')).toBeInTheDocument();
    });
});

describe('CardSkeleton', () => {
    it('renders card skeleton structure', () => {
        const { container } = render(<CardSkeleton />);
        const card = container.querySelector('.bg-white.rounded-lg.shadow');
        expect(card).toBeInTheDocument();
    });
});

describe('TableSkeleton', () => {
    it('renders table skeleton with default rows and columns', () => {
        const { container } = render(<TableSkeleton />);
        const rows = container.querySelectorAll('.flex.py-2.border-b');
        expect(rows.length).toBeGreaterThanOrEqual(5);
    });

    it('renders table skeleton with custom rows and columns', () => {
        const { container } = render(<TableSkeleton rows={3} columns={6} />);
        const rows = container.querySelectorAll('.flex.py-2.border-b');
        expect(rows.length).toBeGreaterThanOrEqual(3);
    });
});