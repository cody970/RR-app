# RoyaltyRadar — Gemini Design Context

> Copy and paste the entire contents of this file into Gemini to give it the full context needed to help design or extend RoyaltyRadar.

---

## 1. What the App Does (README Summary)

**RoyaltyRadar** is an AI-powered music catalog audit and revenue recovery platform.  
It helps rights holders — publishers, songwriters, and labels — to:

- Identify metadata gaps (missing ISWCs, ISRCs, split information)
- Detect missing or underpaid royalties across PROs and DSPs
- Automate the registration and recovery process
- Manage licensing opportunities and sync placements
- Track revenue, generate statements, and pay out writers

The platform is a multi-tenant SaaS product. Each customer belongs to an **Organisation** and has role-based access (`OWNER → ADMIN → EDITOR → VIEWER`). A separate lightweight **Creator Portal** gives external stakeholders (writers, co-publishers) read-only visibility into their earnings and splits without a full dashboard login.

---

## 2. Main Features & Screens

### Authentication
| Screen | Path | Description |
|---|---|---|
| Login | `/login` | Email/password + Google/GitHub OAuth |
| Register | `/register` | Create account + new organisation |
| Accept Invitation | `/invitations/accept` | Join an existing org via invite token |

---

### Dashboard — Core
| Screen | Path | Description |
|---|---|---|
| Home / KPIs | `/dashboard` | Overview: catalog size, metadata health score, anomaly count, estimated revenue leakage, recent findings feed, activity log |
| Queue Monitor | `/queues` | BullMQ job queue status (audit, scan, content-id, fetch workers) |

---

### Catalog Management
| Screen | Path | Description |
|---|---|---|
| Catalog | `/dashboard/catalog` | Browse Works and Recordings; ISWC / ISRC metadata; filter, search, paginate |
| Import | `/dashboard/import` | Bulk CSV / Excel import with header-mapping wizard; supports Works, Recordings, and Statements |
| Registrations | `/dashboard/registrations` | Track CWR registration status with ASCAP, BMI, SESAC, PRS, SOCAN, etc. |
| Catalog Scan | `/dashboard/catalog-scan` | Run distribution scans to detect gaps and unregistered works; per-scan detail at `/dashboard/catalog-scan/[id]` |

---

### Audit & Conflict Detection
| Screen | Path | Description |
|---|---|---|
| Audit Engine | `/dashboard/audit` | Finds conflicts: missing identifiers, split sum ≠ 100%, unregistered works, rate anomalies. Shows findings by type, severity (HIGH / MEDIUM / LOW) and status. Bulk actions: mark resolved, export CSV/PDF, generate dispute letters |
| Tasks | `/dashboard/tasks` | Kanban / list view of recovery tasks generated from findings |

---

### Revenue & Financial Management
| Screen | Path | Description |
|---|---|---|
| Revenue | `/dashboard/revenue` | Revenue by society, top works, territory breakdown, statement upload & matching |
| Review Matches | `/dashboard/revenue/review-matches` | Human-in-the-loop review of auto-matched statement lines |
| Analytics | `/dashboard/analytics` | Time-series trends, regression forecasting, territory analysis, cumulative recovery charts (Recharts) |
| Accounting | `/dashboard/accounting` | Writer / publisher balances, split engine, payout generation, PDF statements, ledger history |

---

### Licensing & Opportunities
| Screen | Path | Description |
|---|---|---|
| Licensing | `/dashboard/licensing` | Browse and manage licensing opportunities; issue licenses; handle inbound requests |
| Public License Request | `/public/license/request` | Unauthenticated form for external parties to request a sync/print license |
| MLC Matching | `/dashboard/mlc-matching` | Automated mechanical licensing matching against the MLC unmatched-works database |
| Sync Licensing | `/dashboard/sync` | Sync placement pipeline: inbound leads → quote → license |

---

### Content ID
| Screen | Path | Description |
|---|---|---|
| Content ID Monitor | `/dashboard/content-id` | Detect YouTube/streaming Content ID matches; manage claims; track monetisation |

---

### Reports & Settings
| Screen | Path | Description |
|---|---|---|
| Reports | `/dashboard/reports` | Generate audit summaries, gap reports, conflict reports (CSV/PDF) |
| Scheduled Reports | `/dashboard/reports/scheduled` | Configure automated recurring report delivery |
| Settings — General | `/dashboard/settings` | Org profile, preferences |
| API Keys | `/dashboard/settings/keys` | Manage API keys for the public `/api/v1/` REST API |
| Team | `/dashboard/settings/team` | Invite members, set roles, revoke access |
| Billing | `/dashboard/settings/billing` | Stripe-powered subscription management |
| Webhooks | `/dashboard/settings/webhooks` | Register outbound webhook URLs (HMAC-SHA256 signed) |
| Connections | `/dashboard/settings/connections` | OAuth connections to Spotify, MusicBrainz, Muso.ai, etc. |
| API Docs | `/dashboard/settings/api-docs` | Swagger UI for the public REST API |
| Audit Logs | `/dashboard/settings/audit-logs` | Immutable audit trail of all state changes |

---

### Creator Portal (External Stakeholder View)
| Screen | Path | Description |
|---|---|---|
| Portal Home | `/portal` | Writer earnings summary, top works, recent payouts |
| Earnings | `/portal/earnings` | Detailed earnings breakdown by period / territory |
| Profile | `/portal/profile` | Writer profile and payment details |
| Split Sharing | `/portal/splits/[token]` | Shared split-negotiation view; accept / counter proposed splits |

---

### Public & Misc
| Screen | Path | Description |
|---|---|---|
| Blog | `/blog` + `/blog/[slug]` | Marketing / knowledge-base articles |
| Star Button Demo | `/star-button-demo` | Internal UI component demo |

---

### REST API (key endpoints under `/api/`)
- `/api/v1/catalog` — Public catalog endpoint (API-key auth)
- `/api/v1/statements` — Public statements endpoint
- `/api/v1/registrations` — Public registrations endpoint
- `/api/v1/findings` — Public findings endpoint
- `/api/v1/analytics` — Public analytics endpoint
- `/api/v1/webhooks` — Webhook registration (public API)
- `/api/auth/[...nextauth]` — NextAuth handlers
- `/api/audit` — Internal audit operations
- `/api/catalog` — Internal catalog CRUD
- `/api/content-id` — Content ID scan operations
- `/api/enrich` — Metadata enrichment (Spotify, MusicBrainz)
- `/api/ingest` — Statement ingestion (Email, SFTP, API sources)
- `/api/licensing` — License CRUD
- `/api/registrations` — Registration CRUD
- `/api/revenue` — Revenue analytics
- `/api/splits` + `/api/splits/negotiate` — Split calculations and negotiation flow
- `/api/statements` — Statement upload & matching
- `/api/stripe` — Stripe billing & webhook handler
- `/api/settings/*` — Keys, team, webhooks, connections, billing portal
- `/api/events/stream` — Server-Sent Events (real-time notifications via Redis Pub/Sub)

---

## 3. Frameworks & Technologies

### Core Framework
| Technology | Version | Purpose |
|---|---|---|
| **Next.js** | 16.1.6 | Full-stack React framework (App Router) |
| **React** | 19.2.3 | UI rendering |
| **TypeScript** | 5.x | Static typing throughout |

### Styling & UI
| Technology | Version | Purpose |
|---|---|---|
| **Tailwind CSS** | 4.x | Utility-first styling |
| **shadcn/ui** | latest | Accessible component primitives (built on Radix UI) |
| **Radix UI** | 1.4.3 | Headless UI primitives |
| **Framer Motion** | 12.35 | Animations and transitions |
| **Lucide React** | 0.576 | Icon set |
| **Recharts** | 3.7.0 | Charting (line, bar, area, pie) |
| **cmdk** | 1.1.1 | Command-palette search |
| **vaul** | 1.1.2 | Drawer / bottom-sheet |
| **react-day-picker** | 9.14.0 | Date picker |
| **next-themes** | 0.4.6 | Dark / light mode |
| **clsx** + **tailwind-merge** | — | Class name utilities |
| **class-variance-authority** | 0.7.1 | Component variant builder |

### Forms & Validation
| Technology | Version | Purpose |
|---|---|---|
| **React Hook Form** | 7.71.2 | Form state and submission |
| **Zod** | 4.3.6 | Schema validation (all external input) |
| **@hookform/resolvers** | 5.2.2 | Zod ↔ React Hook Form integration |

### Data & Tables
| Technology | Version | Purpose |
|---|---|---|
| **@tanstack/react-table** | 8.21.3 | Headless data table (sort, filter, paginate) |
| **date-fns** | 4.1.0 | Date formatting and arithmetic |

### Backend & Database
| Technology | Version | Purpose |
|---|---|---|
| **Prisma** | 5.22.0 | ORM (PostgreSQL) |
| **PostgreSQL** | — | Primary relational database |
| **NextAuth.js** | 4.24.13 | Authentication (OAuth + credentials) |
| **bcrypt** | 6.0.0 | Password hashing |

### Background Jobs
| Technology | Version | Purpose |
|---|---|---|
| **BullMQ** | 5.70.1 | Job queues (audit, scan, content-id, fetch) |
| **ioredis** | 5.10.0 | Redis client for queues and pub/sub |
| **@bull-board** | 6.20.3 | Queue monitoring UI |

### Payments & External Services
| Technology | Version | Purpose |
|---|---|---|
| **Stripe** | 20.4.0 | Subscription billing and payouts |
| **Sentry** | 10.42.0 | Error monitoring |

### File Processing & Documents
| Technology | Version | Purpose |
|---|---|---|
| **PapaParse** | 5.5.3 | CSV parsing for bulk import |
| **jsPDF** + **jspdf-autotable** | 4.2.0 / 5.0.7 | PDF report and statement generation |

### API Documentation
| Technology | Version | Purpose |
|---|---|---|
| **next-swagger-doc** | 0.4.1 | OpenAPI spec generation |
| **swagger-ui-react** | 5.32.0 | Interactive API docs |

### 3D / Special Effects
| Technology | Version | Purpose |
|---|---|---|
| **Three.js** | 0.183.2 | 3D scenes |
| **@react-three/fiber** | 9.5.0 | React renderer for Three.js |
| **@react-three/drei** | 10.7.7 | Three.js helpers |

### Testing
| Technology | Version | Purpose |
|---|---|---|
| **Vitest** | 4.0.18 | Unit tests (`npm test`) |
| **@playwright/test** | 1.58.2 | E2E tests (`npm run test:e2e`) |
| **@testing-library/react** | 16.3.2 | Component testing utilities |

---

## 4. Key Architectural Conventions

- **Multi-tenancy**: Every DB query is scoped by `orgId` from the session — never from the request body.
- **Authentication**: `requireAuth()` (from `src/lib/auth/get-session.ts`) must be called at the top of every protected route handler.
- **RBAC**: `validatePermission(role, "PERMISSION_NAME")` (from `src/lib/auth/rbac.ts`) guards all mutations.
- **Error responses**: Standardised via `ApiErrors.*()` from `src/lib/api/error-response.ts` (`Unauthorized 401`, `Forbidden 403`, `BadRequest 400`, `NotFound 404`, `Internal 500`).
- **Monetary values**: Always `Decimal` with `@db.Decimal(18, 4)` — never `Float`.
- **Logging**: Structured logger (`src/lib/infra/logger.ts`) — JSON in production, human-readable in development.
- **Audit trail**: Every state-changing operation must be logged to both the `auditLog` and `activity` tables.
- **API keys**: Stored as SHA-256 hashes; raw keys are never persisted.
- **Webhooks**: Outbound HMAC-SHA256 signed (`X-RoyaltyRadar-Signature` header), with exponential back-off retry and auto-disable after 10 failures.
- **Real-time**: Server-Sent Events at `/api/events/stream` backed by Redis Pub/Sub (`src/lib/infra/event-bus.ts`).
