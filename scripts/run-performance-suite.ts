import { PrismaClient } from '@prisma/client';
import { generateEmbedding } from '../services/ai/embeddingService';

const prisma = new PrismaClient();

interface MetricResult {
  operation: string;
  category: 'DATABASE' | 'API_HTTP' | 'VECTOR_RAG' | 'PAGE_NAVIGATION';
  samples: number;
  minMs: number;
  maxMs: number;
  avgMs: number;
  p95Ms: number;
}

function calcStats(operation: string, category: MetricResult['category'], times: number[]): MetricResult {
  times.sort((a, b) => a - b);
  const minMs = Math.round(times[0] * 100) / 100;
  const maxMs = Math.round(times[times.length - 1] * 100) / 100;
  const avgMs = Math.round((times.reduce((a, b) => a + b, 0) / times.length) * 100) / 100;
  const p95Idx = Math.floor(times.length * 0.95);
  const p95Ms = Math.round(times[Math.min(p95Idx, times.length - 1)] * 100) / 100;

  return { operation, category, samples: times.length, minMs, maxMs, avgMs, p95Ms };
}

async function runDbBenchmarks(workspaceId: string): Promise<MetricResult[]> {
  console.log('--- 1. Running Database Benchmarks (Neon PostgreSQL) ---');
  const results: MetricResult[] = [];
  const ITERS = 5;

  // 1.1 Connection Ping
  const pingTimes: number[] = [];
  for (let i = 0; i < ITERS; i++) {
    const t0 = performance.now();
    await prisma.$queryRaw`SELECT 1;`;
    pingTimes.push(performance.now() - t0);
  }
  results.push(calcStats('DB Roundtrip (SELECT 1)', 'DATABASE', pingTimes));

  // 1.2 Feedback Paginated Read (15 records + themes join)
  const feedTimes: number[] = [];
  for (let i = 0; i < ITERS; i++) {
    const t0 = performance.now();
    await prisma.feedback.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
      take: 15,
      include: { themes: { include: { theme: true } } },
    });
    feedTimes.push(performance.now() - t0);
  }
  results.push(calcStats('Feedback List (15 items + themes join)', 'DATABASE', feedTimes));

  // 1.3 Feedback Filtered Read
  const filterTimes: number[] = [];
  for (let i = 0; i < ITERS; i++) {
    const t0 = performance.now();
    await prisma.feedback.findMany({
      where: {
        workspaceId,
        channel: 'SUPPORT',
        status: 'NEW',
      },
      take: 15,
      orderBy: { createdAt: 'desc' },
    });
    filterTimes.push(performance.now() - t0);
  }
  results.push(calcStats('Feedback Filtered (channel=SUPPORT, status=NEW)', 'DATABASE', filterTimes));

  // 1.4 Single Feedback Detail
  const sampleFb = await prisma.feedback.findFirst({ where: { workspaceId } });
  if (sampleFb) {
    const detailTimes: number[] = [];
    for (let i = 0; i < ITERS; i++) {
      const t0 = performance.now();
      await prisma.feedback.findUnique({
        where: { id: sampleFb.id },
        include: { themes: { include: { theme: true } } },
      });
      detailTimes.push(performance.now() - t0);
    }
    results.push(calcStats('Feedback Detail by ID (with relations)', 'DATABASE', detailTimes));
  }

  // 1.5 30-Day Aggregations (GROUP BY DATE("createdAt"))
  const aggTimes: number[] = [];
  for (let i = 0; i < ITERS; i++) {
    const t0 = performance.now();
    await prisma.$queryRaw`
      SELECT DATE("createdAt") as date, COUNT(*) as count
      FROM "Feedback"
      WHERE "workspaceId" = ${workspaceId}
      GROUP BY DATE("createdAt")
      ORDER BY date ASC
      LIMIT 30;
    `;
    aggTimes.push(performance.now() - t0);
  }
  results.push(calcStats('30-Day Volume Aggregation (DATE grouping)', 'DATABASE', aggTimes));

  // 1.6 Sentiment Breakdown Aggregation
  const sentTimes: number[] = [];
  for (let i = 0; i < ITERS; i++) {
    const t0 = performance.now();
    await prisma.feedback.groupBy({
      by: ['sentiment'],
      where: { workspaceId, sentiment: { not: null } },
      _count: { id: true },
    });
    sentTimes.push(performance.now() - t0);
  }
  results.push(calcStats('Sentiment Distribution Aggregation', 'DATABASE', sentTimes));

  // 1.7 Themes List with Aggregated Feedback Counts
  const themeTimes: number[] = [];
  for (let i = 0; i < ITERS; i++) {
    const t0 = performance.now();
    await prisma.theme.findMany({
      where: { workspaceId },
      include: {
        _count: { select: { feedbacks: true } },
      },
      orderBy: { name: 'asc' },
    });
    themeTimes.push(performance.now() - t0);
  }
  results.push(calcStats('Themes List with Feedback Counts', 'DATABASE', themeTimes));

  // 1.8 Vector Similarity Cosine Search (pgvector <=> operator)
  const testVector = await generateEmbedding('checkout performance and usability issues');
  const vectorString = `[${testVector.join(',')}]`;
  const vecTimes: number[] = [];
  for (let i = 0; i < ITERS; i++) {
    const t0 = performance.now();
    await prisma.$queryRaw`
      SELECT f.id, f.text, f.sentiment, f.channel, 1 - (e.vector <=> CAST(${vectorString} AS vector)) as similarity
      FROM "Embedding" e
      JOIN "Feedback" f ON e."feedbackId" = f.id
      WHERE e."workspaceId" = ${workspaceId}
      ORDER BY e.vector <=> CAST(${vectorString} AS vector) ASC
      LIMIT 5;
    `;
    vecTimes.push(performance.now() - t0);
  }
  results.push(calcStats('pgvector Top 5 Cosine Search (<=> operator)', 'VECTOR_RAG', vecTimes));

  return results;
}

async function main() {
  const ws = await prisma.workspace.findFirst({ where: { name: 'Project LOOP Demo' } })
    || await prisma.workspace.findFirst();

  if (!ws) {
    console.error('No workspace found for benchmarking.');
    process.exit(1);
  }

  console.log(`Executing Performance Measurements for Workspace: ${ws.name} (${ws.id})`);
  const dbMetrics = await runDbBenchmarks(ws.id);

  console.log('\n========================================================================');
  console.log('                 PROJECT LOOP EMPIRICAL PERFORMANCE DATA                ');
  console.log('========================================================================');
  console.table(
    dbMetrics.map((m) => ({
      Category: m.category,
      Operation: m.operation,
      'Avg (ms)': m.avgMs,
      'Min (ms)': m.minMs,
      'P95 (ms)': m.p95Ms,
      'Max (ms)': m.maxMs,
      Samples: m.samples,
    }))
  );

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
