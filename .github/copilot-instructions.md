# Copilot Instructions for RoyaltyRadar

## Overview

RoyaltyRadar is an AI-powered music catalog audit and revenue recovery platform. It helps rights holders (publishers, writers, labels) identify metadata gaps, detect missing royalties, and automate the recovery process across PROs and DSPs.

## Tech Stack

- **Framework**: Next.js 16 (App Router, React 19)
- **Language**: TypeScript (strict mode)
- **Database**: Prisma ORM with PostgreSQL
- **Background Jobs**: BullMQ with Redis
- **Authentication**: NextAuth.js
- **Payments**: Stripe
- **UI/UX**: Tailwind CSS v4, shadcn/ui, Framer Motion, Recharts
- **Testing**: Vitest (unit tests), Playwright (E2E tests)

## Commands

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Lint code
npm run lint

# Type check
npx tsc --noEmit

# Run unit tests
npm run test

# Run E2E tests
npm run test:e2e

# Run background workers
npm run worker

# Database operations
npx prisma migrate dev  # Run migrations
npx prisma generate     # Generate Prisma client
npm run db:seed         # Seed the database
```

## Project Structure

```
src/
├── app/             # Next.js App Router pages and API routes
├── components/      # React components (UI, dashboard, portal)
├── hooks/           # Custom React hooks
├── jobs/            # Background worker definitions
├── lib/             # Core business logic and utilities
│   ├── api/         # API utilities
│   ├── auth/        # Authentication utilities
│   ├── clients/     # External API clients
│   ├── finance/     # Financial calculations, currency, statements
│   ├── infra/       # Infrastructure (queues, webhooks, audit chain)
│   ├── music/       # Music metadata utilities
│   └── ...          # Other utilities
├── types/           # TypeScript type definitions
└── __tests__/       # Unit tests
prisma/
├── schema.prisma    # Database schema
├── migrations/      # Database migrations
└── seed.ts          # Database seeding script
e2e/                 # Playwright E2E tests
```

## Coding Standards

### TypeScript

- Use strict typing; avoid `any` type
- Define interfaces and types for all data structures
- Always declare types for function parameters and return values
- Use Prisma-generated types (e.g., `Prisma.TransactionClient`) for database operations

### React Components

- Use function components with hooks
- Place components in `src/components/` organized by feature
- Use shadcn/ui components for consistent UI
- Style with Tailwind CSS classes

### API Routes

- Public API endpoints under `/api/v1/` require API key authentication via `validateApiKey()`
- Support pagination with `page`/`limit` parameters
- Return consistent JSON response structures
- Handle errors with appropriate HTTP status codes

### Database

- Use Prisma for all database operations
- Define models in `prisma/schema.prisma`
- Use transactions for multi-step operations
- Always run `npx prisma generate` after schema changes

### Background Jobs

- Define workers in `src/jobs/`
- Use BullMQ queues defined in `src/lib/infra/queue.ts`
- Implement proper error handling and retries

## Testing Guidelines

### Unit Tests

- Place tests in `src/__tests__/` or colocated with components in `__tests__` directories
- Use Vitest as the test runner
- Write tests for business logic in `src/lib/`
- Aim for high coverage of critical paths

### E2E Tests

- Place E2E tests in `e2e/` directory
- Use Playwright for browser automation
- Test critical user flows and integrations

## Security Considerations

- Never commit secrets or credentials to the repository
- Use environment variables for sensitive configuration
- Implement RBAC for access control (`src/lib/rbac.ts`)
- Validate and sanitize all user inputs using Zod schemas
- Follow CSP hardening practices in `next.config.ts`
- Use HMAC-SHA256 signatures for webhook verification

## Boundaries

- Do not modify `.env` files or commit secrets
- Do not edit files in `node_modules/`
- Keep changes focused and minimal
- Run tests before submitting PRs
