# Project LOOP — Demonstration & Evaluator Walkthrough Guide

This guide provides a structured **3–5 minute live demonstration script** showcasing the core capabilities of Project LOOP, followed by an evaluator reference and an explicit checklist of manual actions required for external production deployment.

---

## 1. Demo Prerequisites & Demo Accounts

Before starting the demonstration, verify the local application is running:
```bash
npm run build
npm run start
```
Or in development: `npm run dev` (running at `http://localhost:3000`).

### Available Demo Accounts (Workspace: `Project LOOP Demo` / `ws-seed-1`)

| Role | Email | Password | Primary Purpose in Demo |
| :--- | :--- | :--- | :--- |
| **ADMIN** | `admin@example.com` | `password123` | Demonstrates full workspace governance, CSV import, status management, report generation |
| **ANALYST** | `analyst@example.com` | `password123` | Demonstrates feedback investigation, Ask LOOP query, report generation, RBAC restrictions |
| **VIEWER** | `viewer@example.com` | `password123` | Demonstrates read-only guardrails: disabled report generation, unmodifiable status badges |

---

## 2. 3–5 Minute Live Demonstration Script

### Minute 1: Authentication & Executive Dashboard
1. **Sign In**:
   - Navigate to `http://localhost:3000/login`.
   - Enter `admin@example.com` and `password123`. Click **Sign in**.
   - Note the seamless redirection to `/dashboard` and the persistent header displaying workspace name and the `ADMIN` role badge.
2. **Dashboard Review (3-Chart Compliance)**:
   - Point out the 4 KPI cards: **Total Feedback** (850+ records ingested), **Positive Sentiment %**, **Negative Sentiment %**, and **Actionable Count**.
   - **Chart 1 (Feedback Volume Timeline)**: Point out the native SVG area chart rendering 30-day feedback volume trends.
   - **Chart 2 (Sentiment Distribution)**: Point out the SVG donut chart featuring accessible non-color markers `[+]` Positive, `[-]` Negative, `[○]` Neutral, `[~]` Mixed.
   - **Chart 3 (Top Themes Distribution)**: Point out the horizontal bar chart showing top recurring customer feedback topics (Usability, Performance, Integrations, Bugs).
   - Point out the recent feedback feed at the bottom of the dashboard.

### Minute 2: Feedback Inbox, Filtering & AI Detail
3. **Feedback Inbox (`/feedback`)**:
   - Navigate to **Feedback** in the sidebar (or press `/` for quick search).
   - Enter a search query, e.g. `support` or `latency`. Notice real-time debounced filtering.
   - Filter by Sentiment (e.g. `NEGATIVE`) and Status (`NEW`).
4. **Feedback Detail & Permitted Mutation**:
   - Click on any feedback row to navigate to `/feedback/[id]`.
   - Highlight the **Customer Submission** card and metadata row (Channel, Timestamp, Status).
   - Point out the **AI Analysis & Classification** card displaying extracted sentiment, category, and assigned themes.
   - Demonstrate permitted mutation: as an ADMIN, select the **Status** dropdown and change it from `NEW` to `REVIEWED`.
   - Click **Back to Feedback Inbox**.

### Minute 3: Themes Taxonomy & Grounded Ask LOOP
5. **Themes Taxonomy (`/themes`)**:
   - Click **Themes** in the sidebar.
   - Point out the 8 core operational themes (Usability, Performance, Integrations, Billing, Feature Request, Bug, Customer Support, Security) with live tagged record counts.
6. **Ask LOOP Grounded Q&A (`/ask`)**:
   - Click **Ask LOOP** in the sidebar.
   - Explain: *"Ask LOOP does not guess or hallucinate. It executes pgvector cosine similarity search over customer feedback embeddings to synthesize grounded answers."*
   - Enter a question or click a suggested prompt:
     `"What are the most common usability issues reported by customers?"`
   - Click **Ask**. Notice the brief *"Reading feedback..."* loading state.
   - Inspect the **Answer** card and the **Sources** citations. Each citation displays the exact quoted snippet and a direct permalink to inspect the underlying feedback item.

### Minute 4: Voice of Customer Reports & Workspace Settings
7. **VoC Executive Reports (`/reports`)**:
   - Click **Reports** in the sidebar.
   - Open the seeded report: *"Voice of Customer Executive Report - Q3 2026"*.
   - Point out the dual-block architecture:
     - **Block 1: Factual Statistics**: Computed directly from database records (Total Volume, Positive Signal %, Channel Breakdown, Top Themes).
     - **Block 2: Executive Narrative**: AI-generated executive summary, theme observations, sentiment trends, and actionable recommendations.
8. **Workspace Settings (`/settings`)**:
   - Click **Settings** in the sidebar.
   - View the **Workspace Profile** and the **Team Members** management roster.
   - Show that as an ADMIN, the **Add User** button and role management controls are active.

### Minute 5: Role-Based Access Control (RBAC) & Tenant Isolation
9. **Demonstrate Role Differences (ANALYST & VIEWER)**:
   - Click **Sign out** in the top header.
   - Sign in as `viewer@example.com` (`password123`).
   - Navigate to `/reports`: Note that the **Generate Report** button is **disabled** with a tooltip *"Viewer role cannot generate reports"*.
   - Open any feedback item: Note that the status is displayed as a **read-only badge** with no editable dropdown.
   - Navigate to `/settings`: Note that team member management is replaced by *"Team member administration is restricted to workspace Administrators."*
10. **Tenant Isolation Verification**:
    - Explain: *"Every database query is strictly filtered by workspaceId derived from the cryptographically signed session JWT."*
    - Manually navigate to `/feedback/00000000-0000-0000-0000-000000000000`.
    - Observe the safe `404 Not Found` message (*"Feedback record not found in this workspace."*) without crashing or leaking cross-tenant data.

---

## 3. High-Level Architecture Summary for Evaluators

1. **Frontend**: Next.js 14 App Router, Calm UI token design system, responsive layout, native React SVG data charts without third-party chart dependencies.
2. **Backend Services**: NextAuth.js JWT authentication, route try/catch safety wrappers with structured JSON error envelopes (`{ success: false, error: { message, code } }`).
3. **Database Layer**: Neon Serverless PostgreSQL with `pgvector` extension. Multi-tenant composite indexes on `(workspaceId, createdAt)` and `(workspaceId, status, createdAt)`.
4. **Vector Retrieval (RAG)**: Local dense embeddings generated via `@xenova/transformers` (`all-MiniLM-L6-v2`, 384 dimensions) matched via PostgreSQL `<=>` cosine distance operator.
5. **AI Safety Layer**: Customer feedback text is enclosed in `<customer_feedback>` XML delimiters to prevent prompt injection; CSV imports enforce a 1,000-row limit and strip spreadsheet formulas (`=`, `+`, `-`, `@`); API errors redact sensitive API keys.

---

## 4. Production Deployment & AI Strategy

### AI Provider Configuration
- **Development**: Groq (`openai/gpt-oss-20b`) for rapid classification + Google Gemini (`gemini-2.5-flash`) for Ask LOOP and VoC synthesis.
- **Production**: Anthropic Claude Haiku (`claude-haiku-4-5-20251001`) for structured classification + Anthropic Claude Sonnet (`claude-sonnet-5`) for high-order narrative synthesis.
- **Automated Tests**: Deterministic `MockAIProvider` with zero external calls.

---

## 5. Manual Actions Required by the Evaluator / User

The following tasks cannot be automated by an AI agent and require your manual action:

1. **Vercel Account Deployment (Optional)**:
   - If deploying to your personal Vercel account, log in to [vercel.com](https://vercel.com), click **Import Project**, and link your GitHub repository.
   - Add your production environment variables in the Vercel Dashboard:
     - `DATABASE_URL`
     - `NEXTAUTH_URL` (your production URL)
     - `NEXTAUTH_SECRET`
     - `AI_PROVIDER` (`claude` or `free`)
     - `ANTHROPIC_API_KEY` (if using Claude) or `GEMINI_API_KEY` / `GROQ_API_KEY`
2. **Video Demonstration Recording (Optional)**:
   - If submitting a video walkthrough for project delivery, record the 3–5 minute sequence outlined in Section 2 using OBS, Loom, or Windows Game Bar (`Win + Alt + R`).
