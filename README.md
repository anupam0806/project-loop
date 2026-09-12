# Project LOOP — AI-Powered Voice of Customer Intelligence Platform

Project LOOP is a modern, enterprise-ready Voice of Customer (VoC) analytics platform designed for product teams, engineering leaders, and customer support organizations. It continuously aggregates unstructured customer feedback across multiple intake channels, applies automated AI classification, builds high-dimensional semantic embeddings in PostgreSQL (`pgvector`), provides grounded conversational Q&A via Retrieval-Augmented Generation (RAG), and synthesizes executive VoC trend reports.

---

## 1. Key Features

- **Multi-Channel Feedback Ingestion**: Ingest customer submissions across `SUPPORT`, `APP_REVIEW`, `SURVEY`, `SALES`, `SOCIAL`, and `SIMULATED` streams.
- **Enterprise Multi-Tenancy & Tenant Isolation**: Strict database-level workspace isolation ensuring zero cross-tenant data leakage.
- **Granular Role-Based Access Control (RBAC)**:
  - **ADMIN**: Full workspace governance, user creation, role editing, feedback management, and report generation.
  - **ANALYST**: Read access to analytics, search, feedback management, report generation, and Ask LOOP.
  - **VIEWER**: Read-only access to dashboard, feedback items, and stored VoC reports. Mutation and report generation actions are disabled.
- **Calm UI / UX Design System**: High-clarity interface with responsive SVG visual charts, keyboard shortcuts (`/` search, `c` create, `?` shortcuts dialog), accessible non-color sentiment markers (`[+]`, `[-]`, `[○]`, `[~]`), and zero external chart library bloat.
- **Native SVG Dashboard (3-Chart Compliance)**:
  - Chart 1: 30-Day Feedback Volume Timeline (SVG Area/Line chart).
  - Chart 2: Sentiment Distribution Breakdown (SVG Donut chart with accessible labels).
  - Chart 3: Top Recurring Feedback Themes (SVG Horizontal Bar distribution).
- **Grounded AI Q&A (Ask LOOP)**: Interactive conversational intelligence querying customer submissions using pgvector cosine similarity search (`<=>`), enforcing strict evidence bounds and transparent citation sources with feedback permalinks.
- **Automated VoC Executive Reports**: Statistical metric computation combined with structured AI executive narratives (Summary Overview, Key Theme Observations, Sentiment Trends, and Operational Recommendations).
- **Hardened Security & API Safety**: Formula injection protection on CSV imports (1,000-row limit), XML boundary encapsulation (`<customer_feedback>` delimiters) against prompt injection, API error redaction, and strict input validation.

---

## 2. Architecture & Technology Stack

```
                                  +-------------------------------------------------+
                                  |            Next.js 14 (App Router)              |
                                  |   React 18 Server & Client Components / Calm UI  |
                                  +-----------------------+-------------------------+
                                                          |
                                  +-----------------------v-------------------------+
                                  |        NextAuth.js Session & RBAC Guard         |
                                  |       Tenant-Scoped Prisma Service Layer        |
                                  +-----------------------+-------------------------+
                                                          |
                       +----------------------------------+---------------------------------+
                       |                                                                    |
+----------------------v----------------------+                    +------------------------v----------------------+
|            Neon PostgreSQL                  |                    |                  AI Providers                 |
|  - Relational Models (User, Feedback, etc.) |                    |  - Factory: Resolves Free / Claude / Mock    |
|  - pgvector Extension (Embedding Vector 384)|                    |  - Local Transformers: all-MiniLM-L6-v2      |
|  - Composite Indices on (workspaceId, ...)  |                    |  - Prompt Boundaries & Secret Sanitization   |
+---------------------------------------------+                    +-----------------------------------------------+
```

### Technology Stack
- **Framework**: [Next.js 14](https://nextjs.org/) (App Router, Server Components & Route Handlers)
- **Frontend UI**: React 18, TailwindCSS, Calm UI Design System, Native SVG Data Visualizations
- **ORM & Database**: [Prisma ORM 5](https://www.prisma.io/) with [Neon Serverless PostgreSQL](https://neon.tech/) & `pgvector`
- **Authentication**: NextAuth.js v4 (JWT session strategy, bcryptjs password hashing)
- **Embeddings**: `@xenova/transformers` (`Xenova/all-MiniLM-L6-v2` 384-dimensional dense vectors)
- **AI Synthesis**: Multi-provider architecture supporting Anthropic Claude, Google Gemini, Groq, and Mock AI
- **Testing**: Vitest (Unit, Services & Integration) and Playwright (Browser End-to-End & Performance)

---

## 3. Prerequisites

- **Node.js**: `v20.x` or `v24.x` (LTS recommended)
- **Package Manager**: `npm` (v10+)
- **Database**: PostgreSQL 15+ with `pgvector` extension (Neon recommended)
- **Browser**: Google Chrome or Microsoft Edge (for local Playwright E2E testing)

---

## 4. Installation & Local Setup

### Step 1: Clone Repository
```bash
git clone https://github.com/anupam0806/project-loop.git
cd project-loop
```

### Step 2: Install Dependencies
```bash
npm install
```
*Note: `postinstall` automatically triggers `prisma generate` to compile the Prisma Client.*

### Step 3: Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Configure your environment values (see [Environment Variables](#5-environment-variables)).

### Step 4: Database Setup & Prisma Migrations
Run Prisma migrations to create all tables, composite indexes, and pgvector types:
```bash
npx prisma migrate deploy
```

### Step 5: Seed Demo Dataset
Execute the realistic seed generator to populate workspaces, users, themes, feedback records, and embeddings:
```bash
npx prisma db seed
```

### Step 6: Start Local Development Server
```bash
npm run dev
```
Navigate to `http://localhost:3000` in your browser.

---

## 5. Environment Variables

The application relies on the following environment variable keys (refer to `.env.example` for templates; **never commit real credentials**):

| Variable | Description | Example / Allowed Values |
| :--- | :--- | :--- |
| `DATABASE_URL` | Pooled PostgreSQL connection string with SSL | `postgresql://USER:PASSWORD@HOST/DB?sslmode=require` |
| `NEXTAUTH_URL` | Base URL of application for session redirection | `http://localhost:3000` (or production domain) |
| `NEXTAUTH_SECRET` | 32+ character random secret for JWT encryption | `openssl rand -base64 32` |
| `AI_PROVIDER` | Active AI provider configuration | `free`, `claude`, `gemini`, `groq`, `mock` |
| `ANTHROPIC_API_KEY` | API key for Anthropic Claude (Production tier) | `sk-ant-...` |
| `GEMINI_API_KEY` | API key for Google Gemini (Free tier Ask/VoC) | `AIzaSy...` |
| `GROQ_API_KEY` | API key for Groq (Free tier classification) | `gsk_...` |

---

## 6. Authentication & Roles (RBAC)

Project LOOP features 3 seeded user accounts for testing and verification in workspace `Project LOOP Demo` (`ws-seed-1`):

| Role | Email | Password | Permissions Summary |
| :--- | :--- | :--- | :--- |
| **ADMIN** | `admin@example.com` | `password123` | Full access: user management, CSV import, status mutation, report generation |
| **ANALYST** | `analyst@example.com` | `password123` | Analytics, feedback search/filter, status update, report generation |
| **VIEWER** | `viewer@example.com` | `password123` | Read-only access: view dashboard, feedback list/detail, and reports |

---

## 7. AI Provider Architecture & Strategy

Project LOOP implements an AI Provider abstraction (`services/ai/aiProvider.ts` and `providerFactory.ts`) ensuring zero hard-coded vendor lock-in.

### Development Mode (`AI_PROVIDER="free"`)
- **Feedback Classification**: Handled by **Groq** (`openai/gpt-oss-20b`), optimized for high-throughput sentiment & urgency scoring.
- **Ask LOOP & VoC Synthesis**: Handled by **Google Gemini** (`gemini-2.5-flash`), providing fast semantic synthesis.

### Production Mode (`AI_PROVIDER="claude"`)
- **Feedback Classification**: Handled by **Anthropic Claude Haiku** (`claude-haiku-4-5-20251001`), for precise structured classification.
- **Ask LOOP & VoC Synthesis**: Handled by **Anthropic Claude Sonnet** (`claude-sonnet-5`), for deep, nuanced executive narrative synthesis.

### Automated Testing (`AI_PROVIDER="mock"`)
- Uses `MockAIProvider` with deterministic responses, zero network latency, and zero API token costs. Automatically engaged during Vitest and Playwright test suites.

---

## 8. Testing Suite

The repository features comprehensive dual-engine automated testing:

### A. Vitest (Unit & Integration Tests)
Runs 19 suites covering RBAC, tenant isolation, API safety limits, AI providers, security boundaries, CSV sanitization, and end-to-end integration journeys:
```bash
npm test
```

### B. Playwright (Browser End-to-End Tests)
Executes 14 browser tests in headless Chromium against the production build, validating authentication, protected pages, role restrictions, dashboard charts, feedback detail, and Ask LOOP:
```bash
npm run test:e2e
```

### C. Performance Benchmark Suite
Empirically benchmarks database roundtrips, pgvector cosine search, and aggregations against the live database:
```bash
npx tsx scripts/run-performance-suite.ts
```

### D. TypeScript & ESLint Verification
```bash
npm run typecheck
npm run lint
```

---

## 9. Production Deployment Guide (Vercel)

### Deploying via Vercel Dashboard
1. Push your repository to GitHub.
2. In Vercel, click **Add New Project** and import the `project-loop` repository.
3. Configure the **Environment Variables** in the Vercel project settings:
   - `DATABASE_URL`: Your production Neon PostgreSQL connection string.
   - `NEXTAUTH_URL`: Your production Vercel URL (e.g. `https://your-project.vercel.app`).
   - `NEXTAUTH_SECRET`: A generated 32-character random string.
   - `AI_PROVIDER`: Set to `claude` (or `free`).
   - `ANTHROPIC_API_KEY`: Your production Anthropic API key.
4. Click **Deploy**. Vercel will execute `prisma generate && next build` via `vercel.json`.
5. Run migrations against your production database:
   ```bash
   npx prisma migrate deploy
   ```

---

## 10. Security & Threat Mitigation

- **Tenant Isolation**: Every database query scopes strictly by `workspaceId` extracted from the server-validated JWT session. Cross-workspace access attempts return a safe `404 Not Found` without information leakage.
- **Prompt Injection Defense**: Untrusted customer submissions are encapsulated in `<customer_feedback>` XML delimiters before passing to AI models. Delimiters inside customer feedback are sanitized.
- **Formula Injection Defense**: CSV imports sanitize spreadsheet command prefixes (`=`, `+`, `-`, `@`, tab, carriage return).
- **API Rate Limiting & Input Clamping**: CSV files are limited to 1,000 rows. API pagination clamps `pageSize` between 1 and 50.
- **Credential Protection**: System error handlers redact Claude/Gemini API keys and database connection strings from user-facing error envelopes.

---

## 11. Known Limitations

- **Vector Search Indexing**: Uses pgvector exact cosine search (`<=>`). For datasets exceeding 50,000 vectors, creating an HNSW or IVFFlat index (`CREATE INDEX ON "Embedding" USING hnsw (vector vector_cosine_ops)`) is recommended.
- **Real-Time Webhooks**: Inbound integrations (e.g. Zendesk, GitHub Webhooks) currently ingest via the `/api/feedback` REST API. Real-time WebSocket subscriptions are deferred to future roadmap phases.
