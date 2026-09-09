import { describe, it, expect, beforeEach, vi } from 'vitest';
import { generateReport, listReports, getReportById } from '../services/reportService';
import { MockAIProvider } from '../services/ai/mockAIProvider';
import { resetStores, mockPrisma } from './__mocks__/prisma';
import { AppError } from '../utils/AppError';

describe('VoC Report Backend Service', () => {
  const ws1 = 'ws-report-1';
  const ws2 = 'ws-report-2';

  beforeEach(() => {
    resetStores();
    vi.clearAllMocks();
  });

  it('calculates deterministic statistics and persists report', async () => {
    // Seed 4 feedback items in ws1
    const baseDate = new Date('2026-08-15T12:00:00Z');
    await mockPrisma.feedback.create({
      data: {
        workspaceId: ws1,
        text: 'The checkout flow is extremely smooth and fast.',
        channel: 'APP_REVIEW',
        sentiment: 'POSITIVE',
        createdAt: baseDate,
      },
    });
    await mockPrisma.feedback.create({
      data: {
        workspaceId: ws1,
        text: 'I really love the clean interface and simplicity.',
        channel: 'SURVEY',
        sentiment: 'POSITIVE',
        createdAt: baseDate,
      },
    });
    await mockPrisma.feedback.create({
      data: {
        workspaceId: ws1,
        text: 'The application crashes on file upload every single time.',
        channel: 'SUPPORT',
        sentiment: 'NEGATIVE',
        createdAt: baseDate,
      },
    });
    await mockPrisma.feedback.create({
      data: {
        workspaceId: ws1,
        text: 'Pricing plans are okay, but feature tiers are confusing.',
        channel: 'SALES',
        sentiment: 'NEUTRAL',
        createdAt: baseDate,
      },
    });

    const report = await generateReport(
      ws1,
      {
        period: { from: '2026-08-01', to: '2026-08-31' },
        title: 'August 2026 VoC Report',
      },
      new MockAIProvider()
    );

    // Verify deterministic stats
    expect(report.stats.totalFeedback).toBe(4);
    expect(report.stats.positiveCount).toBe(2);
    expect(report.stats.negativeCount).toBe(1);
    expect(report.stats.neutralCount).toBe(1);
    expect(report.stats.positivePercentage).toBe(50);
    expect(report.stats.negativePercentage).toBe(25);
    expect(report.stats.channelCounts.SUPPORT).toBe(1);
    expect(report.stats.channelCounts.APP_REVIEW).toBe(1);

    // Verify Claude narrative was generated and attached
    expect(report.narrative.summary).toBeDefined();
    expect(report.narrative.keyThemes).toBeDefined();
    expect(report.narrative.recommendations.length).toBeGreaterThan(0);

    // Verify report was persisted
    const stored = await getReportById(ws1, report.id);
    expect(stored).not.toBeNull();
    expect(stored?.id).toBe(report.id);
    expect(stored?.title).toBe('August 2026 VoC Report');
    expect(stored?.stats.totalFeedback).toBe(4);
  });

  it('rejects unsupported or hallucinated quotes from AI narrative', async () => {
    await mockPrisma.feedback.create({
      data: {
        workspaceId: ws1,
        text: 'Great dashboard speed.',
        channel: 'SURVEY',
        sentiment: 'POSITIVE',
        createdAt: new Date('2026-08-10'),
      },
    });

    // MockAIProvider triggers fabricated quote when title contains HALLUCINATE_QUOTE
    const report = await generateReport(
      ws1,
      {
        title: 'Report with HALLUCINATE_QUOTE',
        period: { from: '2026-08-01', to: '2026-08-31' },
      },
      new MockAIProvider()
    );


    // Fabricated quotes with fake IDs must be stripped by service
    expect(report.narrative.quotes.find(q => q.feedbackId === 'fabricated-id-999')).toBeUndefined();
  });

  it('retrieves stored report without regenerating it', async () => {
    const reportRecord = await mockPrisma.report.create({
      data: {
        workspaceId: ws1,
        title: 'Archived May Report',
        periodStart: new Date('2026-05-01'),
        periodEnd: new Date('2026-05-31'),
        content: JSON.stringify({
          stats: { totalFeedback: 10, positiveCount: 8, negativeCount: 2, positivePercentage: 80, negativePercentage: 20 },
          narrative: { summary: 'Historical static summary', keyThemes: [], sentimentTrends: 'Stable', recommendations: [], quotes: [] },
        }),
      },
    });

    const stored = await getReportById(ws1, reportRecord.id);
    expect(stored?.title).toBe('Archived May Report');
    expect(stored?.stats.totalFeedback).toBe(10);
    expect(stored?.narrative.summary).toBe('Historical static summary');
  });

  it('enforces workspace isolation: Workspace A cannot read Workspace B report', async () => {
    const reportRecord = await mockPrisma.report.create({
      data: {
        workspaceId: ws1,
        title: 'Workspace 1 Confidential Report',
        periodStart: new Date('2026-07-01'),
        periodEnd: new Date('2026-07-31'),
        content: JSON.stringify({
          stats: { totalFeedback: 5 },
          narrative: { summary: 'Secret summary' },
        }),
      },
    });

    // Attempt to access with ws2
    const forbiddenRead = await getReportById(ws2, reportRecord.id);
    expect(forbiddenRead).toBeNull();

    // Listing reports in ws2 should not return ws1's report
    const ws2Reports = await listReports(ws2);
    expect(ws2Reports.find(r => r.id === reportRecord.id)).toBeUndefined();
  });

  it('validates report period parameters', async () => {
    await expect(
      generateReport(ws1, { period: { from: '2026-08-31', to: '2026-08-01' } }, new MockAIProvider())
    ).rejects.toThrow('Start date cannot be after end date');
  });
});
