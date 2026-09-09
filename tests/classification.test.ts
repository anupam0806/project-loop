import { describe, it, expect, beforeEach } from 'vitest';
import { classifyAndAssignThemes } from '../services/ai/classificationService';
import { getFeedbackStore, resetStores, getThemeStore } from './__mocks__/prisma';
import { prisma } from '../lib/db';

describe('Classification Service', () => {
  beforeEach(() => {
    resetStores();
  });

  it('classifies feedback and creates themes successfully', async () => {
    const feedbackStore = getFeedbackStore();
    feedbackStore.push({ id: 'fb-1', workspaceId: 'ws-1', text: 'I love this product', status: 'NEW' });

    await classifyAndAssignThemes('ws-1', 'fb-1', 'I love this product');

    const updated = feedbackStore.find(f => f.id === 'fb-1');
    expect(updated.sentiment).toBe('POSITIVE');
    expect(updated.sentimentScore).toBe(0.8);
    expect(updated.category).toBe('General');
    expect(updated.classificationModel).toBe('mock');

    const themeStore = getThemeStore();
    expect(themeStore.length).toBe(1);
    expect(themeStore[0].name).toBe('Mock Theme');
  });

  it('bubbles up classification failures correctly', async () => {
    const feedbackStore = getFeedbackStore();
    feedbackStore.push({ id: 'fb-2', workspaceId: 'ws-1', text: 'FAIL_CLASSIFICATION', status: 'NEW' });

    await expect(classifyAndAssignThemes('ws-1', 'fb-2', 'FAIL_CLASSIFICATION')).rejects.toThrow('Simulated classification failure');
  });
});
