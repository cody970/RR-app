# Development Tools Setup Guide

This document covers the setup of enhanced development tools for RoyaltyRadar.

## Tools Being Added

1. **Docker Compose** - Local development environment (PostgreSQL, Redis)
2. **Playwright** - End-to-end testing
3. **GitHub Actions Enhancement** - CI/CD improvements
4. **Bull Board** - Queue monitoring UI
5. **Sentry** - Error tracking and performance monitoring

---

## 1. Docker Compose Setup

### What's Included
- **PostgreSQL 16** - Database with persistent storage
- **Redis 7** - Cache and queue backend
- **Redis Commander** - GUI for Redis management (optional)

### Quick Start

```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# Stop and remove volumes (clean slate)
docker-compose down -v

# View logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f postgres
docker-compose logs -f redis
```

### Configuration
- **PostgreSQL**: `localhost:5432`
  - User: `root`
  - Password: `password`
  - Database: `royalty-radar`
- **Redis**: `localhost:6379`
- **Redis Commander**: `http://localhost:8081`

### Environment Variables
Copy the example environment file:
```bash
cp .env.docker .env.local
```

Then update the values as needed.

---

## 2. Playwright E2E Testing

### Installation
Already installed in your project.

### Running Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run tests in UI mode (interactive)
npm run test:e2e:ui

# Run tests in debug mode
npm run test:e2e:debug

# View test report
npm run test:e2e:report
```

### Test Files
- `e2e/auth.spec.ts` - Authentication flows
- `e2e/dashboard.spec.ts` - Dashboard functionality
- `e2e/royalty-flows.spec.ts` - Royalty management workflows
- `e2e/api.spec.ts` - API endpoint testing

### Writing New Tests

```typescript
import { test, expect } from '@playwright/test';

test('should do something', async ({ page }) => {
  await page.goto('/your-page');
  await expect(page.locator('h1')).toContainText('Expected Text');
  
  // Interact with elements
  await page.click('button');
  await page.fill('input', 'value');
  
  // Assertions
  await expect(page).toHaveURL(/expected-url/);
});
```

### Configuration
Edit `playwright.config.ts` to:
- Change base URL
- Add more browsers
- Adjust retry logic
- Configure screenshots/videos

---

## 3. GitHub Actions Workflows

### CI Workflow (`.github/workflows/ci.yml`)
Runs on every push and PR:
- Sets up Docker services (PostgreSQL, Redis)
- Runs linting
- Type checking
- Unit tests
- E2E tests
- Uploads test artifacts

### Deploy Workflow (`.github/workflows/deploy.yml`)
Runs on push to main/master:
- Builds application
- Runs database migrations
- Deploys to production
- Creates Sentry release
- Sends notifications

### Staging Workflow (`.github/workflows/staging.yml`)
Runs on pull requests:
- Deploys to staging environment
- Creates Sentry release for staging
- Comments PR with staging URL

### Required Secrets
Add these to your GitHub repository settings:

**For All Environments:**
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- `NEXTAUTH_URL` - NextAuth base URL
- `NEXTAUTH_SECRET` - NextAuth secret key
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Stripe publishable key
- `STRIPE_SECRET_KEY` - Stripe secret key
- `STRIPE_WEBHOOK_SECRET` - Stripe webhook secret

**Staging Only:**
- `STAGING_DATABASE_URL`
- `STAGING_REDIS_URL`
- `STAGING_NEXTAUTH_URL`
- `STAGING_NEXTAUTH_SECRET`
- `STAGING_STRIPE_PUBLISHABLE_KEY`
- `STAGING_STRIPE_SECRET_KEY`
- `STAGING_STRIPE_WEBHOOK_SECRET`

**Sentry (Optional):**
- `NEXT_PUBLIC_SENTRY_DSN`
- `SENTRY_AUTH_TOKEN`
- `SENTRY_ORG`
- `SENTRY_PROJECT`

**For Vercel Deployment (Optional):**
- `VERCEL_TOKEN`

---

## 4. Bull Board Queue Monitoring

### What's Included
- Queue monitoring API route at `/api/queues`
- Queue monitoring page at `/queues`
- Support for `audit-jobs` and `scan-jobs` queues

### Accessing the UI
1. Navigate to `http://localhost:3000/queues`
2. View queue statistics:
   - Waiting jobs
   - Active jobs
   - Delayed jobs
   - Failed jobs

### Queue Management
From the monitoring page, you can:
- View real-time queue statistics
- Monitor job processing
- Identify failed jobs
- Track queue performance

### Adding More Queues
Edit `src/app/api/queues/route.ts`:

```typescript
import { Queue } from 'bullmq';

// Add your new queue
const newQueue = new Queue('your-queue-name', { connection: redis });
const newAdapter = new BullMQAdapter(newQueue);

// Add to queues array in createBullBoard
createBullBoard({
  queues: [auditAdapter, scanAdapter, newAdapter],
  serverAdapter,
});
```

---

## 5. Sentry Integration

### What's Included
- Client-side error tracking
- Server-side error tracking
- Edge runtime error tracking
- Performance monitoring
- Session replay
- Source map upload

### Configuration Files
- `sentry.client.config.ts` - Client-side configuration
- `sentry.server.config.ts` - Server-side configuration
- `sentry.edge.config.ts` - Edge runtime configuration
- `sentry.properties` - CLI configuration
- `src/lib/sentry.ts` - Helper utilities

### Setting Up Sentry

1. **Create a Sentry Account**
   - Go to https://sentry.io
   - Create a new organization
   - Create a new project (select Next.js)

2. **Get Your Configuration**
   - Copy your DSN from Sentry dashboard
   - Note your organization slug and project slug

3. **Update Environment Variables**
   Add to `.env.local`:
   ```bash
   NEXT_PUBLIC_SENTRY_DSN=https://your-dsn@sentry.io/your-project-id
   SENTRY_DSN=https://your-dsn@sentry.io/your-project-id
   SENTRY_AUTH_TOKEN=your-auth-token
   SENTRY_ORG=your-org-slug
   SENTRY_PROJECT=your-project-slug
   ```

4. **Generate Source Maps**
   Source maps are automatically uploaded during build when `SENTRY_AUTH_TOKEN` is set.

### Usage in Code

```typescript
import { reportError, reportMessage, setUserContext, addBreadcrumb } from '@/lib/sentry';

// Report an error
try {
  // Your code
} catch (error) {
  reportError(error as Error, { userId: '123', action: 'something' });
}

// Report a message
reportMessage('User completed checkout', 'info', { userId: '123', amount: 100 });

// Set user context
setUserContext({ id: '123', email: 'user@example.com', role: 'ADMIN' });

// Add breadcrumb
addBreadcrumb('User clicked button', 'user', { buttonId: 'submit' });

// Clear user context on logout
clearUserContext();
```

### Testing Sentry

```bash
# Test error reporting
# Add this to a component temporarily:
throw new Error('Test Sentry error');

# Check Sentry dashboard to see the error
```

---

## Complete Development Workflow

### First Time Setup

```bash
# 1. Install dependencies
npm install

# 2. Start Docker services
docker-compose up -d

# 3. Setup environment
cp .env.docker .env.local
# Edit .env.local with your values

# 4. Run database migrations
npx prisma migrate dev

# 5. Start development server
npm run dev

# 6. (Optional) Start workers in separate terminals
npm run dev:worker
npm run dev:worker:scan
```

### Daily Development

```bash
# Start services
docker-compose up -d

# Start dev server
npm run dev

# Run tests
npm run test              # Unit tests
npm run test:e2e          # E2E tests

# Check queues
# Visit http://localhost:3000/queues
# or http://localhost:8081 for Redis Commander

# Check Sentry
# Visit your Sentry dashboard
```

### Before Committing

```bash
# Run linting
npm run lint

# Run type checking
npx tsc --noEmit

# Run all tests
npm run test
npm run test:e2e
```

### Pushing to GitHub

```bash
# Push changes
git add .
git commit -m "Add new feature"
git push

# CI will automatically run:
# - Linting
# - Type checking
# - Unit tests
# - E2E tests

# PR will trigger staging deployment
# Merge to main will trigger production deployment
```

---

## Troubleshooting

### Docker Issues

**PostgreSQL not starting:**
```bash
# Check logs
docker-compose logs postgres

# Restart services
docker-compose restart postgres

# Clean slate
docker-compose down -v
docker-compose up -d
```

**Redis not connecting:**
```bash
# Check if Redis is running
docker exec royalty-radar-redis redis-cli ping

# Should return: PONG
```

### Playwright Issues

**Browser not installed:**
```bash
npx playwright install --with-deps chromium
```

**Tests failing in CI but passing locally:**
- Check if all services are starting properly
- Verify environment variables in GitHub secrets
- Review test artifacts in GitHub Actions

### Bull Board Issues

**Queues not showing:**
- Ensure Redis is running
- Check Redis connection string in environment
- Verify queue names match between code and Bull Board

### Sentry Issues

**Errors not appearing in Sentry:**
- Verify `NEXT_PUBLIC_SENTRY_DSN` is set correctly
- Check browser console for network errors
- Ensure Sentry configuration files are loaded
- Verify `SENTRY_AUTH_TOKEN` for source map upload

**Too many errors:**
- Adjust `tracesSampleRate` in config files
- Add filters in `beforeSend` callback
- Review error groupings in Sentry dashboard

---

## Next Steps

1. **Set up production deployment**
   - Configure Vercel, Railway, or your preferred platform
   - Add deployment secrets to GitHub

2. **Configure Sentry**
   - Create Sentry account
   - Add DSN to environment variables
   - Test error reporting

3. **Add more E2E tests**
   - Test critical user flows
   - Add authentication tests
   - Test payment flows

4. **Set up monitoring**
   - Configure alerts in Sentry
   - Set up uptime monitoring
   - Configure performance budgets

5. **Document your specific deployment process**
   - Update deployment workflows with actual commands
   - Add team-specific onboarding steps

---

## Additional Files Created

### Configuration Files
- `docker-compose.yml` - Docker services configuration
- `playwright.config.ts` - Playwright test configuration
- `.env.docker` - Docker environment variables template
- `sentry.client.config.ts` - Sentry client configuration
- `sentry.server.config.ts` - Sentry server configuration
- `sentry.edge.config.ts` - Sentry edge configuration
- `sentry.properties` - Sentry CLI configuration
- `.gitignore.distributed` - Additional git ignore rules

### Source Files
- `src/lib/sentry.ts` - Sentry helper utilities
- `src/app/api/queues/route.ts` - Bull Board API route
- `src/app/queues/page.tsx` - Queue monitoring UI page

### Test Files
- `e2e/auth.spec.ts` - Authentication E2E tests
- `e2e/dashboard.spec.ts` - Dashboard E2E tests
- `e2e/royalty-flows.spec.ts` - Royalty flows E2E tests
- `e2e/api.spec.ts` - API endpoint E2E tests

### Workflow Files
- `.github/workflows/ci.yml` - CI/CD workflow
- `.github/workflows/deploy.yml` - Production deployment workflow
- `.github/workflows/staging.yml` - Staging deployment workflow

### Package Scripts Added
- `test:e2e` - Run E2E tests
- `test:e2e:ui` - Run E2E tests in UI mode
- `test:e2e:debug` - Run E2E tests in debug mode
- `test:e2e:report` - View E2E test report
- `sentry-wizard` - Run Sentry setup wizard

## Resources

- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Playwright Documentation](https://playwright.dev)
- [GitHub Actions Documentation](https://docs.github.com/actions)
- [Bull Board Documentation](https://github.com/felixmosh/bull-board)
- [Sentry Documentation](https://docs.sentry.io)
- [Next.js Documentation](https://nextjs.org/docs)
- [BullMQ Documentation](https://docs.bullmq.io)

---

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review the official documentation links
3. Check GitHub Issues for similar problems
4. Create a new issue with detailed information