# Project LOOP — Measured Performance Report

**Date**: September 12, 2026  
**Environment**: Local Node.js v24.19.0 / Windows 11 AMD64 / Next.js 14.2.12 (Production Server)  
**Database**: Neon PostgreSQL (AWS `ap-southeast-1` pooled endpoint with pgvector extension)  
**Dataset**: 850 total feedback records, 160 active demo records, 8 themes, 3 demo roles  
**Browser Engine**: Headless Chromium (Google Chrome 152.0.7977.83) via Playwright 1.63.0  

---

## 1. Executive Summary

Empirical testing confirms that Project LOOP operates well within real-world performance budgets:
- **Browser Route Navigation (DOM Content Loaded)**: **26.1 ms to 67.3 ms** across all key routes.
- **Client Route Load Time**: **26.4 ms to 67.7 ms** for fully hydrated UI views.
- **Database Roundtrip & Point Lookups**: **~74 ms to 97 ms** network roundtrip to remote Neon PostgreSQL.
- **pgvector Cosine Distance Similarity Search (Top 5)**: **141.40 ms average** (80 ms query execution time + vector network roundtrip).
- **Batch Aggregations (30-Day Volume & Sentiment Grouping)**: **92 ms to 95 ms**.
- **First Load Client JavaScript**: **87.1 kB shared**; individual page bundles range between **1.95 kB and 5.53 kB**.

No artificial optimizations or speculative rewrites were performed; genuine bottlenecks were audited and verified.

---

## 2. Browser Navigation & Web Vitals Timings

Measurements recorded using Playwright 1.63.0 against local Next.js production build (`next start -p 3000`):

| Route | View Description | DOM Content Loaded (ms) | Full Page Load (ms) | Status |
| :--- | :--- | :--- | :--- | :--- |
| `/dashboard` | Main executive analytics with 3 native SVG charts | **67.3 ms** | **67.7 ms** | Excellent (<100ms) |
| `/feedback` | Searchable customer feedback inbox with pagination | **29.0 ms** | **29.3 ms** | Excellent (<50ms) |
| `/ask` | Ask LOOP interactive grounded AI Q&A interface | **30.3 ms** | **30.7 ms** | Excellent (<50ms) |
| `/reports` | Voice of Customer executive reports archive | **28.4 ms** | **29.0 ms** | Excellent (<50ms) |
| `/settings` | Workspace profile and team RBAC roster | **26.1 ms** | **26.4 ms** | Excellent (<50ms) |

---

## 3. Neon PostgreSQL Database Query Latencies

Measured directly over 5-iteration warm benchmarks against the remote Neon PostgreSQL instance in `ap-southeast-1`:

| Operation | Query Type / Details | Min (ms) | Avg (ms) | P95 (ms) | Max (ms) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Connection Ping** | `SELECT 1;` roundtrip | 74.66 | **90.84** | 152.01 | 152.01 |
| **Filtered Feedback** | Filtered by `channel=SUPPORT` and `status=NEW` (15 items) | 76.64 | **97.02** | 175.86 | 175.86 |
| **30-Day Volume Aggregation** | `GROUP BY DATE("createdAt")` raw query | 74.72 | **95.02** | 161.49 | 161.49 |
| **Sentiment Breakdown** | `groupBy` on `sentiment` column | 76.05 | **92.74** | 154.73 | 154.73 |
| **Themes with Feedback Count** | `findMany` with relation `_count` | 76.21 | **93.57** | 161.26 | 161.26 |
| **pgvector Cosine Search** | Vector `<=>` operator (Top 5 nearest neighbors) | 79.74 | **141.40** | 385.59 | 385.59 |
| **Feedback List (with Joins)** | 15 items with nested `themes` join | 151.91 | **185.52** | 314.80 | 314.80 |
| **Feedback Detail by ID** | Single item lookup with themes and metadata | 150.33 | **183.80** | 308.36 | 308.36 |

*Note: The baseline latency floor is dictated by Singapore (`ap-southeast-1`) network ping from local execution (~75ms).*

---

## 4. Architecture & Resource Bounds Audit

### A. Database Indexes
- Composite index `@@index([workspaceId, createdAt])` optimizes timeline filtering and pagination.
- Composite index `@@index([workspaceId, status, createdAt])` and `@@index([workspaceId, channel, createdAt])` eliminate full table scans during inbox filtering.
- Multi-column index `@@index([workspaceId, name])` accelerates theme taxonomy queries.
- Composite index `@@index([workspaceId, feedbackId])` supports embedding lookups.
- Foreign keys and join indices `@@index([themeId, feedbackId])` prevent unindexed join table lookups.

### B. Query Bounds & Pagination
- All feedback queries enforce strict pagination (`pageSize` defaults to 15, maximum clamped to 50 in API layer).
- CSV imports enforce an unyielding limit of 1,000 rows per upload to protect server memory.
- Analytics aggregations restrict volume queries to `LIMIT 30` (30 days) and sentiment over time to `LIMIT 120`.

### C. Vector Retrieval & AI Context Bounds
- Similarity queries are strictly bound to `LIMIT 5` with a cosine distance threshold cutoff (`<= 0.65`).
- Ask LOOP context is constrained: evidence items are bounded to a maximum of 500 characters each.
- Full customer prompts are bounded to 4,000 characters before delivery to AI models, preventing token exhaustion.

### D. Client-Side JavaScript Footprint
- Next.js production bundle output:
  - Shared initial JS: **87.1 kB** (gzip-equivalent ~26 kB)
  - `/dashboard`: **4.12 kB** (Total first load: 111 kB)
  - `/feedback`: **5.53 kB** (Total first load: 112 kB)
  - `/ask`: **1.95 kB** (Total first load: 109 kB)
  - `/reports`: **3.82 kB** (Total first load: 111 kB)
  - `/settings`: **4.17 kB** (Total first load: 111 kB)
- Charting Work: Zero external heavy charting libraries (e.g. Chart.js, Recharts) loaded. All 3 visual charts are rendered as lightweight, accessible SVG elements natively in React.
