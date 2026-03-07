# Hotfix Deployment Guide

## Overview
This guide provides step-by-step instructions for deploying the production bug fixes to the RoyaltyRadar application.

## Pre-Deployment Checklist

### Environment Preparation
- [ ] Backup current production database
- [ ] Note current Redis configuration
- [ ] Document current error rates and system metrics
- [ ] Prepare rollback plan
- [ ] Notify stakeholders of deployment window

### Monitoring Setup
- [ ] Configure alerting for new metrics
- [ ] Set up dashboards for circuit breaker states
- [ ] Prepare log aggregation for correlation IDs
- [ ] Test monitoring endpoints

## Deployment Steps

### Step 1: Create Hotfix Branch
```bash
cd RR-app
git checkout -b hotfix/production-bug-fixes
```

### Step 2: Deploy Infrastructure Modules
These are foundational changes that should be deployed first:

```bash
# Commit new utility modules
git add src/lib/infra/logger-async.ts
git add src/lib/infra/retry.ts
git add src/lib/infra/db-connection.ts
git add src/lib/infra/redis-connection.ts
git add src/lib/infra/enhanced-enrichment.ts

git commit -m "feat: Add robust infrastructure modules for error handling and retry logic

- Add async logger with correlation IDs and error categorization
- Implement retry logic with exponential backoff and circuit breakers
- Add enhanced database connection manager with health monitoring
- Add enhanced Redis connection manager with reconnection logic
- Implement enhanced enrichment service with comprehensive error handling"
```

### Step 3: Update Rate Limiting
```bash
git add src/lib/infra/rate-limit.ts
git commit -m "fix: Enhance rate limiting with retry logic and fallback

- Add retry logic for Redis operations
- Implement sliding window rate limiter
- Add distributed locking for rate limit checks
- Implement fail-open strategy for service continuity"
```

### Step 4: Update API Endpoint
```bash
git add src/app/api/audit/run/route.ts
git commit -m "fix: Eliminate race condition in audit job creation

- Implement distributed locking to prevent concurrent audits
- Use transaction-based job creation for atomicity
- Add correlation IDs for request tracing
- Enhance error handling with comprehensive logging"
```

### Step 5: Update Worker
```bash
git add src/jobs/audit-worker.ts
git commit -m "fix: Enhance audit worker with comprehensive error handling

- Add retry logic for database operations
- Implement per-item error handling to prevent cascading failures
- Add circuit breaker for external API calls
- Enhance logging with error counts and detailed diagnostics"
```

### Step 6: Update Enrichment Service
```bash
# Update existing enrichment to use enhanced version
# This may require updating imports in consuming modules
git add src/lib/music/enrichment.ts
git commit -m "feat: Switch to enhanced enrichment service with retry logic

- Use enhanced enrichment with circuit breaker pattern
- Add comprehensive error handling for external API calls
- Implement fallback strategies"
```

### Step 7: Push and Create Pull Request
```bash
git push origin hotfix/production-bug-fixes

# Create pull request in GitHub
gh pr create \
  --title "Hotfix: Fix Production Bugs - Race Conditions, Error Handling, Retry Logic" \
  --body "Comprehensive fixes for intermittent production failures including:
  
  1. Race condition in audit job creation
  2. Missing retry logic for external API calls
  3. Database connection instability
  4. Redis connection issues
  5. Insufficient error handling and logging
  6. Rate limiting without fallback
  7. Audit worker error handling
  
  See BUG_FIX_SUMMARY.md for detailed information." \
  --base main
```

### Step 8: Review and Merge
- [ ] Code review completed
- [ ] All automated tests passing
- [ ] Manual testing completed
- [ ] Documentation reviewed
- [ ] Stakeholder approval received

### Step 9: Deploy to Production
```bash
# After merge, deploy to production
git checkout main
git pull origin main
# Deploy using your preferred deployment method (CI/CD, manual, etc.)
```

## Post-Deployment Verification

### Immediate Checks (within 5 minutes)
- [ ] Application is running and responsive
- [ ] Database connections are healthy
- [ ] Redis connections are healthy
- [ ] No error spikes in logs
- [ ] Circuit breakers are in correct state

### Short-term Monitoring (within 1 hour)
- [ ] Monitor error rates by category
- [ ] Check retry statistics
- [ ] Verify circuit breaker states
- [ ] Review correlation ID tracking
- [ ] Monitor audit job success rates

### Long-term Monitoring (within 24-48 hours)
- [ ] Track overall error rates
- [ ] Monitor performance metrics
- [ ] Review circuit breaker state changes
- [ ] Analyze retry patterns
- [ ] Validate race condition elimination

## Monitoring Commands

### Check Circuit Breaker States
```bash
# Add monitoring endpoint (if not present)
curl http://localhost:3000/api/health/circuit-breakers
```

### View Error Rates by Category
```bash
# Check logs for error categories
grep "error_category" logs/app.log | cut -d'"' -f4 | sort | uniq -c
```

### Monitor Retry Statistics
```bash
# Track retry attempts
grep "retry_attempt" logs/app.log | wc -l
```

### Check Connection Health
```bash
# Database health
curl http://localhost:3000/api/health/database

# Redis health
curl http://localhost:3000/api/health/redis
```

## Rollback Procedures

### Immediate Rollback (if critical issues)
```bash
# Revert to previous commit
git revert <commit-hash>
# Or checkout previous stable version
git checkout <previous-stable-tag>
# Redeploy
```

### Partial Rollback
- **If API endpoint issues**: Revert `src/app/api/audit/run/route.ts`
- **If worker issues**: Revert `src/jobs/audit-worker.ts`
- **If infrastructure issues**: Revert new infrastructure modules

### Disable Circuit Breakers
If circuit breakers are causing issues, disable them temporarily:
```bash
# Add environment variable to disable circuit breakers
DISABLE_CIRCUIT_BREAKERS=true
```

## Troubleshooting

### High Error Rates
1. Check circuit breaker states
2. Review error categories
3. Analyze retry patterns
4. Verify external service health
5. Check database/Redis connectivity

### Circuit Breaker Issues
1. Check failure threshold configuration
2. Review reset timeout settings
3. Analyze underlying service issues
4. Consider temporary reset
5. Adjust thresholds if needed

### Race Condition Still Occurring
1. Verify distributed lock implementation
2. Check Redis connectivity
3. Review lock timeout settings
4. Analyze concurrent request patterns
5. Check transaction isolation levels

### Performance Degradation
1. Review retry counts and backoff times
2. Check circuit breaker state transitions
3. Analyze connection pool usage
4. Monitor external API response times
5. Review database query performance

## Success Criteria

Deployment is considered successful when:
- [ ] Zero concurrent audit job creation race conditions
- [ ] Retry logic handling 95%+ of transient errors
- [ ] Error rates reduced by 80%+ compared to baseline
- [ ] Circuit breakers preventing cascading failures
- [ ] Correlation IDs enabling request tracing
- [ ] Monitoring and alerting working as expected
- [ ] System stability maintained over 48 hours

## Communication

### During Deployment
- Notify team: "Starting hotfix deployment"
- Update status every 15 minutes
- Alert immediately on any issues

### Post-Deployment
- Notify team: "Hotfix deployment completed"
- Share monitoring results after 1 hour
- Share monitoring results after 24 hours
- Document any issues and resolutions

### Stakeholder Updates
- Pre-deployment: "Hotfix deployment scheduled for [time]"
- During deployment: "Hotfix deployment in progress"
- Post-deployment: "Hotfix deployment successful - monitoring underway"

## Documentation Updates

- [ ] Update operations documentation
- [ ] Update runbook with new procedures
- [ ] Document monitoring dashboards
- [ ] Update troubleshooting guides
- [ ] Share best practices with team

## Contact Information

- **Deployment Lead**: [Contact]
- **On-Call Engineer**: [Contact]
- **Engineering Manager**: [Contact]
- **Stakeholder Contact**: [Contact]

## Additional Resources

- [Bug Investigation Report](./bug_investigation_report.md)
- [Bug Fix Summary](./BUG_FIX_SUMMARY.md)
- [System Architecture Documentation](./README.md)
- [API Documentation](./docs/api.md)