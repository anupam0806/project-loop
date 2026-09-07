# Project LOOP — Product Requirements Document (PRD)

**Document:** 01 — Product Requirements Document  
**Project:** LOOP — AI Customer Feedback Intelligence Platform  
**Source basis:** Zidio Project LOOP Internship Brief v1.0 and its companion Explainer Guide / Free Resource Guide  
**Status:** Draft for review  
**Purpose:** Authoritative product-level definition for planning and implementation. Technical implementation details must follow the approved stack unless a later, explicitly approved decision changes them.

---

## 1. Product Summary

Project LOOP is a secure, multi-tenant SaaS web application that turns scattered customer feedback into a ranked, evidence-backed understanding of what customers want.

Businesses receive feedback through support tickets, app reviews, surveys, sales notes, social posts, and similar channels. LOOP centralizes that feedback, automatically analyzes it with AI, identifies themes and trends, and presents actionable business intelligence through dashboards, grounded questions, and Voice-of-Customer reports.

### Product statement

> LOOP turns scattered customer feedback into a ranked, evidence-backed list of what to do next.

The implementation must make this statement demonstrably true in the final product.

---

## 2. Problem Statement

Customer feedback is often distributed across many sources and is difficult to review manually at scale. Individual feedback items provide limited value unless they can be organized, classified, grouped, and analyzed.

LOOP addresses this by:

1. Centralizing customer feedback.
2. Automatically classifying feedback.
3. Identifying recurring themes.
4. Detecting emerging trends.
5. Allowing users to ask questions against real stored feedback.
6. Producing evidence-based Voice-of-Customer reports.

---

## 3. Product Goals

### Primary goals

- Provide a working multi-tenant SaaS application.
- Keep each company's data isolated from every other company.
- Implement role-based access control.
- Allow feedback ingestion through the required methods.
- Provide a useful, fast feedback inbox.
- Provide a real analytics dashboard.
- Implement all four required AI capabilities.
- Ensure AI answers are grounded in real project data.
- Provide a deployable, demo-ready application.
- Produce documentation suitable for setup, evaluation, and handover.

### Quality goals

The application should feel like a real product rather than a tutorial/demo clone.

The target quality bar is:

- fast
- responsive
- properly tenant-isolated
- secure
- understandable
- reliable
- polished
- useful
- grounded in real data

The project brief specifically emphasizes speed, tenant isolation, grounded AI, and useful product behavior as characteristics of a top-quality submission.

---

## 4. Users and Roles

LOOP has three roles inside each workspace.

### 4.1 Admin

Permissions:

- Full access to the workspace.
- Manage workspace members.
- Assign/change roles.
- Access the full workspace data and features.

### 4.2 Analyst

Permissions:

- Ingest feedback.
- Manage feedback.
- Use the AI features.
- Access relevant analytics and reports.
- Cannot manage workspace members.

### 4.3 Viewer

Permissions:

- Read-only access.
- View dashboards.
- View reports.
- Cannot modify protected data or manage members.

### Authorization requirement

Permissions must be enforced server-side.

Hiding a UI control is not sufficient.

A forbidden server/API operation must return HTTP 403 rather than silently failing or crashing.

---

## 5. Multi-Tenancy Requirement

A workspace represents one company/tenant.

Multiple workspaces may use the same application and database, but one workspace must never be able to access another workspace's data.

### Non-negotiable rule

Every database operation involving tenant-owned data must be scoped to `workspaceId`.

This includes, at minimum:

- users
- feedback
- themes
- feedback-theme relationships
- embeddings
- reports

Tenant isolation must be tested explicitly, including attempts to access another workspace's records by guessing or modifying an ID.

---

## 6. Core Functional Requirements

### FR-01 — Authentication and Workspaces

The system shall:

- support user sign-up;
- create a workspace during sign-up;
- make the creator an Admin;
- persist authenticated sessions;
- associate users with a workspace;
- scope workspace data correctly.

### FR-02 — Role-Based Access Control

The system shall:

- recognize Admin, Analyst, and Viewer roles;
- enforce role permissions on the server;
- return HTTP 403 for unauthorized operations;
- provide appropriate UI visibility and navigation for each role.

### FR-03 — Feedback Ingestion

The system shall support:

1. Single/manual feedback entry.
2. CSV bulk upload.
3. A simulated channel ingestion mechanism.

Real third-party live integrations are not required.

### FR-04 — Feedback Inbox

The inbox shall provide:

- pagination;
- search;
- filtering;
- feedback details;
- status workflow.

Required status workflow:

`NEW → REVIEWED → ACTIONED`

The inbox must remain responsive and usable with the required seed dataset.

### FR-05 — Analytics Dashboard

The dashboard shall contain:

- stat cards;
- at least three real charts;
- feedback volume over time;
- sentiment breakdown;
- top themes.

Charts must be derived from actual stored project data rather than hard-coded decorative values.

---

## 7. AI Requirements

AI is a core part of the project and carries significant evaluation weight.

### AI-01 — Automatic Classification

When new feedback is added, the system shall send it to Claude for classification.

The classification result shall include, at minimum:

- sentiment;
- sentiment score;
- theme(s);
- feature-area label.

The result must be stored as structured data.

Classification should not be recomputed unnecessarily every time the feedback is viewed.

The implementation should request strict JSON from Claude and validate the response with Zod before saving it.

---

### AI-02 — Theme Clustering and Trends

The system shall:

- group similar feedback into themes;
- assign/name themes;
- show theme-related trends;
- identify growing themes;
- flag spikes relative to the previous period.

The trend calculations must be based on actual stored feedback.

---

### AI-03 — Ask LOOP (Grounded Q&A)

The system shall provide a natural-language question interface.

A user can ask questions about the feedback stored in their workspace.

The AI must not answer from general knowledge alone.

Required flow:

1. Receive the user's question.
2. Convert the question into an embedding/vector.
3. Search the workspace's stored feedback embeddings for relevant records.
4. Retrieve the most relevant real feedback.
5. Provide that evidence to Claude as context.
6. Ask Claude to answer from the supplied evidence.
7. Return an evidence-backed answer.
8. Cite the feedback records used by the answer.

This is the required RAG/grounding behavior.

The implementation must preserve workspace isolation during retrieval.

---

### AI-04 — Voice-of-Customer Report

The system shall generate a shareable Voice-of-Customer report containing:

- top themes;
- sentiment changes;
- real customer quotes;
- recommended actions.

The report must be based on real project data.

Important implementation rule:

1. Calculate factual statistics in application code.
2. Provide those real statistics to Claude.
3. Use Claude to generate the narrative around those facts.
4. Do not allow Claude to invent numerical results.

Reports shall be stored as project records where appropriate.

---

## 8. Data Requirements

The minimum required data model contains:

### Workspace

Represents one company/tenant.

### User

Stores login information and role and links the user to a workspace.

Required roles:

- ADMIN
- ANALYST
- VIEWER

### Feedback

Stores customer feedback including:

- feedback text;
- channel;
- sentiment;
- status;
- workspace relationship;
- classification-related information required by the product.

### Theme

Represents a named topic/cluster.

### FeedbackTheme

Connects feedback items to themes and stores a confidence score.

### Embedding

Stores the vector representation of feedback used for semantic search.

### Report

Stores a generated Voice-of-Customer report for a relevant time period.

The model may contain additional fields where implementation requires them, but required entities must not be removed.

---

## 9. Seed Data Requirements

Seed data is mandatory.

The seed process shall create:

- one demo workspace;
- one demo Admin;
- one demo Analyst;
- one demo Viewer;
- at least 120 realistic feedback items;
- feedback from several channels;
- a set of themes.

The demo dataset must be large enough to make the inbox, analytics, filtering, trends, and AI features meaningful.

---

## 10. Technology Requirements

The project uses the standardized JavaScript/TypeScript track.

### Required baseline stack

| Area | Technology |
|---|---|
| Framework | Next.js 14, App Router |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Database | PostgreSQL |
| PostgreSQL hosting | Neon or Supabase |
| ORM | Prisma |
| Authentication | NextAuth / Auth.js |
| AI | Anthropic Claude API |
| Semantic search | pgvector + embeddings |
| Validation | Zod |
| Charts | Recharts |
| Deployment | Vercel |

The project brief states that the stack is standardized; it is not a free-form technology-selection exercise.

An approved Java Full-Stack alternative exists, but it should only be used when applicable to the internship track and after mentor confirmation.

---

## 11. Architecture Requirements

The application follows a three-layer flow:

### Layer 1 — Browser/UI

The browser displays the React/Next.js interface.

It must not directly connect to:

- PostgreSQL;
- the Anthropic API.

### Layer 2 — Server/API layer

Server-side route handlers/service logic shall:

- authenticate the user;
- determine the user's role;
- enforce authorization;
- validate incoming data;
- determine the user's workspace;
- scope database operations to `workspaceId`;
- call AI services when required;
- return clean validated results.

### Layer 3 — Database + AI services

Prisma shall access PostgreSQL.

Server-side AI logic shall call Claude.

The Anthropic API key must remain server-side.

---

## 12. Security Requirements

The system shall:

- enforce tenant isolation;
- enforce RBAC server-side;
- validate incoming API data using Zod;
- keep API keys and secrets out of browser code;
- never commit secrets to Git;
- use environment variables for credentials;
- return appropriate authorization errors;
- prevent unauthorized cross-workspace access.

Security is a functional requirement, not merely a later polish task.

---

## 13. Performance Requirements

Performance must be considered throughout development.

The application should:

- load the initial interface quickly;
- avoid unnecessarily large client-side bundles;
- avoid unnecessary API requests;
- paginate feedback rather than loading an unbounded dataset;
- perform filtering/search efficiently;
- avoid recomputing AI classification unnecessarily;
- use efficient database queries and appropriate indexes;
- avoid blocking the UI while long AI operations are running;
- provide useful loading, empty, and error states;
- remain responsive on the seeded dataset.

The final experience should not require users to wait tens of seconds for ordinary screens or navigation.

Performance testing must be performed before final submission.

---

## 14. UI/UX Requirements

The application should present a coherent, professional SaaS experience.

Required product areas include:

- authentication;
- workspace/application shell;
- feedback ingestion;
- feedback inbox;
- analytics dashboard;
- AI interaction/Ask LOOP;
- reports;
- role-appropriate navigation.

UI should include appropriate:

- loading states;
- empty states;
- validation messages;
- error states;
- success feedback;
- responsive layouts.

The UI should communicate permissions clearly without relying on UI hiding as the security mechanism.

---

## 15. Scope

### In scope

- Multi-tenant workspaces.
- Admin/Analyst/Viewer roles.
- Authentication.
- Server-enforced RBAC.
- Manual feedback ingestion.
- CSV feedback ingestion.
- Simulated channel ingestion.
- Search/filter/pagination.
- Feedback status workflow.
- Analytics dashboard with at least three real charts.
- All four AI features.
- Seed data.
- Public deployment.
- README/documentation.
- Demo video.

### Explicitly out of scope

Do not spend project time building:

- live Zendesk integration;
- live App Store integration;
- live Twitter/social integrations;
- billing;
- payments;
- subscription tiers;
- native mobile applications;
- real-time collaboration/websockets;
- email/SMS delivery infrastructure.

Real third-party integrations are explicitly excluded; simulated/seeded data should be used instead.

---

## 16. Deployment and Submission Requirements

The final project must include:

- source code repository;
- live Vercel deployment;
- seeded demo data;
- working demo credentials;
- README;
- architecture/setup documentation;
- screenshots;
- 3–5 minute demo video;
- self-feedback video;
- completed submission form.

The README must provide one working demo login for each role:

- Admin
- Analyst
- Viewer

Demo passwords must be throwaway credentials and must not be reused elsewhere.

Submission links must be shareable and accessible to evaluators without an unexpected login prompt.

---

## 17. Development Milestones

### Week 1 — Foundation and Data Layer

Demo:

- sign up;
- log in;
- workspace behavior;
- RBAC;
- basic feedback CRUD;
- live deployment.

### Week 2 — Core Application

Demo:

- CSV bulk import;
- single ingestion;
- filterable/searchable inbox;
- pagination;
- dashboard shell;
- real data visualization.

### Week 3 — AI Integration

Demo:

- automatic classification;
- theme clustering/trends;
- Ask LOOP;
- grounded answers.

### Week 4 — Production Polish

Demo:

- Voice-of-Customer report;
- polished UI states;
- responsive behavior;
- README;
- final demo.

If time becomes constrained, protect the required AI functionality and deployment before optional visual polish.

---

## 18. Acceptance Criteria

The PRD is considered satisfied only when:

1. A user can authenticate.
2. A workspace is created and isolated correctly.
3. Admin, Analyst, and Viewer permissions behave correctly.
4. Unauthorized server operations return 403.
5. Feedback can be added manually.
6. Feedback can be imported through CSV.
7. Simulated channel ingestion works.
8. Feedback can be searched, filtered, paginated, and moved through the required status workflow.
9. The dashboard contains at least three real charts.
10. New feedback can be automatically classified by Claude.
11. Themes and trends are derived from real data.
12. Ask LOOP retrieves real workspace feedback before generating an answer.
13. Ask LOOP cites the evidence used.
14. Voice-of-Customer reports use real calculated statistics.
15. At least 120 realistic seeded feedback records exist.
16. Cross-workspace data access is prevented.
17. Secrets are not exposed in client code or Git.
18. The application is deployed publicly on Vercel.
19. The project is sufficiently fast and responsive for normal usage.
20. Documentation and demo materials are complete.

---

## 19. Open Decisions for Later Project Files

These are intentionally not invented in this PRD and should be resolved in the appropriate technical documents:

- exact PostgreSQL provider: Neon vs Supabase;
- exact embedding-generation model/provider;
- detailed Prisma schema fields and indexes;
- exact API route structure;
- exact authentication configuration;
- exact UI component architecture;
- exact caching strategy;
- exact deployment environment-variable configuration;
- detailed testing strategy;
- detailed MCP/agent tooling strategy.

These decisions must remain consistent with this PRD and the original internship brief.

---

## 20. Source-of-Truth Rule

This PRD defines the product requirements.

Later documents must refine implementation details without silently removing or contradicting required product behavior.

Where a later technical decision conflicts with a mandatory product requirement, the product requirement takes precedence unless the requirement is explicitly revised and approved.

**End of File 01.**
