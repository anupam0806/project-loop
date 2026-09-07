# Project LOOP --- Database Schema & Data Model Specification

**Document:** 03 --- Database Schema & Data Model\
**Project:** LOOP --- AI Customer Feedback Intelligence Platform\
**Depends on:** 01 --- Product Requirements Document (PRD) and 02 ---
Technical Architecture & Implementation Specification\
**Status:** Draft for implementation\
**Database:** PostgreSQL on Neon\
**ORM:** Prisma\
**Vector search:** pgvector + embeddings

------------------------------------------------------------------------

## 1. Purpose and Authority

File 01 defines what LOOP must do. File 02 defines how the application
is implemented. This file defines the database model, relationships,
constraints, indexes, vector-search requirements, seed-data structure,
and database-level implementation rules.

The coding agent must preserve every mandatory requirement from Files 01
and 02, especially:

-   workspace/tenant isolation;
-   Admin, Analyst, and Viewer roles;
-   feedback status workflow;
-   AI classification persistence;
-   themes and theme confidence;
-   embeddings and tenant-scoped retrieval;
-   stored Voice-of-Customer reports;
-   performance-oriented queries and indexes.

This document must not remove required entities from the PRD.

------------------------------------------------------------------------

## 2. Database Technology

Use:

-   PostgreSQL hosted on Neon;
-   Prisma ORM;
-   pgvector for semantic-search vectors;
-   Prisma migrations for schema changes;
-   a reusable Prisma Client instance;
-   seed scripts for deterministic demo data.

The application must not require the user to install PostgreSQL locally.

The `DATABASE_URL` is the only database connection credential required
by the application.

------------------------------------------------------------------------

## 3. Required Entities

The minimum required entities are:

1.  `Workspace`
2.  `User`
3.  `Feedback`
4.  `Theme`
5.  `FeedbackTheme`
6.  `Embedding`
7.  `Report`

Additional implementation tables may be introduced only when they solve
a concrete requirement and do not unnecessarily complicate the system.

------------------------------------------------------------------------

## 4. Entity Responsibilities

### 4.1 Workspace

Represents one company/tenant.

Required responsibilities:

-   identify the tenant;
-   own tenant-scoped feedback;
-   own tenant-scoped themes;
-   own tenant-scoped embeddings through their parent records;
-   own reports;
-   provide the isolation boundary for users.

Suggested fields:

``` text
id
name
createdAt
updatedAt
```

Rules:

-   `id` must be generated server-side;
-   workspace names should be validated;
-   deleting a workspace must not leave orphaned tenant-owned records;
-   destructive workspace deletion should not be exposed casually in the
    MVP.

------------------------------------------------------------------------

### 4.2 User

Represents an authenticated member of a workspace.

Required fields:

``` text
id
workspaceId
name
email
passwordHash
role
createdAt
updatedAt
```

Role enum:

``` text
ADMIN
ANALYST
VIEWER
```

Rules:

-   email must be unique within the appropriate authentication scope;
-   `workspaceId` is mandatory;
-   role must be represented by an enum;
-   passwords must never be stored in plaintext;
-   user authorization must always use the authenticated server-side
    user/workspace relationship.

A user cannot belong to two workspaces through the same membership
record. If multi-workspace membership is introduced later, it must use
an explicit membership model rather than weakening tenant isolation.

------------------------------------------------------------------------

### 4.3 Feedback

Represents one customer-feedback item.

Required data includes:

``` text
id
workspaceId
text
channel
sentiment
sentimentScore
featureArea
status
createdAt
updatedAt
```

Recommended additional fields:

``` text
externalId
customerName
metadata
classifiedAt
classificationModel
classificationVersion
```

The implementation should keep the core searchable/filterable fields
typed and indexed rather than putting everything into JSON.

Suggested enums:

``` text
Channel:
SUPPORT
APP_REVIEW
SURVEY
SALES
SOCIAL
SIMULATED

Sentiment:
POSITIVE
NEUTRAL
NEGATIVE
MIXED

FeedbackStatus:
NEW
REVIEWED
ACTIONED
```

Rules:

-   `workspaceId` is mandatory;
-   feedback text must be non-empty;
-   `sentimentScore` must be bounded to the documented application
    range;
-   status transitions must follow `NEW -> REVIEWED -> ACTIONED`;
-   server-side logic must reject invalid transitions;
-   AI classification fields may initially be nullable because AI
    processing can fail or be deferred;
-   viewing feedback must never trigger a new classification call.

------------------------------------------------------------------------

### 4.4 Theme

Represents a recurring customer topic.

Suggested fields:

``` text
id
workspaceId
name
description
createdAt
updatedAt
```

Optional fields:

``` text
slug
active
```

Rules:

-   theme names are workspace-scoped;
-   a theme from one workspace must never be returned in another
    workspace's queries;
-   theme creation/renaming must be authorized server-side.

------------------------------------------------------------------------

### 4.5 FeedbackTheme

Many-to-many relationship between feedback and themes.

Required fields:

``` text
feedbackId
themeId
confidence
createdAt
```

Rules:

-   `(feedbackId, themeId)` must be unique;
-   confidence must be bounded between 0 and 1;
-   both referenced records must belong to the same workspace through
    their parent relationships;
-   application/service logic must validate workspace consistency before
    creating the relationship.

The schema must not permit an accidental cross-workspace association.

------------------------------------------------------------------------

### 4.6 Embedding

Stores a vector representation used for semantic retrieval.

Required fields:

``` text
id
workspaceId
feedbackId
model
dimensions
createdAt
```

The actual vector column must use pgvector.

Conceptually:

``` text
embedding vector(<dimension>)
```

The exact dimension must be finalized together with the selected
embedding model/provider in implementation.

Rules:

-   one current embedding should normally exist per
    feedback/model/version;
-   embeddings must be tenant-scoped;
-   embedding generation must not happen repeatedly for the same
    unchanged feedback;
-   changing embedding model/dimension requires a deliberate
    migration/re-embedding strategy;
-   vector search must include workspace filtering.

If Prisma's standard schema syntax cannot express a required pgvector
operation cleanly, use a controlled migration with SQL while keeping
Prisma as the source of application-level schema management.

------------------------------------------------------------------------

### 4.7 Report

Stores a generated Voice-of-Customer report.

Required fields:

``` text
id
workspaceId
title
periodStart
periodEnd
content
createdAt
updatedAt
```

Recommended fields:

``` text
generatedByUserId
generationModel
generationVersion
statisticsJson
```

Rules:

-   reports are workspace-scoped;
-   report factual statistics must originate from application/database
    calculations;
-   generated narrative must not be treated as the source of truth for
    numerical metrics;
-   report content must not expose another workspace's feedback;
-   customer quotes included in reports must come from real stored
    feedback.

------------------------------------------------------------------------

## 5. Relationship Model

The logical relationship is:

``` text
Workspace
   |
   +----< User
   |
   +----< Feedback
   |          |
   |          +----< Embedding
   |          |
   |          +----< FeedbackTheme >---- Theme
   |
   +----< Theme
   |
   +----< Report
```

Cardinality:

``` text
Workspace 1 -> many Users
Workspace 1 -> many Feedback
Workspace 1 -> many Themes
Workspace 1 -> many Reports
Feedback  1 -> many Embeddings
Feedback  many <-> many Theme through FeedbackTheme
```

------------------------------------------------------------------------

## 6. Tenant Isolation Rules

Tenant isolation is non-negotiable.

Every tenant-owned query must resolve the workspace from the
authenticated session rather than trusting a client-provided
`workspaceId`.

Required pattern:

``` text
Authenticated session
        |
        v
Authenticated user
        |
        v
Authenticated user's workspaceId
        |
        v
Workspace-scoped Prisma query
```

Bad:

``` text
prisma.feedback.findUnique({
  where: { id: requestedId }
})
```

Correct conceptual behavior:

``` text
find feedback by requested id
AND verify workspaceId == authenticated workspaceId
```

For list queries:

``` text
WHERE workspaceId = authenticatedWorkspaceId
```

For nested resources:

``` text
WHERE id = requestedId
AND workspaceId = authenticatedWorkspaceId
```

For themes:

``` text
WHERE theme.workspaceId = authenticatedWorkspaceId
```

For reports:

``` text
WHERE report.workspaceId = authenticatedWorkspaceId
```

For embeddings/vector search:

``` text
WHERE embedding.workspaceId = authenticatedWorkspaceId
```

The vector-search query must never retrieve vectors globally and filter
them afterward in application code.

------------------------------------------------------------------------

## 7. Recommended Indexes

Indexes should support actual product queries rather than being added
indiscriminately.

At minimum, consider:

### User

``` text
(workspaceId)
(workspaceId, role)
```

and the required authentication lookup for email.

### Feedback

``` text
(workspaceId, createdAt)
(workspaceId, status, createdAt)
(workspaceId, sentiment, createdAt)
(workspaceId, channel, createdAt)
(workspaceId, featureArea, createdAt)
```

If the application performs frequent exact external-ID lookups:

``` text
(workspaceId, externalId)
```

### Theme

``` text
(workspaceId, name)
```

### FeedbackTheme

``` text
(feedbackId, themeId) UNIQUE
(themeId, feedbackId)
```

### Embedding

``` text
(workspaceId, feedbackId)
```

plus the appropriate pgvector index selected after confirming the final
vector dimension and query pattern.

### Report

``` text
(workspaceId, createdAt)
(workspaceId, periodStart, periodEnd)
```

Do not create indexes that are not justified by actual queries.

------------------------------------------------------------------------

## 8. Search and Filtering

The Feedback Inbox must support:

-   text search;
-   channel filtering;
-   sentiment filtering;
-   status filtering;
-   feature-area filtering;
-   pagination;
-   sorting.

Database queries should:

1.  authenticate;
2.  resolve workspace;
3.  validate filters with Zod;
4.  apply workspace scope;
5.  apply filters;
6.  apply sorting;
7.  paginate;
8.  return only required fields.

Avoid downloading the entire feedback table to the browser.

For large datasets, use cursor-based pagination where appropriate.
Offset pagination is acceptable for the initial implementation if it
remains performant on the required dataset and query patterns.

------------------------------------------------------------------------

## 9. Analytics Data Access

Dashboard statistics must be calculated from stored data.

Required metrics include:

-   feedback volume over time;
-   sentiment breakdown;
-   top themes.

Prefer database-side aggregation.

The browser should receive compact aggregated results rather than every
raw feedback record.

Example conceptual flow:

``` text
Feedback table
   |
   +--> aggregate by day
   +--> aggregate by sentiment
   +--> aggregate by theme
   |
   v
small dashboard payload
```

Never hard-code chart values.

------------------------------------------------------------------------

## 10. AI Classification Persistence

When feedback is classified by Claude, persist the structured result.

At minimum:

``` text
sentiment
sentimentScore
featureArea
themes
```

The raw Claude response should not be treated as trusted data.

Required flow:

``` text
Feedback
  -> Claude
  -> structured JSON
  -> Zod validation
  -> application validation
  -> database persistence
```

If classification fails:

-   preserve the original feedback;
-   record an appropriate failure state/log;
-   do not corrupt existing feedback;
-   permit controlled retry behavior.

Avoid storing large unnecessary raw AI responses in the database.

------------------------------------------------------------------------

## 11. Theme Relationships

A feedback item may belong to multiple themes.

Example:

``` text
Feedback:
"The checkout page is slow and the payment sometimes fails."

Themes:
- Checkout Performance
- Payment Reliability
```

Each relationship stores a confidence score.

The application must not create duplicate `(feedbackId, themeId)`
relationships.

Theme names must remain workspace-scoped.

------------------------------------------------------------------------

## 12. Embedding Lifecycle

Recommended lifecycle:

``` text
Feedback created
      |
      v
Classification
      |
      v
Embedding generated
      |
      v
Embedding stored
```

If feedback text changes materially:

``` text
Feedback text changed
      |
      v
invalidate/recompute embedding
```

Do not regenerate embeddings simply because the feedback is viewed.

Track the embedding model and dimensions so future model changes can be
handled deliberately.

------------------------------------------------------------------------

## 13. Ask LOOP Retrieval Model

Ask LOOP requires semantic retrieval.

Required sequence:

``` text
User question
      |
      v
Authenticate + resolve workspace
      |
      v
Generate question embedding
      |
      v
Vector search
  filtered by workspaceId
      |
      v
Top relevant feedback
      |
      v
Build bounded evidence context
      |
      v
Claude
      |
      v
Answer + evidence references
```

The database retrieval layer must return enough metadata to identify the
source feedback records.

The final answer should reference evidence records by stable
application-level identifiers, not expose database internals
unnecessarily.

------------------------------------------------------------------------

## 14. Report Data Model

A report should preserve the factual basis used for generation.

Recommended conceptual structure:

``` text
Report
 |
 +-- period
 +-- factual statistics
 +-- selected themes
 +-- selected feedback evidence
 +-- generated narrative
```

The application should calculate statistics before calling Claude.

Example factual inputs:

``` text
totalFeedback
positivePercent
neutralPercent
negativePercent
topThemes
themeGrowth
selectedQuotes
```

Claude generates narrative from those supplied facts.

The database record should make it possible to understand which period
and workspace produced the report.

------------------------------------------------------------------------

## 15. Seed Data Requirements

The seed script must create:

``` text
1 Workspace
1 Admin
1 Analyst
1 Viewer
120+ Feedback records
multiple channels
multiple sentiments
multiple statuses
multiple feature areas
multiple Themes
FeedbackTheme relationships
```

The seed data should be realistic enough to demonstrate:

-   inbox search;
-   filtering;
-   pagination;
-   sentiment charts;
-   theme charts;
-   trend calculations;
-   Ask LOOP retrieval;
-   Voice-of-Customer reporting.

Avoid repetitive placeholder text such as:

``` text
"Test feedback 1"
"Test feedback 2"
```

Use realistic customer-feedback scenarios across several product areas.

------------------------------------------------------------------------

## 16. Seed Credentials

Demo accounts must be throwaway credentials.

Suggested usernames/emails may follow a predictable demo convention, but
passwords must be unique to the project and must not be reused
elsewhere.

The final README will document the demo credentials.

Never commit real personal credentials.

------------------------------------------------------------------------

## 17. Migration Rules

All schema changes must use Prisma migrations.

Workflow:

``` text
Change schema.prisma
      |
      v
Create migration
      |
      v
Apply migration
      |
      v
Generate Prisma Client
      |
      v
Run tests/build
```

Do not modify the production database manually without recording the
corresponding migration.

For pgvector-specific operations that Prisma cannot express directly,
use migration SQL deliberately and document why.

------------------------------------------------------------------------

## 18. Deletion and Referential Integrity

Use explicit referential actions.

Recommended conceptual behavior:

-   deleting a Workspace cascades tenant-owned records only when
    workspace deletion is intentionally supported;
-   deleting Feedback removes dependent FeedbackTheme and current
    Embedding records;
-   deleting Theme is restricted or handled explicitly if feedback
    relationships would otherwise be silently lost;
-   deleting a User must not delete workspace data.

The coding agent must choose Prisma referential actions that preserve
these rules and verify them with tests.

------------------------------------------------------------------------

## 19. Data Integrity Constraints

At database/application level, enforce:

-   required workspace ownership;
-   valid role enum;
-   valid sentiment enum;
-   valid status enum;
-   bounded sentiment score;
-   bounded theme confidence;
-   unique feedback-theme pairs;
-   valid report periods;
-   valid embedding metadata;
-   required timestamps.

Application validation with Zod does not replace database constraints
where PostgreSQL can enforce the invariant safely.

------------------------------------------------------------------------

## 20. Privacy and AI Data Boundary

The database contains customer feedback and may contain information
submitted by customers.

The application must:

-   keep database credentials server-side;
-   never expose raw database connections to the browser;
-   send only the minimum evidence required to Claude;
-   avoid sending unrelated workspace records to the AI provider;
-   avoid including secrets in AI prompts;
-   avoid logging full customer feedback unnecessarily;
-   ensure retrieved evidence is workspace-scoped before it reaches
    Claude.

The AI provider must never receive direct database credentials or
unrestricted database access.

------------------------------------------------------------------------

## 21. Performance Requirements

The database design must support the required demo dataset without
forcing full-table transfers.

Required practices:

-   use indexes justified by queries;
-   paginate feedback;
-   aggregate analytics server-side;
-   select only needed columns;
-   avoid N+1 query patterns;
-   batch seed inserts where practical;
-   avoid repeated AI/embedding generation;
-   bound Ask LOOP retrieval size;
-   keep report evidence bounded.

Performance should be measured with realistic seeded data before
deployment.

------------------------------------------------------------------------

## 22. Security Test Matrix

The database layer must be tested against at least these cases:

### Test A --- Feedback isolation

User from Workspace A requests a Feedback ID belonging to Workspace B.

Expected:

``` text
404 or otherwise no data disclosure
```

Do not reveal whether the other workspace's record exists unless the API
contract explicitly requires it.

### Test B --- Theme isolation

Workspace A must not receive Workspace B themes.

### Test C --- Report isolation

Workspace A must not retrieve Workspace B reports.

### Test D --- Vector isolation

Workspace A's Ask LOOP query must never retrieve Workspace B embeddings
or feedback.

### Test E --- Relationship isolation

The application must reject creation of a FeedbackTheme relationship
where feedback and theme belong to different workspaces.

### Test F --- Role enforcement

Viewer must not mutate protected records.

Unauthorized operations must return HTTP 403 as required by File 01.

------------------------------------------------------------------------

## 23. Prisma Implementation Guidance

The coding agent should:

1.  inspect the existing project before creating the schema;
2.  create the Prisma schema from this document;
3.  use enums for fixed categorical values;
4.  create relations explicitly;
5.  add justified indexes;
6.  add migration(s);
7.  generate Prisma Client;
8.  create the seed script;
9.  run the seed against the configured development database;
10. verify the resulting records;
11. run tests and production build.

Do not install a separate database server or unnecessary database GUI.

------------------------------------------------------------------------

## 24. Open Database Decisions

The following should be finalized during implementation without
contradicting Files 01 or 02:

-   exact optional Feedback metadata fields;
-   exact embedding provider/model;
-   exact vector dimension;
-   exact pgvector index type and tuning;
-   whether a separate membership table is required;
-   exact full-text search implementation;
-   final Prisma referential actions.

These decisions should be documented when made.

------------------------------------------------------------------------

## 25. Database Readiness Checklist

The database implementation is ready when:

-   [ ] PostgreSQL connection works through Neon.
-   [ ] Prisma schema validates.
-   [ ] Prisma migrations apply cleanly.
-   [ ] All seven required entities exist.
-   [ ] Relations are correct.
-   [ ] Required enums exist.
-   [ ] Tenant-scoped indexes exist where justified.
-   [ ] pgvector is enabled.
-   [ ] Embedding storage works.
-   [ ] Seed creates 120+ realistic feedback records.
-   [ ] Demo users exist for all three roles.
-   [ ] FeedbackTheme uniqueness works.
-   [ ] Workspace isolation tests pass.
-   [ ] Vector-search isolation tests pass.
-   [ ] Dashboard aggregation queries return real data.
-   [ ] Report data can be stored.
-   [ ] No secrets are present in schema, seed data, or repository.

------------------------------------------------------------------------

## 26. Consistency Rule

This document refines the data layer only.

If a database implementation choice conflicts with a mandatory
requirement in File 01 or File 02, the mandatory requirement takes
precedence unless explicitly revised and approved.

**End of File 03.**
