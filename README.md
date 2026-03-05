# 🎵 RoyaltyRadar

**RoyaltyRadar** is an AI-powered music catalog audit and revenue recovery platform. It helps rights holders (publishers, writers, labels) identify metadata gaps, detect missing royalties, and automate the recovery process across PROs and DSPs.

## 🚀 Key Features

- **Automated Ingestion**: Support for CWR, CSV, and Excel metadata imports with robust security and validation.
- **Audit Engine**: Background workers process catalogs to find discrepancies in ISWCs, ISRCs, and royalty distributions.
- **Enrichment**: Integrated with Spotify, MusicBrainz, and Muso.ai to normalize and enhance catalog metadata.
- **Registration Automation**: Automates matching and registration gaps for MLC, ASCAP, BMI, and SoundExchange.
- **Financial Dashboard**: Comprehensive revenue analytics, multi-currency support, and Stripe-integrated billing.
- **Workspace Portals**: Dedicated portals for external stakeholders (writers/publishers) to monitor their catalogs.

## 🛠 Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router, React 19)
- **Database**: [Prisma](https://www.prisma.io/) + PostgreSQL
- **Background Jobs**: [BullMQ](https://docs.bullmq.io/) + Redis
- **Authentication**: [NextAuth.js](https://next-auth.js.org/)
- **Payments**: [Stripe](https://stripe.com/)
- **UI/UX**: Tailwind CSS v4, shadcn/ui, Framer Motion, Recharts
- **Testing**: Vitest

## 📦 Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL
- Redis

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-org/royalty-radar.git
   cd royalty-radar
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up Environment Variables**:
   Copy `.env.example` to `.env` and fill in your credentials for Stripe, Google/Github OAuth, and external music APIs.

4. **Initialize Database**:
   ```bash
   npx prisma migrate dev
   ```

5. **Start Development Server**:
   ```bash
   npm run dev
   ```

6. **Start Background Worker**:
   ```bash
   npm run worker
   ```

## 🔐 Security & Scalability

- **CSP Hardening**: Strict Content Security Policy implemented in `next.config.ts`.
- **RBAC**: granular Role-Based Access Control for Organizations and Portals.
- **API Pagination**: Standardized `limit`/`offset` pagination across core data endpoints.
- **NextAuth Type Extension**: Full type safety for custom session and JWT fields.

## 🧪 Testing

Run the test suite using Vitest:
```bash
npm test
```

## 📄 License

Proprietary. All rights reserved.
