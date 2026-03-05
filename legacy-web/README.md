# RoyaltyRadar MVP

An AI-powered music catalog audit & remediation platform.

## Setup Instructions

> Note: Due to OS Sandbox/EPERM restrictions in the default workspace, the project and dependencies were securely assembled inside the `web/` subdirectory. Docker was also unavailable in the execution environment, so the MVP uses a local SQLite database (`dev.db`) mapped via Prisma instead of the planned Docker-Compose Postgres container. The `schema.prisma` file is 100% compatible with Postgres and you can easily swap the provider to `"postgresql"` if deploying this.

### Running the App
1. Navigate into the web folder:
   ```bash
   cd web
   ```
2. Ensure you have Node + pnpm installed. Install dependencies (already done):
   ```bash
   pnpm install
   ```
3. Run the development server:
   ```bash
   pnpm dev
   ```

### Features Built
1. **User Authentication:** NextAuth + Credentials Provider (register an org + auth via Email/Password).
2. **Dashboard:** Rich UI charting Total Works, Recorded Match Rates, and Estimated Leakage heuristics.
3. **Data Ingest:** Drag & Drop upload zone parsing standard CSV Templates (`Works`, `Recordings`, etc.) with strict Zod validation.
4. **Audit Engine:** `/api/audit/run` endpoints mapping Works, Recordings, and Statement lines to extract findings (Missing ISWC, Split Mismatch, Unmatched Usage).
5. **Resolution Workflow:** findings -> Convert to Tasks tracker table.
6. **Agent Demo:** Connect Portals mock interface, displaying a Before/After Diff, requesting user approval, and applying the DB update with an immutable log Evidence Hash.
7. **Rate Limiting:** Database-backed token tracking limits endpoints to 5–10 requests per user/org per window.

### Built With
- Next.js 15 (App Router)
- React 19
- Tailwind CSS v4
- shadcn/ui components
- Prisma ORM (SQLite / Postgres)
- NextAuth.js (bcrypt)
- Zod & PapaParse
