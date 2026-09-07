# Project LOOP — Final Implementation & Delivery Specification

## 1. Purpose
This is the final execution guide for the AI coding agent. Implement the project in the order defined by the preceding specifications without silently changing approved requirements.

## 2. Specification Hierarchy
Use this priority:
1. `01-PRD.md`
2. `02-Technical-Architecture.md`
3. `03-Database-Schema-and-Data-Model.md`
4. `04-API-Specification-and-Backend-Service-Contracts.md`
5. `05-UI-UX-and-Frontend-Experience-Specification.md`
6. This document

If an implementation detail is unspecified, choose the simplest production-appropriate option and document the decision.

## 3. Initial Setup
Create a Next.js 14 App Router project using:
- TypeScript
- Tailwind CSS
- ESLint
- the selected package manager

Install required dependencies through the package manager. The coding agent should install dependencies automatically rather than asking the user to manually install ordinary project dependencies.

## 4. Environment
Create:
- `.env.local` for local secrets
- `.env.example` with names only

Required:
- `DATABASE_URL`
- `NEXTAUTH_SECRET`
- `ANTHROPIC_API_KEY`

Never commit secrets.

## 5. Database
Use the existing Neon/Supabase PostgreSQL database.

Steps:
1. configure `DATABASE_URL`
2. install/configure Prisma
3. implement schema
4. generate Prisma client
5. create migrations
6. run migrations
7. seed demo data

Do not install a separate PostgreSQL server unless the existing database is unavailable.

## 6. Seed Data
Seed:
- one demo workspace
- ADMIN user
- ANALYST user
- VIEWER user
- at least 120 realistic feedback records
- varied sources
- varied sentiment
- recurring themes
- multiple features/product areas
- varied dates
- varied statuses

## 7. Authentication
Implement Auth.js/NextAuth using a secure configuration compatible with the selected authentication strategy.

Every protected request must resolve:
- authenticated user
- workspace
- role

## 8. Authorization & Tenant Isolation
Implement centralized authorization utilities.

Never trust:
- workspace IDs from the browser
- role values from the browser
- user IDs supplied by an untrusted client

Add automated tests proving one workspace cannot read or modify another workspace's records.

## 9. Backend Order
Implement in this order:
1. shared validation/error utilities
2. authentication
3. workspace authorization
4. feedback CRUD
5. CSV import
6. themes
7. analytics
8. Claude classification
9. embeddings
10. Ask LOOP retrieval/Q&A
11. VoC reports
12. user/workspace administration

## 10. Claude Integration
Anthropic Claude is required by the project specification.

Implement:
```ts
interface AIProvider {
  classifyFeedback(input: ClassificationInput): Promise<ClassificationResult>;
  answerWithEvidence(input: GroundedQuestionInput): Promise<GroundedAnswer>;
  generateVoCNarrative(input: VoCNarrativeInput): Promise<VoCNarrative>;
}
```

Production provider: Anthropic Claude.

Testing provider: `MockAIProvider`.

This interface is an architectural boundary, not a reason to replace the required Claude integration.

## 11. Classification
Workflow:
1. validate feedback
2. persist original feedback
3. invoke Claude
4. validate Claude result with Zod
5. persist classification/themes
6. expose processing/error status

If Claude fails, preserve the original feedback and expose a retryable failure.

## 12. Embeddings
Implement an embedding service behind an interface so the embedding implementation can be changed without rewriting retrieval logic.

Store model and vector metadata. Always enforce workspace filtering before returning candidates.

## 13. Ask LOOP
Workflow:
1. authenticate
2. authorize workspace
3. validate question
4. retrieve relevant feedback
5. enforce tenant filtering
6. construct bounded evidence
7. call Claude
8. validate response
9. return answer + citations
10. return insufficient evidence when appropriate

Customer feedback is data, not instructions. Treat prompt injection inside feedback as untrusted content.

## 14. Voice-of-Customer Reports
Calculate all numerical facts in application/database logic.

Send verified statistics to Claude for narrative generation.

Persist:
- reporting period
- factual statistics
- narrative
- workspace
- timestamps

## 15. Frontend Order
Implement:
1. application shell
2. authentication screens
3. dashboard
4. feedback inbox
5. feedback detail
6. themes
7. Ask LOOP
8. reports
9. workspace/settings
10. role-specific controls
11. loading/error/empty states
12. responsive/accessibility refinement

## 16. Performance
Before declaring completion:
- inspect slow database queries
- verify indexes
- remove N+1 queries
- paginate large lists
- bound vector retrieval
- bound Claude context
- minimize client JavaScript
- lazy-load expensive UI
- avoid unnecessary API requests
- cache only safe data

## 17. Security Verification
Test:
- authentication bypass
- RBAC bypass
- cross-tenant access
- direct object references
- prompt injection in feedback
- malicious CSV content
- oversized requests
- malformed JSON
- invalid AI output
- provider failure
- secret exposure
- unsafe error messages

## 18. Testing
Provide unit/integration tests for:
- authorization
- tenant isolation
- Zod validation
- feedback service
- analytics calculations
- AI output validation
- retrieval filtering
- Ask LOOP grounding/citations
- report statistics
- API error contracts

Use the mock AI provider for deterministic automated tests.

## 19. Quality Gates
Before deployment:
- install succeeds from a clean checkout
- Prisma generation succeeds
- migrations succeed
- seed succeeds
- type-check passes
- lint passes
- tests pass
- production build passes

## 20. Deployment
Target architecture:
GitHub → Vercel → Next.js → Neon/Supabase PostgreSQL
                                   ↘ Anthropic Claude API

Configure production environment variables in Vercel.

Verify:
- authentication
- database connectivity
- feedback CRUD
- Claude classification
- Ask LOOP
- reports
- tenant isolation
- responsive UI

## 21. Coding-Agent Workflow
For each implementation stage:
1. Plan
2. Inspect existing files
3. Implement
4. Install required dependencies automatically
5. Run tests/type-check/lint
6. Inspect failures
7. Fix
8. Re-run validation
9. Continue

Do not rewrite working sections unnecessarily.

## 22. Dependency Rules
Use maintained, justified dependencies. Avoid duplicate libraries that solve the same problem. Keep the dependency tree small.

## 23. Cross-Platform Requirement
Development and scripts should work on Windows and Linux, including Ubuntu-based distributions such as Ubuntu, Linux Mint, and Pop!_OS where practical.

Avoid shell commands or filesystem assumptions that only work on one operating system.

## 24. Git Strategy
Use meaningful commits around coherent milestones:
- project setup
- database/auth
- backend
- AI
- frontend
- testing
- deployment

Never commit `.env.local`, API keys, credentials, or generated secrets.

## 25. Final Submission Checklist
- [ ] Next.js application runs
- [ ] Authentication works
- [ ] ADMIN/ANALYST/VIEWER permissions work
- [ ] Tenant isolation verified
- [ ] PostgreSQL/Prisma schema works
- [ ] 120+ seed records exist
- [ ] Feedback CRUD works
- [ ] CSV import works
- [ ] Claude classification works
- [ ] Themes work
- [ ] Analytics work
- [ ] Ask LOOP is grounded and cites evidence
- [ ] VoC reports work
- [ ] Responsive UI works
- [ ] Accessibility checks completed
- [ ] Error/loading/empty states implemented
- [ ] Tests pass
- [ ] Lint passes
- [ ] Type-check passes
- [ ] Production build passes
- [ ] Vercel deployment verified

## 26. Definition of Done
Project LOOP is complete only when the full customer-feedback workflow works end-to-end:

Feedback ingestion
→ secure storage
→ Claude classification
→ themes/sentiment
→ deterministic analytics
→ semantic retrieval
→ grounded Ask LOOP
→ Voice-of-Customer report
→ responsive role-aware SaaS interface
→ tested production deployment.
