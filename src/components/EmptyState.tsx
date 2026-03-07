import React from 'react';

interface EmptyStateProps {
    icon?: React.ReactNode;
    title: string;
    description?: string;
    action?: {
        label: string;
        onClick: () => void;
    };
    secondaryAction?: {
        label: string;
        onClick: () => void;
    };
    illustration?: 'no-data' | 'no-results' | 'no-connections' | 'no-notifications' | 'custom';
}

/**
 * Empty State Component
 * Displays a friendly message when there's no data to show
 */
export function EmptyState({
    icon,
    title,
    description,
    action,
    secondaryAction,
    illustration = 'no-data',
}: EmptyStateProps) {
    const defaultIcons: Record<string, React.ReactNode> = {
        'no-data': (
            <svg
                className="w-16 h-16 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
            >
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                />
            </svg>
        ),
        'no-results': (
            <svg
                className="w-16 h-16 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
            >
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
            </svg>
        ),
        'no-connections': (
            <svg
                className="w-16 h-16 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
            >
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
            </svg>
        ),
        'no-notifications': (
            <svg
                className="w-16 h-16 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
            >
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                />
            </svg>
        ),
    };

    const displayIcon = icon || defaultIcons[illustration] || defaultIcons['no-data'];

    return (
        <div className="text-center py-12 px-4">
            <div className="flex justify-center mb-4">
                {displayIcon}
            </div>
            
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {title}
            </h3>
            
            {description && (
                <p className="text-gray-600 mb-6 max-w-md mx-auto">
                    {description}
                </p>
            )}
            
            {(action || secondaryAction) && (
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    {action && (
                        <button
                            onClick={action.onClick}
                            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                            {action.label}
                        </button>
                    )}
                    {secondaryAction && (
                        <button
                            onClick={secondaryAction.onClick}
                            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                            {secondaryAction.label}
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}

/**
 * Empty Catalog State
 */
export function EmptyCatalog() {
    return (
        <EmptyState
            title="No works in your catalog"
            description="Get started by importing your music catalog from CWR files, CSV, or connect to your PRO."
            action={{
                label: 'Import Catalog',
                onClick: () => console.log('Navigate to import'),
            }}
            secondaryAction={{
                label: 'Learn More',
                onClick: () => console.log('Open documentation'),
            }}
            illustration="no-data"
        />
    );
}

/**
 * Empty Findings State
 */
export function EmptyFindings() {
    return (
        <EmptyState
            title="No findings yet"
            description="Run a catalog scan to identify potential revenue recovery opportunities and metadata gaps."
            action={{
                label: 'Run Catalog Scan',
                onClick: () => console.log('Navigate to scan'),
            }}
            illustration="no-results"
        />
    );
}

/**
 * Empty Reports State
 */
export function EmptyReports() {
    return (
        <EmptyState
            title="No reports available"
            description="Generate reports to analyze your royalty distribution, revenue trends, and catalog performance."
            action={{
                label: 'Create Report',
                onClick: () => console.log('Navigate to reports'),
            }}
            illustration="no-data"
        />
    );
}

/**
 * Search Results Empty State
 */
export function NoSearchResults({ query }: { query: string }) {
    return (
        <EmptyState
            title={`No results found for "${query}"`}
            description="Try adjusting your search terms or filters to find what you're looking for."
            action={{
                label: 'Clear Search',
                onClick: () => console.log('Clear search'),
            }}
            illustration="no-results"
        />
    );
}

/**
 * No Notifications State
 */
export function NoNotifications() {
    return (
        <EmptyState
            title="No notifications"
            description="You're all caught up! We'll notify you when there are important updates."
            illustration="no-notifications"
        />
    );
}

export default EmptyState;