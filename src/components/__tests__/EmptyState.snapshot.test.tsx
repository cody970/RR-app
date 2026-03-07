// @vitest-environment happy-dom
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import {
    EmptyState,
    EmptyCatalog,
    EmptyFindings,
    EmptyReports,
    NoSearchResults,
    NoNotifications,
} from '../EmptyState';

/**
 * Snapshot Tests for EmptyState Components
 * 
 * These tests ensure the visual consistency of empty state components
 * across the application.
 */

describe('EmptyState Snapshots', () => {
    describe('EmptyState Base Component', () => {
        it('renders default empty state correctly', () => {
            const { container } = render(
                <EmptyState title="No data available" />
            );
            expect(container).toMatchSnapshot();
        });

        it('renders empty state with description', () => {
            const { container } = render(
                <EmptyState
                    title="No items found"
                    description="Try adding some items to get started"
                />
            );
            expect(container).toMatchSnapshot();
        });

        it('renders empty state with primary action', () => {
            const { container } = render(
                <EmptyState
                    title="Empty list"
                    description="Get started by adding your first item"
                    action={{
                        label: 'Add Item',
                        onClick: () => {},
                    }}
                />
            );
            expect(container).toMatchSnapshot();
        });

        it('renders empty state with both actions', () => {
            const { container } = render(
                <EmptyState
                    title="No results"
                    description="We couldn't find what you're looking for"
                    action={{
                        label: 'Create New',
                        onClick: () => {},
                    }}
                    secondaryAction={{
                        label: 'Learn More',
                        onClick: () => {},
                    }}
                />
            );
            expect(container).toMatchSnapshot();
        });

        it('renders with no-results illustration', () => {
            const { container } = render(
                <EmptyState
                    title="No search results"
                    illustration="no-results"
                />
            );
            expect(container).toMatchSnapshot();
        });

        it('renders with no-connections illustration', () => {
            const { container } = render(
                <EmptyState
                    title="No connections"
                    illustration="no-connections"
                />
            );
            expect(container).toMatchSnapshot();
        });

        it('renders with no-notifications illustration', () => {
            const { container } = render(
                <EmptyState
                    title="All caught up"
                    illustration="no-notifications"
                />
            );
            expect(container).toMatchSnapshot();
        });

        it('renders with custom icon', () => {
            const { container } = render(
                <EmptyState
                    title="Custom state"
                    icon={<div data-testid="custom-icon">🎵</div>}
                />
            );
            expect(container).toMatchSnapshot();
        });
    });

    describe('Specialized Empty States', () => {
        it('EmptyCatalog renders correctly', () => {
            const { container } = render(<EmptyCatalog />);
            expect(container).toMatchSnapshot();
        });

        it('EmptyFindings renders correctly', () => {
            const { container } = render(<EmptyFindings />);
            expect(container).toMatchSnapshot();
        });

        it('EmptyReports renders correctly', () => {
            const { container } = render(<EmptyReports />);
            expect(container).toMatchSnapshot();
        });

        it('NoSearchResults renders with query', () => {
            const { container } = render(<NoSearchResults query="test song" />);
            expect(container).toMatchSnapshot();
        });

        it('NoNotifications renders correctly', () => {
            const { container } = render(<NoNotifications />);
            expect(container).toMatchSnapshot();
        });
    });
});

describe('EmptyState Functionality', () => {
    it('calls action onClick when button clicked', () => {
        const mockOnClick = vi.fn();
        render(
            <EmptyState
                title="Test"
                action={{
                    label: 'Click me',
                    onClick: mockOnClick,
                }}
            />
        );

        const button = screen.getByText('Click me');
        button.click();

        expect(mockOnClick).toHaveBeenCalledTimes(1);
    });

    it('calls secondary action onClick when button clicked', () => {
        const mockOnClick = vi.fn();
        render(
            <EmptyState
                title="Test"
                secondaryAction={{
                    label: 'Secondary',
                    onClick: mockOnClick,
                }}
            />
        );

        const button = screen.getByText('Secondary');
        button.click();

        expect(mockOnClick).toHaveBeenCalledTimes(1);
    });

    it('displays correct title text', () => {
        render(<EmptyState title="Custom Title" />);
        expect(screen.getByText('Custom Title')).toBeInTheDocument();
    });

    it('displays correct description text', () => {
        render(
            <EmptyState
                title="Title"
                description="This is a description"
            />
        );
        expect(screen.getByText('This is a description')).toBeInTheDocument();
    });

    it('does not render description when not provided', () => {
        render(<EmptyState title="Title only" />);
        const description = document.querySelector('.text-gray-600.mb-6');
        expect(description).not.toBeInTheDocument();
    });

    it('NoSearchResults displays query in title', () => {
        render(<NoSearchResults query="specific search" />);
        expect(screen.getByText(/specific search/)).toBeInTheDocument();
    });
});
