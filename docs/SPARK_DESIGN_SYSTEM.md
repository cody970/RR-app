# Spark Design System — RoyaltyRadar

This document describes how the Spark Design System is implemented in the
RoyaltyRadar application. Because the official `@sparkdesignsystem/spark-react`
and `@sparkdesignsystem/spark-core` npm packages are not available, a local
Spark-inspired library has been built under `src/components/spark/` using
**Tailwind CSS v4** and **class-variance-authority (CVA)** as the foundation.

---

## Contents

1. [Architecture Overview](#architecture-overview)
2. [Theme Tokens](#theme-tokens)
3. [Component Reference](#component-reference)
4. [Migration Guide](#migration-guide)
5. [Accessibility Checklist](#accessibility-checklist)
6. [Component Mapping (shadcn → Spark)](#component-mapping-shadcn--spark)

---

## Architecture Overview

```
src/
├── app/
│   ├── layout.tsx                 ← imports spark-theme-overrides.css globally
│   └── spark-theme-overrides.css  ← CSS custom-property (design token) layer
└── components/
    └── spark/
        ├── index.ts               ← barrel re-export (import from "@/components/spark")
        ├── spark-alert.tsx        ← alert / notification banner
        ├── spark-badge.tsx        ← status badge pill
        ├── spark-button.tsx       ← primary/secondary/tertiary/danger button
        ├── spark-card.tsx         ← card container with semantic variants
        ├── spark-data-table.tsx   ← sortable, paginated data table
        ├── spark-input.tsx        ← accessible text input with label / error
        ├── spark-modal.tsx        ← accessible focus-trapped modal dialog
        ├── spark-navigation.tsx   ← responsive sidebar / mobile drawer
        └── spark-stepper.tsx      ← multi-step workflow progress indicator
```

All components follow these principles:

- **Design tokens** — consume `--sprk-*` CSS variables instead of hard-coded
  colours or dimensions.
- **Accessibility** — proper `aria-*` attributes, `role`, keyboard navigation,
  and focus management built in.
- **Dark-mode** — token overrides under `.dark` keep every component theme-aware.
- **Composability** — wraps or extends the same patterns used by the existing
  shadcn/ui components so they coexist without conflict.

---

## Theme Tokens

Tokens are declared in `src/app/spark-theme-overrides.css` as CSS custom
properties and are available globally.

### Colour tokens

| Token | Light value | Dark value | Description |
|---|---|---|---|
| `--sprk-color-primary` | `#22c55e` (green-500) | ← same | Brand primary |
| `--sprk-color-primary-dark` | `#16a34a` (green-600) | ← same | Hover state |
| `--sprk-color-primary-light` | `#4ade80` (green-400) | ← same | Active / focus ring |
| `--sprk-color-secondary` | `#3b82f6` (blue-500) | ← same | Secondary actions |
| `--sprk-color-success` | `#22c55e` (green-500) | ← same | Success messages |
| `--sprk-color-error` | `#dc2626` (red-600) | ← same | Error / danger states |
| `--sprk-color-warning` | `#f59e0b` (amber-500) | ← same | Warning messages |
| `--sprk-color-info` | `#3b82f6` (blue-500) | ← same | Informational messages |
| `--sprk-color-neutral-{50…900}` | neutral-{50…900} | inverted scale | Neutral greys |

### Typography tokens

| Token | Value |
|---|---|
| `--sprk-font-family` | `'Inter', system-ui, sans-serif` |
| `--sprk-font-size-{xs…2xl}` | `0.75rem` – `1.5rem` |
| `--sprk-font-weight-{normal…bold}` | `400` – `700` |

### Spacing tokens

`--sprk-spacing-{1…12}` maps to `0.25rem` – `3rem` (multiples of 0.25rem).

### Border & radius tokens

| Token | Value |
|---|---|
| `--sprk-border-radius-sm` | `0.5rem` (rounded-lg) |
| `--sprk-border-radius` | `0.75rem` (rounded-xl) |
| `--sprk-border-radius-lg` | `1rem` (rounded-2xl) |
| `--sprk-border-radius-full` | `9999px` (rounded-full) |
| `--sprk-border-color` | neutral-200 (light) / neutral-700 (dark) |

---

## Component Reference

### `SparkCard`

A card container supporting four semantic variants that pair with dashboard KPIs.

```tsx
import { SparkCard, SparkCardHeader, SparkCardTitle, SparkCardContent } from "@/components/spark";

<SparkCard variant="highlighted">
  <SparkCardHeader>
    <SparkCardTitle>Metadata Match Rate</SparkCardTitle>
  </SparkCardHeader>
  <SparkCardContent>
    <p className="text-3xl font-bold text-emerald-600">94%</p>
  </SparkCardContent>
</SparkCard>
```

**Variants**

| Variant | Intended usage |
|---|---|
| `default` | General catalog / neutral information |
| `highlighted` | Positive KPI (match rate, revenue) |
| `warning` | Alerts requiring attention (anomalies) |
| `info` | Secondary information (leakage, estimates) |

---

### `SparkButton`

```tsx
import { SparkButton } from "@/components/spark";

// Primary action
<SparkButton variant="primary" onClick={save}>Save</SparkButton>

// Loading state (automatically disables and shows spinner)
<SparkButton variant="primary" loading={isSaving}>Save</SparkButton>

// Danger action
<SparkButton variant="danger" onClick={handleDelete}>Delete</SparkButton>
```

**Variants**: `primary` | `secondary` | `tertiary` | `danger` | `ghost` | `link`  
**Sizes**: `sm` | `default` | `lg` | `icon` | `icon-sm`

---

### `SparkInput`

Accessible input with built-in label, helper text, and error state.

```tsx
import { SparkInput } from "@/components/spark";

<SparkInput
  id="email"
  type="email"
  label="Email address"
  required
  placeholder="you@example.com"
  error={errors.email}
  helperText="We'll never share your email."
  onChange={(e) => setEmail(e.target.value)}
/>
```

The label is automatically linked to the input via `htmlFor`/`id`. When `error`
is provided the input receives `aria-invalid="true"` and the error text is
wired up via `aria-describedby`.

---

### `SparkAlert`

Inline notification banner. Use `role="alert"` is automatically applied.

```tsx
import { SparkAlert } from "@/components/spark";

<SparkAlert variant="error" title="Authentication failed" dismissible onDismiss={clearError}>
  Invalid email or password. Please try again.
</SparkAlert>
```

**Variants**: `success` | `error` | `warning` | `info`

---

### `SparkModal`

Focus-trapped dialog with Escape-to-close and backdrop-click-to-close.

```tsx
import { SparkModal } from "@/components/spark";

<SparkModal
  open={isOpen}
  onClose={() => setIsOpen(false)}
  title="Confirm Deletion"
  description="This action cannot be undone."
  size="sm"
>
  <div className="flex justify-end gap-2 mt-4">
    <SparkButton variant="tertiary" onClick={() => setIsOpen(false)}>Cancel</SparkButton>
    <SparkButton variant="danger" onClick={handleDelete}>Delete</SparkButton>
  </div>
</SparkModal>
```

**Sizes**: `sm` | `md` | `lg` | `xl` | `full`

---

### `SparkBadge`

Status pill indicator.

```tsx
import { SparkBadge } from "@/components/spark";

<SparkBadge variant="success">Active</SparkBadge>
<SparkBadge variant="warning">Pending</SparkBadge>
<SparkBadge variant="error">Rejected</SparkBadge>
```

**Variants**: `default` | `success` | `warning` | `error` | `info` | `primary` | `outline`

---

### `SparkStepper`

Multi-step progress indicator for onboarding and wizard flows.

```tsx
import { SparkStepper } from "@/components/spark";

const steps = [
  { label: "Connect Catalog" },
  { label: "Run Audit" },
  { label: "Review Findings" },
  { label: "Recover Revenue" },
];

<SparkStepper steps={steps} currentStep={activeStep} orientation="horizontal" />
```

---

### `SparkNavigation`

Responsive sidebar (desktop) + mobile drawer.

```tsx
import { SparkNavigation } from "@/components/spark";

<SparkNavigation
  items={navItems}
  logo={<Logo />}
  footer={<UserAvatar />}
/>
```

---

### `SparkDataTable`

Generic, client-side sortable and paginated data table.

```tsx
import { SparkDataTable } from "@/components/spark";

const columns = [
  { key: "title", header: "Title", sortable: true },
  { key: "status", header: "Status", statusMap: { ACTIVE: "success", PENDING: "warning" } },
  { key: "amount", header: "Amount", sortable: true },
];

<SparkDataTable
  columns={columns}
  data={works}
  rowKey="id"
  pageSize={25}
  caption="Works catalog"
  onRowClick={(row) => router.push(`/catalog/${row.id}`)}
/>
```

---

## Migration Guide

### How to replace a shadcn Card

```diff
- import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
+ import { SparkCard, SparkCardHeader, SparkCardTitle, SparkCardContent } from "@/components/spark";

- <Card className="border-emerald-200 bg-emerald-50">
+ <SparkCard variant="highlighted">
-   <CardHeader><CardTitle>Match Rate</CardTitle></CardHeader>
+   <SparkCardHeader><SparkCardTitle>Match Rate</SparkCardTitle></SparkCardHeader>
-   <CardContent>…</CardContent>
+   <SparkCardContent>…</SparkCardContent>
- </Card>
+ </SparkCard>
```

### How to replace a shadcn Button

```diff
- import { Button } from "@/components/ui/button";
+ import { SparkButton } from "@/components/spark";

- <Button variant="outline" disabled={loading}>
-   {loading ? <Loader2 className="animate-spin" /> : null}
-   Save
- </Button>
+ <SparkButton variant="tertiary" loading={loading}>Save</SparkButton>
```

### How to replace a raw `<input>` with label

```diff
- <div>
-   <Label htmlFor="email">Email</Label>
-   <Input id="email" type="email" … />
-   {error && <p className="text-red-600">{error}</p>}
- </div>
+ <SparkInput id="email" type="email" label="Email" error={error} … />
```

---

## Accessibility Checklist

- [x] **Skip-to-content link** in root layout (`<a href="#main-content" className="sprk-skip-link">`)
- [x] **Interactive icons** wrapped in `aria-hidden="true"` throughout Spark components
- [x] **`aria-label`** on every icon-only button (`SparkButton`, dismiss button, pagination)
- [x] **`role="alert"`** on `SparkAlert` and `SparkInput` error messages for live-region announcements
- [x] **`aria-invalid`** set on `SparkInput` when an error is present
- [x] **`aria-describedby`** connects inputs to helper / error text
- [x] **`aria-current="page"`** on active navigation links in `SparkNavigation`
- [x] **`aria-current="step"`** on the active stepper step
- [x] **`aria-busy`** on `SparkButton` during loading state
- [x] **`aria-expanded`** on collapsible nav groups
- [x] **Focus management** in `SparkModal` — first focusable element receives focus on open; Escape closes
- [x] **Keyboard navigation** for `SparkModal` backdrop and `SparkDataTable` rows (Enter to activate)
- [x] **WCAG AA contrast** — brand tokens (amber-600 on white, emerald/red/blue on tinted backgrounds) all meet 4.5:1
- [ ] **Automated axe audit** — add `vitest-axe` or `jest-axe` for regression testing (future)

---

## Component Mapping (shadcn → Spark)

| shadcn component | Spark replacement | Notes |
|---|---|---|
| `Card / CardHeader / CardTitle / CardContent / CardFooter` | `SparkCard / SparkCardHeader …` | Add `variant` prop for semantic colour |
| `Button` | `SparkButton` | Maps `outline` → `tertiary`; adds `loading` prop |
| `Input` + `Label` | `SparkInput` | Bundles label, helper, and error in one component |
| `Badge` | `SparkBadge` | Adds `success / warning / error / info` variants |
| `Dialog / DialogContent` | `SparkModal` | Built-in focus-trap and Escape handling |
| —  | `SparkAlert` | New: replaces ad-hoc error `<div>` elements |
| — | `SparkStepper` | New: for onboarding wizard steps |
| — | `SparkNavigation` | New: responsive sidebar navigation |
| — | `SparkDataTable` | New: replaces raw `<table>` across tables |
| `Tooltip`, `Select`, `Checkbox` | _keep shadcn_ | No Spark equivalent planned yet |
| `Recharts` charts | _keep Recharts_ | Wrap in `SparkCard`; Spark has no chart component |
