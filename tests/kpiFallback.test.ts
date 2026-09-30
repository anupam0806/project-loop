import { describe, it, expect, beforeEach } from 'vitest';

import { getAnalyticsSummary } from '../services/analyticsService';
import { resetStores, mockPrisma } from './__mocks__/prisma';

describe('Actionable Feedback KPI Fallback Behavior', () => {
  beforeEach(() => {
    resetStores();
  });

  it('computes actionable feedback and verifies UI formatting rules', async () => {
    const ws = 'ws-kpi-test';
    await mockPrisma.feedback.create({
      data: {
        workspaceId: ws,
        text: 'Actionable bug report',
        channel: 'SUPPORT',
        sentiment: 'NEGATIVE',
        status: 'NEW',
      },
    });

    const summary = await getAnalyticsSummary(ws);

    // Backend provides real count for NEW / REVIEWED status
    expect(summary.actionableFeedback).toBe(1);

    // Formatter logic applied in Dashboard UI:
    // If actionableFeedback is a number, always show it (including 0)
    // Only show "—" / "Not calculated" if null/undefined
    const renderKpi = (val: number | null | undefined) => {
      const displayValue = typeof val === 'number' ? val.toLocaleString() : '—';
      const subtitle = typeof val === 'number' ? 'Items needing review' : 'Not calculated';
      return { displayValue, subtitle };
    };

    // When calculated with count = 1
    expect(renderKpi(summary.actionableFeedback)).toEqual({
      displayValue: '1',
      subtitle: 'Items needing review',
    });

    // When calculated with count = 0
    expect(renderKpi(0)).toEqual({
      displayValue: '0',
      subtitle: 'Items needing review',
    });

    // When null or undefined
    expect(renderKpi(undefined)).toEqual({
      displayValue: '—',
      subtitle: 'Not calculated',
    });
    expect(renderKpi(null)).toEqual({
      displayValue: '—',
      subtitle: 'Not calculated',
    });
  });
});
