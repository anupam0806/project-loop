# Project LOOP --- Technical Architecture & Implementation Specification

**Document:** 02 --- Technical Architecture & Implementation
Specification\
**Project:** LOOP --- AI Customer Feedback Intelligence Platform\
**Depends on:** 01 --- Product Requirements Document (PRD)\
**Status:** Draft for implementation

## 1. Purpose and Authority

File 01 defines **what LOOP must do**. This file defines **how LOOP
should be implemented**.

The coding agent must preserve every mandatory requirement from File 01,
especially tenant isolation, server-side RBAC, grounded AI, performance,
security, and deployment.

## 2. Approved Technology Stack

  Area                 Technology
  -------------------- ------------------------
  Framework            Next.js 14, App Router
  Language             TypeScript
  Styling              Tailwind CSS
  Database             PostgreSQL
  PostgreSQL hosting   Neon
  ORM                  Prisma
  Authentication       Auth.js / NextAuth
  AI                   Anthropic Claude API
  Semantic search      pgvector + embeddings
  Validation           Zod
  Charts               Recharts
  Deployment           Vercel

**Architecture decision:** Neon is selected as the PostgreSQL provider
for this implementation.

A separate Express backend is not required. The backend uses Next.js
server-side route handlers and service logic.

## 3. High-Level Architecture

``` text
Browser / Next.js UI
        |
        v
Next.js Server / Route Handlers
  Authentication
  Authorization
  Validation
  Tenant Scope
  Business Logic
        |
        +-------------------+
        |                   |
        v                   v
Neon PostgreSQL        Anthropic Claude
   + Prisma
   + pgvector
```

The browser must never directly connect to PostgreSQL or Anthropic.

The server must authenticate the user, resolve the workspace, enforce
the role, validate input, perform workspace-scoped database operations,
call AI services when required, and return safe results.

## 4. Recommended Project Structure

``` text
project-loop/
├── app/
│   ├── (auth)/login/
│   ├── (auth)/signup/
│   ├── dashboard/
│   ├── feedback/
│   ├── reports/
│   ├── ask/
│   ├── settings/
│   └── api/
├── components/
│   ├── ui/
│   ├── layout/
│   ├── feedback/
│   ├── dashboard/
│   ├── ask/
│   └── reports/
├── lib/
│   ├── auth/
│   ├── db/
│   ├── ai/
│   ├── embeddings/
│   ├── validation/
│   ├── permissions/
│   ├── tenant/
│   └── utils/
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
├── tests/
│   ├── unit/
│   ├── integration/
│   └── security/
├── public/
├── .env.local
├── .env.example
├── .gitignore
├── package.json
├── tsconfig.json
└── README.md
```

The agent may adjust organization when required by the actual framework,
but must keep UI, server logic, database access, authentication,
authorization, AI, validation, and tests clearly separated.

## 5. Dependency Installation

The user does not need to download Prisma, PostgreSQL, or Neon software.

The coding agent should install the required npm dependencies inside the
project, including the approved stack's packages.

The agent must inspect the existing project and package manager first,
avoid duplicate dependencies, update the lockfile, and verify that the
application builds.

Only dependencies that are actually required should be installed.

## 6. Environment Configuration

Required baseline variables:

``` text
DATABASE_URL=
NEXTAUTH_SECRET=
ANTHROPIC_API_KEY=
```

Rules:

-   Real secrets belong in `.env.local` locally and the deployment
    environment in Vercel.
-   `.env.local` must not be committed.
-   `.env.example` may contain variable names only.
-   API keys and database credentials must remain server-side.
-   The user should never paste real credentials into chat.

## 7. Neon + Prisma

Neon provides the hosted PostgreSQL database.

`DATABASE_URL` contains the PostgreSQL connection string.

Prisma is responsible for:

-   schema definition;
-   migrations;
-   generated Prisma Client;
-   type-safe database queries;
-   seed workflows.

The agent should create a reusable Prisma client and avoid unnecessary
client instances during development.

Database structure should be managed through Prisma migrations. Raw SQL
is acceptable only where PostgreSQL/pgvector functionality genuinely
requires it and must remain compatible with the migration strategy.

## 8. Required Data Entities

The minimum entities are:

``` text
Workspace
User
Feedback
Theme
FeedbackTheme
Embedding
Report
```

The detailed fields and indexes belong in the dedicated database
specification.

The schema must support workspace ownership, the three roles, feedback
text/channel/sentiment/status, themes, theme confidence, embeddings,
reports, and timestamps.

## 9. Multi-Tenancy

Every tenant-owned database operation must be scoped by the
authenticated user's `workspaceId`.

This applies at minimum to:

-   users;
-   feedback;
-   themes;
-   feedback-theme relationships;
-   embeddings;
-   reports.

Never trust a client-provided workspace ID for authorization.

Required flow:

``` text
Request
 -> Authenticate
 -> Resolve user
 -> Resolve workspaceId
 -> Check role
 -> Validate input
 -> Workspace-scoped query
 -> Response
```

Example:

``` text
Bad:     find feedback where id = requestedId

Correct: find feedback where id = requestedId
         AND workspaceId = authenticatedWorkspaceId
```

Cross-workspace access must be explicitly tested.

## 10. RBAC

Roles:

``` text
ADMIN
ANALYST
VIEWER
```

Admin: full workspace access, member management, role management.

Analyst: feedback ingestion/management, AI features, analytics/reports;
cannot manage members.

Viewer: read-only access to appropriate feedback, dashboards, and
reports; cannot modify protected data or manage members.

Authorization must be enforced on the server. Hiding a UI control is
never sufficient.

Forbidden operations must return HTTP 403.

## 11. Authentication

Use Auth.js / NextAuth for sign-up, login, logout, sessions, and
authenticated identity.

Creating a workspace during sign-up makes the creator an Admin.

The authenticated user's workspace and role must be safely available to
server-side authorization logic.

## 12. Feedback Ingestion

Required methods:

1.  manual/single feedback;
2.  CSV bulk upload;
3.  simulated channel ingestion.

Live Zendesk, App Store, Twitter/social, and other third-party ingestion
is out of scope.

Manual ingestion:

``` text
Form
 -> Zod validation
 -> Authentication
 -> Authorization
 -> workspaceId from session
 -> Create feedback
 -> AI classification
 -> Persist result
```

CSV import must validate the file and rows, report malformed rows
clearly, assign the authenticated workspace, insert valid records
efficiently, and avoid freezing the UI while large AI workloads run.

## 13. AI Architecture

### Automatic classification

New feedback is sent to Claude and classified into at least:

-   sentiment;
-   sentiment score;
-   theme(s);
-   feature-area label.

Claude output must be structured and validated with Zod before
persistence.

Classification must be stored so viewing a feedback item does not
trigger another AI call.

### Theme clustering and trends

Theme processing operates on stored feedback. The system identifies
related feedback, groups it, names/updates themes, calculates frequency,
compares time periods, and detects growing themes or spikes.

Factual counts and comparisons must come from application/database
calculations, not invented model output.

### Ask LOOP

Ask LOOP must use retrieval-augmented generation:

``` text
Question
 -> Authenticate
 -> Resolve workspace
 -> Create question embedding
 -> Workspace-scoped vector search
 -> Retrieve relevant feedback
 -> Send evidence + question to Claude
 -> Grounded answer
 -> Evidence citations
```

The model must answer feedback questions from retrieved workspace
evidence and cite the records used.

Vector search must also be tenant-scoped.

### Voice-of-Customer report

Reports include top themes, sentiment changes, real customer quotes, and
recommended actions.

The application calculates factual statistics first, then supplies those
statistics and evidence to Claude for narrative generation.

Claude must not invent counts, percentages, trends, or customer quotes.

## 14. Dashboard

The dashboard must contain at least three real charts:

1.  feedback volume over time;
2.  sentiment breakdown;
3.  top themes.

Charts must use actual stored project data, not decorative hard-coded
values.

Prefer server-side aggregation so the browser does not download
unnecessary raw records.

## 15. Feedback Inbox

Required features:

-   search;
-   filters;
-   pagination;
-   feedback details;
-   status workflow.

Required workflow:

``` text
NEW -> REVIEWED -> ACTIONED
```

Do not load an unbounded feedback dataset into the browser.

Search, filtering, and pagination should be implemented efficiently at
the database/query layer.

## 16. API / Route Handler Rules

Route handlers should remain thin:

``` text
HTTP request
 -> Authentication
 -> Authorization
 -> Input validation
 -> Service/business logic
 -> Database/AI operation
 -> Validated response
```

Reusable business logic belongs in `lib/` rather than being duplicated
across routes.

Responses must use predictable status codes, useful errors, and must not
expose secrets or internal stack traces.

## 17. Validation

Use Zod for external input, including:

-   authentication input;
-   feedback;
-   CSV rows;
-   filters;
-   pagination;
-   status changes;
-   Ask LOOP questions;
-   report parameters;
-   structured AI output.

Server-side validation is mandatory even when client-side validation
exists.

## 18. Performance

Performance is a first-class requirement.

The application should:

-   load ordinary screens quickly;
-   paginate results;
-   avoid unnecessary requests;
-   avoid repeated AI calls;
-   avoid repeated embedding generation;
-   use efficient queries and justified indexes;
-   keep client bundles reasonable;
-   avoid sending large datasets to the browser;
-   keep long AI operations from blocking normal navigation;
-   provide loading, empty, success, and error states.

Ordinary screens should not require users to wait tens of seconds.

## 19. Error Handling

Handle validation, authentication, authorization, not-found, database,
AI-provider, import, and unexpected server errors distinctly.

Never expose raw database errors, API keys, stack traces, or internal
configuration.

If AI classification fails temporarily, already-stored feedback should
not be corrupted.

## 20. Seed Data

The seed process must create:

-   one demo workspace;
-   one demo Admin;
-   one demo Analyst;
-   one demo Viewer;
-   at least 120 realistic feedback items;
-   several channels;
-   themes;
-   varied sentiment, feature areas, and statuses.

The dataset must be meaningful for inbox, dashboard, trend, and AI
demonstrations.

## 21. Testing

Tests must cover:

-   authentication;
-   Admin/Analyst/Viewer permissions;
-   HTTP 403 behavior;
-   two-workspace tenant isolation;
-   feedback CRUD;
-   CSV validation;
-   pagination/filtering;
-   status transitions;
-   AI output validation;
-   Ask LOOP evidence scoping;
-   vector-search tenant isolation;
-   report statistics;
-   seed creation.

Tenant isolation is a mandatory security test.

## 22. Deployment

Target architecture:

``` text
GitHub
  -> Vercel
  -> Next.js application
       -> Neon PostgreSQL
       -> Anthropic API
```

Before final deployment, verify the production build, database
connection, migrations, authentication, RBAC, tenant isolation, AI
features, dashboard data, and responsive behavior.

## 23. Agent Operating Rules

The coding agent must:

1.  inspect existing files before changing them;
2.  follow Files 01 onward as the project specification;
3.  prefer simple architecture;
4.  not add Express or unnecessary services;
5.  never bypass authentication, RBAC, validation, or tenant scoping;
6.  verify meaningful changes with type checks, tests, linting where
    configured, and production builds;
7.  install required dependencies automatically rather than asking the
    user to manually install each npm package.

Do not add unnecessary state-management libraries, queues,
microservices, WebSockets, or third-party integrations.

## 24. Fixed Decisions

  Decision                                 Choice
  ---------------------------------------- ---------------------------------
  Framework                                Next.js 14 App Router
  Language                                 TypeScript
  Database                                 PostgreSQL
  PostgreSQL host                          Neon
  ORM                                      Prisma
  Authentication                           Auth.js / NextAuth
  AI                                       Anthropic Claude API
  Vector search                            pgvector + embeddings
  Validation                               Zod
  Charts                                   Recharts
  Deployment                               Vercel
  Separate Express server                  No
  Browser → database                       No
  Browser → Claude                         No
  Tenant isolation                         Server-enforced workspace scope
  RBAC                                     Server-enforced
  Live third-party feedback integrations   No
  Billing/subscriptions                    No

Still to be finalized in later documents:

-   detailed Prisma fields and indexes;
-   exact embedding provider/model;
-   detailed AI prompt/output contracts;
-   exact API contracts;
-   UI component specifications;
-   deployment environment configuration;
-   final test cases;
-   optional agent/MCP tooling strategy.

## 25. Technical Readiness

The architecture is ready for implementation when:

-   the Next.js project starts;
-   dependencies install cleanly;
-   environment variables are configured;
-   Prisma connects to Neon;
-   migrations run successfully;
-   the schema can be created from Prisma;
-   seed data can be generated;
-   authentication resolves users;
-   workspace and role information resolve server-side;
-   protected routes enforce authorization;
-   database queries are tenant-scoped.

**End of File 02.**
