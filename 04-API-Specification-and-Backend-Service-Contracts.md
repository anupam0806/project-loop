# Project LOOP — API Specification & Backend Service Contracts

## 1. Purpose

This document defines the API contracts and backend service boundaries for Project LOOP — AI Customer Feedback Intelligence Platform.

It is the implementation contract between the Next.js frontend, Route Handlers, authentication/RBAC, Zod validation, Prisma/PostgreSQL, pgvector retrieval, Anthropic Claude API, analytics, and report generation.

Dependencies:
1. `01-PRD.md`
2. `02-Technical-Architecture.md`
3. `03-Database-Schema-and-Data-Model.md`

Those documents remain authoritative for product requirements, architecture, and database design.

**Critical AI decision:** Project LOOP uses the **Anthropic Claude API** for the AI capabilities explicitly required by the project specification. Do not silently replace Claude with Gemini, Ollama, OpenAI, or another provider. Claude should be isolated behind a server-side adapter so a provider can be changed later without redesigning the API.

---

## 2. Approved Backend Stack

- Next.js 14 App Router
- TypeScript
- Next.js Route Handlers
- server-side service layer
- Zod
- Prisma ORM
- PostgreSQL
- Neon or Supabase PostgreSQL
- pgvector
- Auth.js / NextAuth
- Anthropic Claude API
- Vercel

The browser must never directly access PostgreSQL, Prisma, pgvector, Anthropic, or server-only secrets.

Expected flow:

```text
Browser
  ↓
Next.js Route Handler
  ↓
Authentication
  ↓
Workspace resolution
  ↓
RBAC authorization
  ↓
Zod validation
  ↓
Backend service
  ↓
Prisma / pgvector / Claude
  ↓
Safe JSON response
  ↓
Browser
```

---

## 3. API Conventions

### Base path

All application APIs use `/api/...`.

Examples:
- `/api/feedback`
- `/api/themes`
- `/api/analytics/summary`
- `/api/ask`
- `/api/reports`
- `/api/workspace`

### HTTP methods

| Method | Purpose |
|---|---|
| GET | Retrieve resources |
| POST | Create a resource or execute an operation |
| PATCH | Partially update a resource |
| DELETE | Delete a resource where permitted |

### Success envelope

Single resource:

```json
{ "data": {} }
```

Collection:

```json
{
  "data": [],
  "meta": {
    "page": 1,
    "pageSize": 25,
    "total": 120,
    "totalPages": 5
  }
}
```

Action:

```json
{
  "data": {},
  "message": "Operation completed successfully."
}
```

### Error envelope

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The request contains invalid fields.",
    "fields": {}
  }
}
```

Never return stack traces, raw database errors, API keys, session secrets, internal paths, or raw Claude errors to the browser.

---

## 4. Authentication Contract

Every protected endpoint resolves the authenticated user on the server.

Create reusable helpers conceptually equivalent to:

```ts
requireAuth()
requireRole(...)
requireWorkspaceAccess(...)
```

Unauthenticated requests return:

```text
401 Unauthorized
```

Example:

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication is required."
  }
}
```

Authenticated but unauthorized requests return:

```text
403 Forbidden
```

Example:

```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "You do not have permission to perform this action."
  }
}
```

---

## 5. Multi-Tenant Workspace Contract

Workspace isolation is mandatory.

The client must not be trusted to define the tenant boundary.

Do not accept an arbitrary `workspaceId` and query it without membership validation.

Correct conceptual flow:

```text
authenticated user
      ↓
resolve allowed workspace
      ↓
verify membership
      ↓
derive trusted workspaceId
      ↓
query resource inside workspace
```

Every workspace-owned query must include the authorized workspace context.

A resource ID must never allow cross-tenant access.

---

## 6. RBAC Contract

Roles:

- ADMIN
- ANALYST
- VIEWER

Initial permission matrix:

| Capability | ADMIN | ANALYST | VIEWER |
|---|---:|---:|---:|
| View dashboard | Yes | Yes | Yes |
| View feedback | Yes | Yes | Yes |
| Create feedback | Yes | Yes | No |
| Update feedback | Yes | Yes | No |
| Delete feedback | Yes | Yes/restricted by product policy | No |
| Import CSV | Yes | Yes | No |
| View themes | Yes | Yes | Yes |
| Manage themes | Yes | Yes | No |
| Ask LOOP | Yes | Yes | Yes |
| Generate reports | Yes | Yes | View only |
| Manage workspace | Yes | No | No |
| Manage users | Yes | No | No |

The PRD wins if a later requirement narrows a permission.

Authorization must always be enforced server-side. Hiding a frontend button is not authorization.

---

# 7. Feedback API

## 7.1 List feedback

```http
GET /api/feedback
```

Supported query parameters:

```text
q
channel
sentiment
status
featureArea
page
pageSize
sort
order
```

Example:

```text
/api/feedback?q=checkout&sentiment=NEGATIVE&page=1&pageSize=25
```

Rules:
- `page` defaults to `1`
- `pageSize` defaults to `25`
- maximum `pageSize` is `100`
- sorting uses an allow-list
- filtering is server-side
- search is workspace-scoped
- pagination is database-backed

Never load all feedback into the browser and filter it there.

Example response:

```json
{
  "data": [
    {
      "id": "feedback-id",
      "text": "The checkout process is confusing.",
      "channel": "SUPPORT",
      "sentiment": "NEGATIVE",
      "status": "NEW",
      "featureArea": "checkout",
      "createdAt": "2026-09-01T10:00:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "pageSize": 25,
    "total": 120,
    "totalPages": 5
  }
}
```

The actual fields must follow File 03.

---

## 7.2 Feedback detail

```http
GET /api/feedback/:id
```

Return the workspace-scoped feedback record and the related information required by the detail UI, such as classification and linked themes.

The service must verify that the feedback belongs to the authenticated user's workspace.

---

## 7.3 Create feedback

```http
POST /api/feedback
```

Content type:

```text
application/json
```

Example:

```json
{
  "text": "The mobile checkout takes too many steps.",
  "channel": "SUPPORT",
  "featureArea": "checkout"
}
```

Use a Zod request schema.

Conceptual flow:

```text
request
 ↓
authenticate
 ↓
authorize ADMIN/ANALYST
 ↓
validate with Zod
 ↓
create Feedback
 ↓
classify with Claude
 ↓
validate Claude result
 ↓
persist classification
 ↓
create/update embedding as required
 ↓
return feedback
```

If AI processing fails after the source feedback is saved, preserve the feedback and make AI processing retryable where practical. Never silently lose the original feedback.

---

## 7.4 Update feedback

```http
PATCH /api/feedback/:id
```

Only explicitly allowed fields may be changed.

Flow:

1. authenticate
2. verify workspace
3. verify role
4. validate body
5. load current state
6. apply permitted changes
7. trigger dependent processing when required
8. return updated DTO

Never allow arbitrary database fields from client input.

---

## 7.5 Delete feedback

```http
DELETE /api/feedback/:id
```

Authorize server-side.

Account for dependent:
- theme links
- embeddings
- report references where applicable

Use the referential-integrity rules in File 03. Do not leave orphaned vector or relationship records.

---

# 8. Feedback Status Workflow

If workflow statuses are used, enforce valid transitions on the server.

Per File 03's `FeedbackStatus` enum, the required transitions are:

```text
NEW
 ↓
REVIEWED
 ↓
ACTIONED
```

The exact status values must follow the database/product specification
(File 03) — do not introduce additional status values not defined there.

Invalid transitions return:

```text
409 Conflict
```

Example:

```json
{
  "error": {
    "code": "INVALID_STATUS_TRANSITION",
    "message": "This feedback cannot move to the requested status."
  }
}
```

---

# 9. CSV Feedback Import

```http
POST /api/feedback/import
```

Content type:

```text
multipart/form-data
```

The route must:
1. authenticate
2. authorize ADMIN/ANALYST
3. validate file presence
4. enforce file-size limits
5. parse CSV
6. validate headers
7. validate rows
8. report malformed rows according to the import contract
9. create feedback records
10. process classification
11. create embeddings where required
12. return an import summary

Example:

```json
{
  "data": {
    "totalRows": 120,
    "imported": 117,
    "failed": 3,
    "errors": [
      {
        "row": 18,
        "message": "Content is required."
      }
    ]
  }
}
```

Large imports must not create an unbounded request or transaction. If asynchronous processing is later introduced, return an import/job identifier and expose processing status.

---

# 10. Theme API

## List

```http
GET /api/themes
```

Return workspace-scoped themes.

## Detail

```http
GET /api/themes/:id
```

Return the theme and relevant workspace-scoped feedback information required by the UI.

## Create

```http
POST /api/themes
```

Authorization: ADMIN or ANALYST.

## Update

```http
PATCH /api/themes/:id
```

Only permitted fields may be changed.

All theme operations are workspace-scoped.

---

# 11. Analytics API

## Dashboard summary

```http
GET /api/analytics/summary
```

Potential response:

```json
{
  "data": {
    "totalFeedback": 120,
    "positivePercentage": 62.5,
    "negativePercentage": 22.5,
    "neutralPercentage": 15,
    "actionableFeedback": 31,
    "volumeOverTime": [],
    "sentimentOverTime": [],
    "topThemes": []
  }
}
```

Exact metrics must match the PRD.

### Numerical truth rule

Authoritative statistics are calculated by the application/database, not invented by Claude.

Use SQL/Prisma aggregation and deterministic calculations for:
- counts
- percentages
- grouped sentiment
- grouped themes
- time-series values

Do not ask Claude to calculate authoritative dashboard totals from raw data.

---

# 12. Analytics Performance

Avoid fetching every feedback row into JavaScript.

Prefer:

```text
PostgreSQL aggregation
        ↓
small result set
        ↓
Next.js server
        ↓
JSON
```

Use indexes from File 03.

Avoid dozens of independent browser requests when a coordinated dashboard service can efficiently provide the required metrics.

---

# 13. AI Classification Contract

AI classification is server-side.

Conceptual interface:

```ts
classifyFeedback(
  feedback: ClassificationInput
): Promise<ClassificationResult>
```

Provider abstraction:

```ts
interface AIProvider {
  classifyFeedback(input: ClassificationInput): Promise<ClassificationResult>
  answerQuestion(input: QuestionInput): Promise<AnswerResult>
  generateReportNarrative(
    input: ReportNarrativeInput
  ): Promise<ReportNarrativeResult>
}
```

Production implementation:

```text
ClaudeProvider
```

The rest of the backend should depend on the interface, not Claude-specific calls.

---

# 14. Claude Classification Flow

```text
new feedback
   ↓
server service
   ↓
controlled prompt
   ↓
Claude API
   ↓
structured response
   ↓
Zod validation
   ↓
normalization
   ↓
database persistence
```

Never trust model output merely because it is JSON.

Validate:
- required fields
- enum values
- structure
- lengths
- business constraints

---

# 15. AI Failure Handling

Possible failures:
- timeout
- provider error
- rate limit
- invalid model output
- malformed structured response
- provider outage

Return a stable application-level error:

```json
{
  "error": {
    "code": "AI_PROCESSING_FAILED",
    "message": "AI processing could not be completed."
  }
}
```

Never expose the `ANTHROPIC_API_KEY` or raw provider diagnostics.

---

# 16. Ask LOOP API

```http
POST /api/ask
```

Example request:

```json
{
  "question": "What are the main complaints about checkout?"
}
```

Workspace context is derived from authentication.

Do not trust a client-provided workspace ID for retrieval.

---

# 17. Ask LOOP Retrieval Pipeline

```text
User question
      ↓
Authenticate
      ↓
Resolve workspace
      ↓
Validate question
      ↓
Retrieve relevant feedback
      ↓
Workspace-scoped evidence
      ↓
Controlled Claude prompt
      ↓
Claude
      ↓
Validate response
      ↓
Attach citations
      ↓
Return grounded answer
```

Keep retrieval and generation as separate services:

```ts
retrieveEvidence(question, workspaceId)
answerWithClaude(question, evidence)
```

---

# 18. Ask LOOP Grounding Rules

Claude must answer using retrieved workspace evidence.

The answer should:
- summarize supported findings
- distinguish evidence from interpretation
- avoid inventing customer feedback
- cite supporting records where the UI requires it
- state when there is insufficient evidence

Never fabricate citations.

The vector search must include tenant filtering.

---

# 19. Ask LOOP Response

Example:

```json
{
  "data": {
    "answer": "Customers frequently report friction during checkout.",
    "citations": [
      {
        "feedbackId": "feedback-123",
        "snippet": "The checkout process is confusing..."
      }
    ],
    "confidence": "supported"
  }
}
```

Possible support states:

```text
supported
insufficient_evidence
```

The final shape must remain consistent with the UI specification.

---

# 20. VoC Report API

## Generate

```http
POST /api/reports
```

Example:

```json
{
  "period": {
    "from": "2026-08-01",
    "to": "2026-08-31"
  }
}
```

## List

```http
GET /api/reports
```

Use workspace scoping and pagination where required.

## Detail

```http
GET /api/reports/:id
```

Viewing a stored report must not regenerate it.

---

# 21. VoC Report Pipeline

```text
request
 ↓
authenticate
 ↓
authorize
 ↓
validate parameters
 ↓
calculate factual statistics in application
 ↓
retrieve relevant themes/evidence
 ↓
send controlled statistics/evidence to Claude
 ↓
Claude generates narrative
 ↓
validate narrative
 ↓
persist Report
 ↓
return report
```

Claude generates narrative interpretation. The application owns factual numerical calculations.

---

# 22. Workspace API

Current workspace:

```http
GET /api/workspace
```

Example:

```json
{
  "data": {
    "id": "workspace-id",
    "name": "Demo Workspace"
  }
}
```

Never return secrets.

---

# 23. User Management API

ADMIN-only routes:

```http
GET /api/workspace/users
POST /api/workspace/users
PATCH /api/workspace/users/:id
DELETE /api/workspace/users/:id
```

The implementation must follow the authentication model selected in File 02.

Prevent:
- cross-workspace user modification
- unauthorized workspace access
- unsafe administrator removal
- client-side-only role enforcement

---

# 24. Zod Validation

Centralize API schemas.

Recommended conceptual structure:

```text
src/
  lib/
    validation/
      feedback.ts
      theme.ts
      analytics.ts
      ask.ts
      report.ts
      workspace.ts
      common.ts
```

Validate:
- request bodies
- query parameters
- route parameters
- imported data

Avoid duplicating validation rules in route handlers.

---

# 25. Pagination

Defaults:

```text
page = 1
pageSize = 25
```

Maximum:

```text
pageSize = 100
```

Use bounded integer validation.

Never permit invalid values to create uncontrolled database queries.

---

# 26. Sorting and Filtering

Client-provided sorting uses an allow-list.

Conceptual:

```ts
const sortFields = {
  createdAt: "createdAt",
  sentiment: "sentiment",
  status: "status"
}
```

Never concatenate arbitrary user input into raw SQL.

Apply the same principle to:
- filters
- order direction
- search fields
- report parameters

---

# 27. Search

Feedback search must be:
- workspace-scoped
- parameterized
- paginated
- server-side

Choose an indexed PostgreSQL strategy appropriate to the final schema.

Do not fetch all feedback and filter in JavaScript.

---

# 28. Embedding Service Contract

Keep embeddings behind a dedicated service:

```ts
interface EmbeddingService {
  embedText(input: string): Promise<number[]>
}
```

The implementation must remain compatible with pgvector and File 03.

The API layer must not know provider-specific embedding details.

---

# 29. Embedding Lifecycle

New searchable feedback:

```text
feedback created
 ↓
embedding requested
 ↓
embedding generated
 ↓
vector persisted
```

Changed feedback content:

```text
content changed
 ↓
old embedding invalidated/replaced
 ↓
new embedding generated
```

Deleted feedback:

```text
feedback deleted
 ↓
embedding removed or cascade-handled
```

The exact embedding provider remains an implementation decision unless fixed elsewhere.

---

# 30. Service Layer Architecture

Keep Route Handlers thin.

Recommended conceptual structure:

```text
src/
  app/
    api/
      feedback/
      themes/
      analytics/
      ask/
      reports/
      workspace/

  server/
    auth/
    services/
      feedback/
      themes/
      analytics/
      ai/
      retrieval/
      reports/
      embeddings/
      workspace/

  lib/
    validation/
    db/
```

Route handlers primarily:
1. authenticate
2. parse/validate
3. call service
4. translate known errors into HTTP responses

Business logic belongs in services.

---

# 31. Transaction Rules

Use transactions when multiple local records must remain consistent.

Examples:
- feedback + relationships
- theme updates + related records
- report persistence
- workspace/user membership changes

Do not hold a database transaction open while waiting unnecessarily for Claude.

Prefer, where workflow permits:

```text
transaction:
  persist local state
commit

external AI processing

transaction:
  persist AI result
commit
```

---

# 32. Claude Service Boundary

Recommended conceptual structure:

```text
server/services/ai/
  provider.ts
  claude-provider.ts
  prompts/
  schemas/
```

Benefits:
- centralized prompt management
- easier testing
- centralized provider errors
- future provider replacement
- controlled secret usage

Claude remains the required provider for the current project.

---

# 33. Prompt Management

Do not scatter large prompts across Route Handlers.

Prompts should define:
- task
- output contract
- grounding rules
- formatting expectations
- insufficient-evidence behavior

Only send the minimum evidence required for the task.

---

# 34. AI Output Validation

Every structured AI result must pass a Zod schema before persistence or response.

Conceptual example:

```ts
const classificationSchema = z.object({
  sentiment: z.enum(["POSITIVE", "NEGATIVE", "NEUTRAL"]),
  themes: z.array(z.string()),
  actionable: z.boolean()
})
```

The actual schema must match File 03 and the PRD.

Never use unchecked model JSON as trusted application state.

---

# 35. HTTP Status Mapping

| Condition | Status |
|---|---:|
| Success | 200 |
| Created | 201 |
| No content | 204 |
| Invalid request | 400 |
| Unauthenticated | 401 |
| Forbidden | 403 |
| Not found | 404 |
| Conflict | 409 |
| Validation failure | 422 if consistently selected |
| Rate limited | 429 |
| External service failure | 502/503 |
| Unexpected failure | 500 |

Errors must not expose internal implementation details.

---

# 36. Resource Limits

Define bounded limits for:
- feedback content length
- question length
- CSV size
- CSV row count
- page size
- report date range
- AI prompt context
- returned citation count

Centralize these constants.

This protects performance and AI cost.

---

# 37. AI Cost Control

Claude requests must be intentionally bounded.

Use:
- limited retrieval results
- summarized evidence when appropriate
- maximum prompt size
- maximum output tokens
- no duplicate AI calls
- deterministic application statistics

Never send an entire workspace to Claude for every question.

---

# 38. Rate Limiting

AI-heavy endpoints should support rate limiting:

```text
/api/ask
/api/reports
/api/feedback
/api/feedback/import
```

The exact production mechanism can be selected later.

Rate limiting should be implemented around service operations rather than tightly coupling it to business logic.

---

# 39. Caching

Cache only when correctness permits.

Potential candidates:
- stable workspace metadata
- dashboard aggregates where appropriate
- stored report reads

Be careful with:
- user-specific data
- tenant-sensitive data
- AI answers
- rapidly changing feedback

Every tenant-sensitive cache key must include a safe workspace identifier.

---

# 40. Logging

Useful server-side fields:

```text
requestId
route
method
workspaceId
userId
durationMs
statusCode
operation
```

Never log:
- API keys
- passwords
- session secrets
- unnecessary full customer feedback
- private Claude prompts containing customer content

AI failures should be logged with safe diagnostics.

---

# 41. Performance Requirements

The backend must support a responsive dashboard.

Required practices:
- database-side filtering
- database-side aggregation
- pagination
- indexed queries
- bounded result sets
- efficient Prisma selects
- no unnecessary N+1 queries
- controlled AI context
- minimal response payloads

Do not return entire records when a list screen only needs summary fields.

---

# 42. N+1 Query Prevention

For related data:
- use appropriate Prisma relation loading
- batch queries
- aggregate in SQL
- avoid one theme query per feedback item

The coding agent should inspect query behavior for complex endpoints.

---

# 43. API Route Map

Initial routes:

```text
/api/feedback
/api/feedback/:id
/api/feedback/import

/api/themes
/api/themes/:id

/api/analytics/summary

/api/ask

/api/reports
/api/reports/:id

/api/workspace
/api/workspace/users
/api/workspace/users/:id
```

Only add endpoints required by the PRD/UI.

Do not create unnecessary CRUD endpoints merely because a database table exists.

---

# 44. Frontend Consumption

The UI should consume API contracts through typed functions rather than scattering raw `fetch()` calls across components.

Conceptual:

```text
client/
  api/
    feedback.ts
    themes.ts
    analytics.ts
    ask.ts
    reports.ts
```

The frontend must handle:
- loading
- empty
- error
- success
- unauthorized
- forbidden
- retry

---

# 45. Server vs Client Responsibility

Prefer server-side execution for:
- database access
- authentication
- authorization
- analytics aggregation
- Claude requests
- vector retrieval
- report generation

Use client-side code for:
- interactive filters
- charts requiring interaction
- forms
- dialogs
- Ask LOOP input
- safe optimistic UI

Do not make the entire dashboard one large Client Component.

---

# 46. Security Test Matrix

| Test | Expected |
|---|---|
| Unauthenticated feedback request | 401 |
| Viewer creates feedback | 403 |
| Viewer imports CSV | 403 |
| Analyst reads feedback | 200 |
| User accesses another workspace feedback ID | 404/403 without leakage |
| Manipulated workspace query parameter | No cross-tenant access |
| Invalid feedback body | Validation error |
| Invalid status transition | 409 |
| Malformed AI response | Safe AI error |
| Claude failure | No secret leakage |
| Oversized import | Bounded rejection |
| Invalid page/pageSize | Validation/normalization |
| Arbitrary sort field | Rejected |
| Ask LOOP with no evidence | Insufficient-evidence response |
| Vector retrieval across tenants | Impossible |

---

# 47. API Testing Strategy

### Unit tests

Test:
- Zod schemas
- service functions
- status transitions
- analytics calculations
- AI response parsing
- authorization helpers

### Integration tests

Test:
- API route + database
- tenant isolation
- Prisma relationships
- feedback creation/classification persistence
- retrieval filtering

### End-to-end tests

Test:
- login
- dashboard
- feedback search/filter
- feedback creation
- Ask LOOP
- report generation
- role restrictions

AI calls should be mockable. Do not require live Claude calls for every automated test.

---

# 48. Mocking Claude

Create a deterministic test provider:

```text
MockAIProvider
```

Conceptual behavior:

```text
classifyFeedback() → fixed valid classification
answerQuestion() → fixed grounded answer
generateReportNarrative() → fixed report narrative
```

Production uses:

```text
ClaudeProvider
```

This keeps CI independent of live API availability and API credits.

---

# 49. Environment Variables

At minimum:

```text
DATABASE_URL
NEXTAUTH_SECRET
ANTHROPIC_API_KEY
```

Additional variables may be added when required by authentication, deployment, or the selected embedding implementation.

Never commit secrets.

Never expose server secrets through `NEXT_PUBLIC_*`.

---

# 50. Error Handling Architecture

Use a central application error model.

Conceptual:

```ts
class AppError extends Error {
  code: string
  status: number
}
```

Possible codes:

```text
UNAUTHORIZED
FORBIDDEN
NOT_FOUND
VALIDATION_ERROR
CONFLICT
AI_PROCESSING_FAILED
RATE_LIMITED
DATABASE_ERROR
IMPORT_ERROR
```

Known errors are translated consistently by Route Handlers.

Unexpected errors become a generic 500 response while safe diagnostics are logged server-side.

---

# 51. API DTO Boundary

Do not automatically expose every Prisma model field.

Use:

```text
Prisma model
    ↓
service
    ↓
DTO
    ↓
Route Handler
    ↓
JSON
```

This prevents accidental exposure of internal fields, secrets, unrelated relationships, and implementation-specific columns.

---

# 52. API/AI Trust Boundary

AI output is untrusted external input.

Correct:

```text
Claude
 ↓
schema validation
 ↓
normalization
 ↓
business validation
 ↓
database
```

Never:

```text
Claude
 ↓
database
```

without validation.

---

# 53. API/UI Contract

The API must provide enough information for:
- dashboard KPI cards
- charts
- feedback inbox
- feedback detail
- themes
- Ask LOOP
- reports
- workspace administration
- role-aware navigation

Do not add large payloads merely to make frontend implementation easier.

---

# 54. Implementation Order

### Phase 1 — Foundation
1. database client
2. environment validation
3. authentication
4. workspace context
5. RBAC helpers
6. application error model
7. Zod validation
8. common response helpers

### Phase 2 — Core data
9. feedback list
10. feedback detail
11. create feedback
12. update feedback
13. delete feedback
14. theme endpoints

### Phase 3 — Analytics
15. dashboard summary
16. time-series aggregation
17. theme aggregation
18. sentiment aggregation

### Phase 4 — AI
19. Claude provider
20. AI schemas
21. classification service
22. classification persistence
23. embedding service
24. retrieval service
25. Ask LOOP

### Phase 5 — Reports
26. report statistics
27. Claude report narrative
28. report persistence
29. report APIs

### Phase 6 — Import and management
30. CSV import
31. user management
32. operational safeguards
33. rate limiting where selected

### Phase 7 — Testing
34. unit tests
35. integration tests
36. tenant-isolation tests
37. API tests
38. end-to-end tests

---

# 55. Coding-Agent Rules

The AI coding agent must:

1. Read Files 01–03 before implementing APIs.
2. Never invent product requirements.
3. Never replace Claude.
4. Never expose server secrets.
5. Never bypass authentication.
6. Never trust client workspace IDs.
7. Keep business logic in services.
8. Validate external input with Zod.
9. Validate Claude output with Zod.
10. Enforce tenant isolation in every workspace-owned query.
11. Use indexes defined in File 03.
12. Avoid N+1 queries.
13. Use pagination for potentially large collections.
14. Keep AI context bounded.
15. Make Claude mockable.
16. Calculate numerical analytics deterministically.
17. Keep API response shapes stable.
18. Add security-boundary tests.
19. Do not silently upgrade the specified Next.js major version.
20. Do not add unnecessary dependencies.

---

# 56. Dependency Installation

The coding agent should install required dependencies when its environment has package-manager authorization.

Before installing:
1. check whether an existing dependency already solves the problem
2. use maintained packages
3. avoid duplicates
4. keep the dependency footprint small
5. update lockfiles correctly
6. verify Next.js 14 compatibility

The user should not need to manually install every package if the coding agent can safely perform the setup.

---

# 57. Cross-Platform Requirement

Development should remain practical on:
- Windows
- Linux
- Ubuntu
- Linux Mint
- Pop!_OS

Avoid hard-coded OS-specific paths and commands when a cross-platform alternative exists.

Package scripts should work on supported operating systems.

---

# 58. Open Implementation Decisions

These may remain open until implementation/testing:
- exact embedding provider
- exact embedding model
- final Claude model selection
- final prompt wording
- exact DTO naming where not fixed
- rate-limit mechanism
- caching strategy
- background processing for large imports
- production observability provider

These decisions must not contradict the fixed architecture.

---

# 59. Fixed Decisions

The following are fixed:
- Next.js 14 App Router
- TypeScript
- PostgreSQL
- Prisma
- pgvector
- Auth.js/NextAuth architecture
- server-side API access
- multi-tenant workspace isolation
- RBAC
- Anthropic Claude API for required AI functionality
- application-owned numerical analytics
- server-side AI calls
- Zod validation
- Vercel-compatible architecture

**Claude remains the required AI provider for the current Project LOOP implementation.**

The provider is isolated behind an abstraction for future flexibility, but the current implementation must follow the documented Claude requirement.

---

# 60. Definition of Done

The backend/API layer is complete when:

- [ ] all required routes exist
- [ ] authentication is enforced
- [ ] RBAC is enforced
- [ ] workspace isolation is enforced
- [ ] Zod validates API input
- [ ] response envelopes are consistent
- [ ] errors are sanitized
- [ ] Prisma uses File 03 schema
- [ ] pagination is implemented where required
- [ ] analytics use deterministic calculations
- [ ] Claude is integrated server-side
- [ ] Claude output is schema-validated
- [ ] Ask LOOP retrieval is tenant-safe
- [ ] Ask LOOP answers are evidence-grounded
- [ ] reports use application-calculated facts
- [ ] embeddings use a dedicated service
- [ ] AI calls are mockable
- [ ] secrets remain server-side
- [ ] security tests cover cross-tenant access
- [ ] performance-sensitive queries are indexed
- [ ] frontend consumption is clean
- [ ] automated tests pass

---

# 61. Handoff to File 05

File 05 will define the UI/UX specification.

It must consume these API contracts for:
- dashboard
- feedback inbox
- feedback details
- themes
- Ask LOOP
- reports
- workspace/user administration
- authentication states
- loading/error/empty states
- responsive behavior

The UI must not invent backend capabilities that are not represented here without first updating the relevant specification.
