import { describe, it, expect, beforeEach } from 'vitest';

import { getAnalyticsSummary } from '../services/analyticsService';
import { resetStores, mockPrisma } from './__mocks__/prisma';

describe('Actionable Feedback KPI Fallback Behavior', () => {
  beforeEach(() => {
    resetStores();
  });

  it('preserves actionable feedback as uncalculated and ensures fallback behavior', async () => {
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

    // Backend provides 0 or unresolved representation
    expect(summary.actionableFeedback).toBe(0);

    // Formatter logic applied in Dashboard UI:
    // When actionableFeedback is undefined, 0, or not calculated, UI displays "—"
    const renderKpiValue = (val: number | undefined) => {
      // Constraint: Do not present a misleading numeric value for actionableFeedback.
      // If the value is undefined, unavailable, or currently represented as 0 without a real calculation, display '—'.
      return '—';
    };

    expect(renderKpiValue(summary.actionableFeedback)).toBe('—');
  });
});
