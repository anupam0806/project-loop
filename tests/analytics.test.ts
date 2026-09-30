import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getAnalyticsSummary } from '../services/analyticsService';
import { getFeedbackStore, resetStores, getThemeStore } from './__mocks__/prisma';

describe('Analytics Service', () => {
  beforeEach(() => {
    resetStores();
  });

  it('calculates deterministic analytics correctly', async () => {
    const feedbackStore = getFeedbackStore();
    feedbackStore.push(
      { id: '1', workspaceId: 'ws-1', sentiment: 'POSITIVE', status: 'NEW', createdAt: new Date() },
      { id: '2', workspaceId: 'ws-1', sentiment: 'POSITIVE', status: 'REVIEWED', createdAt: new Date() },
      { id: '3', workspaceId: 'ws-1', sentiment: 'NEGATIVE', status: 'NEW', createdAt: new Date() },
      { id: '4', workspaceId: 'ws-2', sentiment: 'NEGATIVE', status: 'NEW', createdAt: new Date() } // isolation test
    );

    const themeStore = getThemeStore();
    themeStore.push({ id: 't1', workspaceId: 'ws-1', name: 'Theme 1', _count: { feedbacks: 2 } });

    const summary = await getAnalyticsSummary('ws-1');

    expect(summary.totalFeedback).toBe(3);
    // Positive 2 out of 3 = 66.6%, Negative 1 out of 3 = 33.3%
    expect(summary.positivePercentage).toBeCloseTo(66.66, 1);
    expect(summary.negativePercentage).toBeCloseTo(33.33, 1);
    
    // Actionable feedback: items with status in ['NEW', 'REVIEWED'] in ws-1
    expect(summary.actionableFeedback).toBe(3);

    expect(summary.volumeOverTime).toBeDefined();
    expect(summary.sentimentOverTime).toBeDefined();
  });

  it('computes actionableFeedback correctly with status filtering, date range, and workspace isolation', async () => {
    const feedbackStore = getFeedbackStore();
    const now = new Date();
    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);

    feedbackStore.push(
      // Actionable items within recent window
      { id: 'a1', workspaceId: 'ws-test', status: 'NEW', createdAt: twoDaysAgo },
      { id: 'a2', workspaceId: 'ws-test', status: 'REVIEWED', createdAt: twoDaysAgo },
      // Non-actionable items within recent window
      { id: 'na1', workspaceId: 'ws-test', status: 'ACTIONED', createdAt: twoDaysAgo },
      { id: 'na2', workspaceId: 'ws-test', status: 'RESOLVED', createdAt: twoDaysAgo },
      // Actionable item older than 7 days
      { id: 'old1', workspaceId: 'ws-test', status: 'NEW', createdAt: tenDaysAgo },
      // Different workspace (should be isolated)
      { id: 'other1', workspaceId: 'ws-other', status: 'NEW', createdAt: twoDaysAgo }
    );

    // All-time query (no days parameter)
    const summaryAll = await getAnalyticsSummary('ws-test');
    expect(summaryAll.totalFeedback).toBe(5);
    // a1 (NEW), a2 (REVIEWED), old1 (NEW) = 3
    expect(summaryAll.actionableFeedback).toBe(3);

    // 7-day query
    const summary7d = await getAnalyticsSummary('ws-test', 7);
    expect(summary7d.totalFeedback).toBe(4);
    // a1 (NEW), a2 (REVIEWED) = 2 (old1 excluded)
    expect(summary7d.actionableFeedback).toBe(2);

    // Workspace with zero actionable items
    feedbackStore.length = 0;
    feedbackStore.push(
      { id: 'z1', workspaceId: 'ws-zero', status: 'ACTIONED', createdAt: now },
      { id: 'z2', workspaceId: 'ws-zero', status: 'RESOLVED', createdAt: now }
    );
    const summaryZero = await getAnalyticsSummary('ws-zero');
    expect(summaryZero.totalFeedback).toBe(2);
    expect(summaryZero.actionableFeedback).toBe(0);
  });
});
