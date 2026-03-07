# RoyaltyRadar Public API Documentation

This document describes the RoyaltyRadar Public REST API, webhook system, and SDK generation.

## Table of Contents

- [Authentication](#authentication)
- [API Endpoints](#api-endpoints)
  - [Catalog](#catalog)
  - [Findings](#findings)
  - [Registrations](#registrations)
  - [Statements](#statements)
  - [Analytics](#analytics)
  - [Webhooks](#webhooks)
- [Webhook System](#webhook-system)
  - [Event Types](#event-types)
  - [Payload Format](#payload-format)
  - [Signature Verification](#signature-verification)
  - [Retry Logic](#retry-logic)
- [SDK Generation](#sdk-generation)
- [Rate Limiting](#rate-limiting)

---

## Authentication

All API requests require authentication via Bearer token (API key).

### Getting an API Key

1. Log in to the RoyaltyRadar dashboard
2. Navigate to **Settings > API Keys**
3. Click **Create New Key**
4. Save the key securely - it will only be shown once

### Using the API Key

Include the API key in the `Authorization` header:

```bash
curl -X GET "https://api.royaltyradar.com/api/v1/catalog" \
  -H "Authorization: Bearer rr_your_api_key_here"
```

API keys expire after 90 days of inactivity.

---

## API Endpoints

Base URL: `https://api.royaltyradar.com/api/v1`

### Catalog

List works and recordings in your catalog.

```http
GET /api/v1/catalog
```

**Query Parameters:**

| Parameter | Type   | Description                          |
|-----------|--------|--------------------------------------|
| type      | string | Filter by type: `all`, `works`, `recordings` |
| search    | string | Search by title                      |
| page      | number | Page number (default: 1)             |
| limit     | number | Items per page (default: 50, max: 100) |

**Response:**

```json
{
  "page": 1,
  "limit": 50,
  "works": [
    {
      "id": "clx...",
      "title": "Song Title",
      "iswc": "T-123456789-0",
      "writers": [
        {
          "id": "clx...",
          "name": "Writer Name",
          "ipi": "00123456789",
          "splitPercent": 50,
          "role": "COMPOSER"
        }
      ],
      "registrations": [...],
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "worksTotal": 150,
  "worksPages": 3,
  "recordings": [...],
  "recordingsTotal": 200,
  "recordingsPages": 4
}
```

### Findings

List audit findings with filtering.

```http
GET /api/v1/findings
```

**Query Parameters:**

| Parameter | Type   | Description                          |
|-----------|--------|--------------------------------------|
| status    | string | Filter by status: `OPEN`, `RECOVERED`, `DISPUTED`, `IGNORED` (comma-separated) |
| severity  | string | Filter by severity: `HIGH`, `MEDIUM`, `LOW` (comma-separated) |
| type      | string | Filter by finding type               |
| since     | string | ISO date, only findings after this date |
| page      | number | Page number (default: 1)             |
| limit     | number | Items per page (default: 50, max: 100) |

### Registrations

List work registrations with PROs/CMOs.

```http
GET /api/v1/registrations
```

**Query Parameters:**

| Parameter | Type   | Description                          |
|-----------|--------|--------------------------------------|
| status    | string | Filter by status: `PENDING`, `SUBMITTED`, `ACKNOWLEDGED`, `REJECTED` |
| society   | string | Filter by society: `ASCAP`, `BMI`, `MLC`, `SESAC` |
| workId    | string | Filter by specific work ID           |
| since     | string | ISO date, only registrations updated after |
| page      | number | Page number (default: 1)             |
| limit     | number | Items per page (default: 50, max: 100) |

### Statements

List imported royalty statements.

```http
GET /api/v1/statements
```

**Query Parameters:**

| Parameter     | Type    | Description                          |
|---------------|---------|--------------------------------------|
| source        | string  | Filter by source: `ASCAP`, `BMI`, `MLC`, `SOUNDEXCHANGE` |
| period        | string  | Filter by period: `2024-Q1`, `2024-01` |
| status        | string  | Filter by status: `PROCESSING`, `PROCESSED`, `FAILED` |
| since         | string  | ISO date, only statements after this date |
| includeLines  | boolean | Include statement lines (default: false) |
| page          | number  | Page number (default: 1)             |
| limit         | number  | Items per page (default: 50, max: 100) |

### Analytics

Get summary analytics for your organization.

```http
GET /api/v1/analytics
```

**Query Parameters:**

| Parameter | Type   | Description                          |
|-----------|--------|--------------------------------------|
| view      | string | View type: `summary`, `revenue`, `findings`, `all` |
| period    | string | Time period: `30d`, `90d`, `1y`, `all` |

### Webhooks

Manage webhook subscriptions.

#### List Webhooks

```http
GET /api/v1/webhooks
```

#### Create Webhook

```http
POST /api/v1/webhooks
```

**Request Body:**

```json
{
  "url": "https://your-server.com/webhook",
  "events": ["finding.created", "finding.recovered"],
  "description": "Production webhook"
}
```

**Response:**

```json
{
  "webhook": {
    "id": "clx...",
    "url": "https://your-server.com/webhook",
    "events": ["finding.created", "finding.recovered"],
    "enabled": true,
    "createdAt": "2024-01-01T00:00:00.000Z"
  },
  "secret": "whsec_abc123..." // Only returned on creation!
}
```

#### Update Webhook

```http
PATCH /api/v1/webhooks/{id}
```

#### Delete Webhook

```http
DELETE /api/v1/webhooks/{id}
```

#### Test Webhook

```http
POST /api/v1/webhooks/{id}/test
```

Sends a test `test.ping` event to verify connectivity.

#### Get Delivery History

```http
GET /api/v1/webhooks/{id}/deliveries
```

---

## Webhook System

### Event Types

| Event                         | Description                          |
|-------------------------------|--------------------------------------|
| `*`                           | Subscribe to all events              |
| `finding.created`             | New audit finding discovered         |
| `finding.recovered`           | Revenue successfully recovered       |
| `finding.status_changed`      | Finding status updated               |
| `statement.imported`          | New statement processed              |
| `statement.matched`           | Statement lines matched to catalog   |
| `audit.completed`             | Full audit run finished              |
| `scan.completed`              | Catalog scan finished                |
| `registration.status_changed` | Registration status changed          |
| `enrichment.completed`        | Metadata enrichment finished         |
| `payout.issued`               | Payout processed                     |
| `catalog.updated`             | Catalog data changed                 |

### Payload Format

All webhook payloads follow this structure:

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "event": "finding.created",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "data": {
    // Event-specific data
  }
}
```

### Signature Verification

Every webhook request includes an HMAC-SHA256 signature in the `X-RoyaltyRadar-Signature` header:

```
X-RoyaltyRadar-Signature: sha256=abc123...
```

**Verification Example (Node.js):**

```javascript
const crypto = require('crypto');

function verifyWebhookSignature(payload, signature, secret) {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(payload, 'utf8')
    .digest('hex');
  
  const received = signature.replace('sha256=', '');
  
  return crypto.timingSafeEqual(
    Buffer.from(expected),
    Buffer.from(received)
  );
}

// In your webhook handler:
app.post('/webhook', (req, res) => {
  const signature = req.headers['x-royaltyradar-signature'];
  const payload = JSON.stringify(req.body);
  
  if (!verifyWebhookSignature(payload, signature, WEBHOOK_SECRET)) {
    return res.status(401).send('Invalid signature');
  }
  
  // Process the webhook...
  res.status(200).send('OK');
});
```

**Verification Example (Python):**

```python
import hmac
import hashlib

def verify_webhook_signature(payload: str, signature: str, secret: str) -> bool:
    expected = hmac.new(
        secret.encode('utf-8'),
        payload.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()
    
    received = signature.replace('sha256=', '')
    
    return hmac.compare_digest(expected, received)
```

### Retry Logic

Failed webhook deliveries are retried with exponential backoff:

| Attempt | Delay (approx)     |
|---------|-------------------|
| 1       | Immediate         |
| 2       | ~2 seconds        |
| 3       | ~4 seconds        |
| 4       | ~8 seconds        |
| 5       | ~16 seconds       |

- Maximum 5 retry attempts
- Maximum delay capped at 5 minutes
- Random jitter added to prevent thundering herd
- Webhooks are auto-disabled after 10 consecutive failures

**HTTP Headers:**

| Header                    | Description                     |
|---------------------------|---------------------------------|
| `X-RoyaltyRadar-Signature`| HMAC-SHA256 signature           |
| `X-RoyaltyRadar-Event`    | Event type                      |
| `X-RoyaltyRadar-Delivery` | Unique delivery ID              |
| `User-Agent`              | `RoyaltyRadar-Webhooks/1.0`     |

---

## SDK Generation

Auto-generate TypeScript and Python SDKs from the OpenAPI specification.

### Prerequisites

Install the OpenAPI Generator CLI:

```bash
npm install -g @openapitools/openapi-generator-cli
```

### Generate SDKs

```bash
# Start the dev server
npm run dev

# In another terminal, generate SDKs
./scripts/generate-sdk.sh all

# Or generate specific SDK
./scripts/generate-sdk.sh typescript
./scripts/generate-sdk.sh python
```

### Using the TypeScript SDK

```typescript
import { Configuration, CatalogApi } from '@royaltyradar/sdk';

const config = new Configuration({
  accessToken: 'rr_your_api_key_here',
});

const catalogApi = new CatalogApi(config);

const { works } = await catalogApi.getCatalog({ type: 'works' });
console.log(works);
```

### Using the Python SDK

```python
import royaltyradar

configuration = royaltyradar.Configuration(
    access_token='rr_your_api_key_here'
)

with royaltyradar.ApiClient(configuration) as api_client:
    catalog_api = royaltyradar.CatalogApi(api_client)
    response = catalog_api.get_catalog(type='works')
    print(response.works)
```

---

## Rate Limiting

API requests are rate-limited to ensure fair usage:

- **100 requests per minute** per API key
- Rate limit headers are included in responses:
  - `X-RateLimit-Limit`: Maximum requests allowed
  - `X-RateLimit-Remaining`: Requests remaining in window
  - `X-RateLimit-Reset`: Unix timestamp when window resets

When rate limited, you'll receive a `429 Too Many Requests` response.

---

## Error Responses

All error responses follow this format:

```json
{
  "error": "Error message",
  "details": { ... }  // Optional validation details
}
```

| Status Code | Description                    |
|-------------|--------------------------------|
| 400         | Bad Request - Invalid input    |
| 401         | Unauthorized - Invalid API key |
| 403         | Forbidden - Insufficient permissions |
| 404         | Not Found                      |
| 429         | Too Many Requests - Rate limited |
| 500         | Internal Server Error          |

---

## Support

For API support, contact: api-support@royaltyradar.com

For webhook delivery issues, check the delivery logs in **Settings > Webhooks**.
