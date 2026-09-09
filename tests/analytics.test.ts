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
    
    // Actionable feedback should be 0 because it's explicitly unresolved
    expect(summary.actionableFeedback).toBe(0);

    expect(summary.volumeOverTime).toBeDefined();
    expect(summary.sentimentOverTime).toBeDefined();
  });
});
