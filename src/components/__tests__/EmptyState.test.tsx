// @vitest-environment happy-dom
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import {
    EmptyState,
    EmptyCatalog,
    EmptyFindings,
    EmptyReports,
    NoSearchResults,
    NoNotifications,
} from '../EmptyState';

describe('EmptyState', () => {
    it('renders with title and description', () => {
        render(
            <EmptyState
                title="Test Title"
                description="Test Description"
            />
        );
        expect(screen.getByText('Test Title')).toBeInTheDocument();
        expect(screen.getByText('Test Description')).toBeInTheDocument();
    });

    it('renders with action button', () => {
        const handleClick = vi.fn();
        render(
            <EmptyState
                title="Test Title"
                action={{ label: 'Action Button', onClick: handleClick }}
            />
        );
        
        const button = screen.getByText('Action Button');
        expect(button).toBeInTheDocument();
        fireEvent.click(button);
        expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('renders with secondary action button', () => {
        const handlePrimary = vi.fn();
        const handleSecondary = vi.fn();
        render(
            <EmptyState
                title="Test Title"
                action={{ label: 'Primary', onClick: handlePrimary }}
                secondaryAction={{ label: 'Secondary', onClick: handleSecondary }}
            />
        );
        
        expect(screen.getByText('Primary')).toBeInTheDocument();
        expect(screen.getByText('Secondary')).toBeInTheDocument();
        
        fireEvent.click(screen.getByText('Secondary'));
        expect(handleSecondary).toHaveBeenCalledTimes(1);
    });

    it('renders custom icon', () => {
        const customIcon = <div data-testid="custom-icon">Icon</div>;
        render(
            <EmptyState
                title="Test Title"
                icon={customIcon}
            />
        );
        
        expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
    });

    it('renders without description when not provided', () => {
        render(<EmptyState title="Test Title" />);
        expect(screen.getByText('Test Title')).toBeInTheDocument();
    });

    it('renders without action buttons when not provided', () => {
        render(<EmptyState title="Test Title" />);
        const buttons = screen.queryAllByRole('button');
        expect(buttons).toHaveLength(0);
    });
});

describe('Predefined Empty States', () => {
    describe('EmptyCatalog', () => {
        it('renders catalog-specific empty state', () => {
            render(<EmptyCatalog />);
            expect(screen.getByText('No works in your catalog')).toBeInTheDocument();
            expect(screen.getByText('Import Catalog')).toBeInTheDocument();
        });

        it('has import action button', () => {
            render(<EmptyCatalog />);
            const button = screen.getByText('Import Catalog');
            expect(button).toBeInTheDocument();
            fireEvent.click(button);
        });
    });

    describe('EmptyFindings', () => {
        it('renders findings-specific empty state', () => {
            render(<EmptyFindings />);
            expect(screen.getByText('No findings yet')).toBeInTheDocument();
            expect(screen.getByText('Run Catalog Scan')).toBeInTheDocument();
        });

        it('has scan action button', () => {
            render(<EmptyFindings />);
            const button = screen.getByText('Run Catalog Scan');
            expect(button).toBeInTheDocument();
        });
    });

    describe('EmptyReports', () => {
        it('renders reports-specific empty state', () => {
            render(<EmptyReports />);
            expect(screen.getByText('No reports available')).toBeInTheDocument();
            expect(screen.getByText('Create Report')).toBeInTheDocument();
        });
    });

    describe('NoSearchResults', () => {
        it('renders search results empty state with query', () => {
            render(<NoSearchResults query="test query" />);
            expect(screen.getByText(/No results found for "test query"/)).toBeInTheDocument();
        });

        it('has clear search action', () => {
            render(<NoSearchResults query="test" />);
            const button = screen.getByText('Clear Search');
            expect(button).toBeInTheDocument();
        });
    });

    describe('NoNotifications', () => {
        it('renders notifications empty state', () => {
            render(<NoNotifications />);
            expect(screen.getByText('No notifications')).toBeInTheDocument();
            expect(screen.getByText(/You're all caught up/)).toBeInTheDocument();
        });

        it('does not have action buttons', () => {
            render(<NoNotifications />);
            const buttons = screen.queryAllByRole('button');
            expect(buttons).toHaveLength(0);
        });
    });
});