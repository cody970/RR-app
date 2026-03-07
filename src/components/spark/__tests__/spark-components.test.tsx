// @vitest-environment happy-dom
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import {
    SparkCard,
    SparkCardHeader,
    SparkCardTitle,
    SparkCardContent,
    SparkCardFooter,
} from '../spark-card';
import { SparkButton } from '../spark-button';
import { SparkInput } from '../spark-input';
import { SparkAlert } from '../spark-alert';
import { SparkBadge } from '../spark-badge';
import { SparkStepper } from '../spark-stepper';

// ─── SparkCard ───────────────────────────────────────────────────────────────

describe('SparkCard', () => {
    it('renders with default variant', () => {
        render(<SparkCard data-testid="card">Content</SparkCard>);
        const card = screen.getByTestId('card');
        expect(card).toBeInTheDocument();
        expect(card).toHaveAttribute('data-spark', 'card');
        expect(card).toHaveAttribute('data-variant', 'default');
    });

    it('renders highlighted variant', () => {
        render(<SparkCard variant="highlighted" data-testid="card" />);
        expect(screen.getByTestId('card')).toHaveAttribute('data-variant', 'highlighted');
    });

    it('renders warning variant', () => {
        render(<SparkCard variant="warning" data-testid="card" />);
        expect(screen.getByTestId('card')).toHaveAttribute('data-variant', 'warning');
    });

    it('renders info variant', () => {
        render(<SparkCard variant="info" data-testid="card" />);
        expect(screen.getByTestId('card')).toHaveAttribute('data-variant', 'info');
    });

    it('forwards additional className', () => {
        render(<SparkCard className="custom-class" data-testid="card" />);
        expect(screen.getByTestId('card')).toHaveClass('custom-class');
    });

    it('renders sub-components', () => {
        render(
            <SparkCard>
                <SparkCardHeader>
                    <SparkCardTitle>Title</SparkCardTitle>
                </SparkCardHeader>
                <SparkCardContent>Body</SparkCardContent>
                <SparkCardFooter>Footer</SparkCardFooter>
            </SparkCard>
        );
        expect(screen.getByText('Title')).toBeInTheDocument();
        expect(screen.getByText('Body')).toBeInTheDocument();
        expect(screen.getByText('Footer')).toBeInTheDocument();
    });
});

// ─── SparkButton ─────────────────────────────────────────────────────────────

describe('SparkButton', () => {
    it('renders with primary variant by default', () => {
        render(<SparkButton>Click me</SparkButton>);
        const btn = screen.getByRole('button', { name: 'Click me' });
        expect(btn).toBeInTheDocument();
        expect(btn).toHaveAttribute('data-variant', 'primary');
    });

    it('renders secondary variant', () => {
        render(<SparkButton variant="secondary">Secondary</SparkButton>);
        expect(screen.getByRole('button')).toHaveAttribute('data-variant', 'secondary');
    });

    it('renders danger variant', () => {
        render(<SparkButton variant="danger">Delete</SparkButton>);
        expect(screen.getByRole('button')).toHaveAttribute('data-variant', 'danger');
    });

    it('handles click events', () => {
        const handleClick = vi.fn();
        render(<SparkButton onClick={handleClick}>Click me</SparkButton>);
        fireEvent.click(screen.getByRole('button'));
        expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('is disabled when disabled prop is true', () => {
        render(<SparkButton disabled>Disabled</SparkButton>);
        expect(screen.getByRole('button')).toBeDisabled();
    });

    it('shows loading spinner and disables button when loading', () => {
        render(<SparkButton loading>Submit</SparkButton>);
        const btn = screen.getByRole('button');
        expect(btn).toBeDisabled();
        expect(btn).toHaveAttribute('aria-busy', 'true');
    });

    it('renders as correct size', () => {
        render(<SparkButton size="lg" data-testid="btn">Large</SparkButton>);
        expect(screen.getByTestId('btn')).toHaveAttribute('data-size', 'lg');
    });
});

// ─── SparkInput ──────────────────────────────────────────────────────────────

describe('SparkInput', () => {
    it('renders without a label', () => {
        render(<SparkInput placeholder="Enter value" />);
        expect(screen.getByPlaceholderText('Enter value')).toBeInTheDocument();
    });

    it('renders with a label', () => {
        render(<SparkInput label="Email" placeholder="email" />);
        expect(screen.getByLabelText('Email')).toBeInTheDocument();
        expect(screen.getByText('Email')).toBeInTheDocument();
    });

    it('shows required asterisk when required', () => {
        render(<SparkInput label="Name" required />);
        const asterisk = screen.getByText('*');
        expect(asterisk).toBeInTheDocument();
    });

    it('renders helper text', () => {
        render(<SparkInput helperText="Must be 8 characters" />);
        expect(screen.getByText('Must be 8 characters')).toBeInTheDocument();
    });

    it('renders error message with role=alert', () => {
        render(<SparkInput error="This field is required" />);
        const errorEl = screen.getByRole('alert');
        expect(errorEl).toHaveTextContent('This field is required');
    });

    it('marks input as aria-invalid when error is provided', () => {
        render(<SparkInput error="Bad value" />);
        expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true');
    });

    it('associates input with error via aria-describedby', () => {
        render(<SparkInput id="myInput" error="Error message" />);
        const input = screen.getByRole('textbox');
        const errorId = input.getAttribute('aria-describedby');
        expect(errorId).toBeTruthy();
        const errorEl = document.getElementById(errorId!);
        expect(errorEl).toHaveTextContent('Error message');
    });

    it('calls onChange when user types', () => {
        const onChange = vi.fn();
        render(<SparkInput onChange={onChange} />);
        fireEvent.change(screen.getByRole('textbox'), { target: { value: 'test' } });
        expect(onChange).toHaveBeenCalledTimes(1);
    });
});

// ─── SparkAlert ──────────────────────────────────────────────────────────────

describe('SparkAlert', () => {
    it('renders with role=alert', () => {
        render(<SparkAlert>Something happened</SparkAlert>);
        expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('renders success variant', () => {
        render(<SparkAlert variant="success" data-testid="alert">OK</SparkAlert>);
        expect(screen.getByTestId('alert')).toHaveAttribute('data-variant', 'success');
    });

    it('renders error variant', () => {
        render(<SparkAlert variant="error" data-testid="alert">Error</SparkAlert>);
        expect(screen.getByTestId('alert')).toHaveAttribute('data-variant', 'error');
    });

    it('renders warning variant', () => {
        render(<SparkAlert variant="warning" data-testid="alert">Warn</SparkAlert>);
        expect(screen.getByTestId('alert')).toHaveAttribute('data-variant', 'warning');
    });

    it('renders title when provided', () => {
        render(<SparkAlert title="Important Notice">Details</SparkAlert>);
        expect(screen.getByText('Important Notice')).toBeInTheDocument();
        expect(screen.getByText('Details')).toBeInTheDocument();
    });

    it('renders dismiss button when dismissible', () => {
        render(<SparkAlert dismissible>Content</SparkAlert>);
        expect(screen.getByRole('button', { name: /dismiss/i })).toBeInTheDocument();
    });

    it('calls onDismiss when dismiss button is clicked', () => {
        const onDismiss = vi.fn();
        render(<SparkAlert dismissible onDismiss={onDismiss}>Content</SparkAlert>);
        fireEvent.click(screen.getByRole('button', { name: /dismiss/i }));
        expect(onDismiss).toHaveBeenCalledTimes(1);
    });

    it('does not render dismiss button when not dismissible', () => {
        render(<SparkAlert>Content</SparkAlert>);
        expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });
});

// ─── SparkBadge ──────────────────────────────────────────────────────────────

describe('SparkBadge', () => {
    it('renders children', () => {
        render(<SparkBadge>Active</SparkBadge>);
        expect(screen.getByText('Active')).toBeInTheDocument();
    });

    it('renders with default variant', () => {
        render(<SparkBadge data-testid="badge">Label</SparkBadge>);
        expect(screen.getByTestId('badge')).toHaveAttribute('data-variant', 'default');
    });

    it('renders success variant', () => {
        render(<SparkBadge variant="success" data-testid="badge">OK</SparkBadge>);
        expect(screen.getByTestId('badge')).toHaveAttribute('data-variant', 'success');
    });

    it('renders error variant', () => {
        render(<SparkBadge variant="error" data-testid="badge">Fail</SparkBadge>);
        expect(screen.getByTestId('badge')).toHaveAttribute('data-variant', 'error');
    });

    it('renders warning variant', () => {
        render(<SparkBadge variant="warning" data-testid="badge">Warn</SparkBadge>);
        expect(screen.getByTestId('badge')).toHaveAttribute('data-variant', 'warning');
    });

    it('renders info variant', () => {
        render(<SparkBadge variant="info" data-testid="badge">Info</SparkBadge>);
        expect(screen.getByTestId('badge')).toHaveAttribute('data-variant', 'info');
    });

    it('forwards additional className', () => {
        render(<SparkBadge className="custom" data-testid="badge">X</SparkBadge>);
        expect(screen.getByTestId('badge')).toHaveClass('custom');
    });
});

// ─── SparkStepper ────────────────────────────────────────────────────────────

describe('SparkStepper', () => {
    const steps = [
        { label: 'Step 1', description: 'First step' },
        { label: 'Step 2', description: 'Second step' },
        { label: 'Step 3', description: 'Third step' },
    ];

    it('renders all step labels', () => {
        render(<SparkStepper steps={steps} currentStep={0} />);
        // Labels appear twice (once in the indicator list, once in the label row for horizontal)
        expect(screen.getAllByText('Step 1').length).toBeGreaterThan(0);
        expect(screen.getAllByText('Step 2').length).toBeGreaterThan(0);
        expect(screen.getAllByText('Step 3').length).toBeGreaterThan(0);
    });

    it('marks current step with aria-current="step"', () => {
        render(<SparkStepper steps={steps} currentStep={1} />);
        const current = screen.getByRole('list').querySelectorAll('[aria-current="step"]');
        expect(current).toHaveLength(1);
    });

    it('renders a navigation landmark', () => {
        render(<SparkStepper steps={steps} currentStep={2} />);
        expect(screen.getByRole('navigation')).toBeInTheDocument();
    });

    it('renders vertical orientation', () => {
        render(<SparkStepper steps={steps} currentStep={0} orientation="vertical" />);
        expect(screen.getByRole('navigation')).toHaveAttribute('data-orientation', 'vertical');
    });

    it('renders horizontal orientation by default', () => {
        render(<SparkStepper steps={steps} currentStep={0} />);
        expect(screen.getByRole('navigation')).toHaveAttribute('data-orientation', 'horizontal');
    });
});
