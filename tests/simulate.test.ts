/**
 * Simulated Ingestion Service Tests
 * Covers: success, SIMULATED channel, validation, workspace isolation
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { mockPrisma, resetStores, getFeedbackStore } from './__mocks__/prisma';
import { simulateIngestion } from '../services/simulateService';

beforeEach(() => {
  resetStores();
});

describe('Simulated Ingestion Service', () => {
  const ws = 'sim-ws';

  it('creates feedback successfully', async () => {
    const fb = await simulateIngestion(ws, { text: 'Simulated feedback text' });
    expect(fb).toHaveProperty('id');
    expect(fb.text).toBe('Simulated feedback text');
  });

  it('always uses SIMULATED channel', async () => {
    const fb = await simulateIngestion(ws, { text: 'Channel test' });
    expect(fb.channel).toBe('SIMULATED');
  });

  it('accepts optional featureArea', async () => {
    const fb = await simulateIngestion(ws, { text: 'Feature area test', featureArea: 'checkout' });
    expect(fb).toHaveProperty('id');
  });

  it('rejects empty text', async () => {
    await expect(simulateIngestion(ws, { text: '' })).rejects.toThrow('VALIDATION_ERROR');
  });

  it('rejects missing text', async () => {
    await expect(simulateIngestion(ws, {})).rejects.toThrow('VALIDATION_ERROR');
  });

  it('assigns feedback to the correct workspace', async () => {
    await simulateIngestion(ws, { text: 'Workspace check' });
    const store = getFeedbackStore();
    const fb = store.find((f: any) => f.text === 'Workspace check');
    expect(fb).toBeDefined();
    expect(fb.workspaceId).toBe(ws);
  });

  it('respects workspace isolation', async () => {
    const wsA = 'sim-a';
    const wsB = 'sim-b';
    await simulateIngestion(wsA, { text: 'A simulated' });
    await simulateIngestion(wsB, { text: 'B simulated' });

    const store = getFeedbackStore();
    const aFeedback = store.filter((f: any) => f.workspaceId === wsA);
    const bFeedback = store.filter((f: any) => f.workspaceId === wsB);

    expect(aFeedback.length).toBe(1);
    expect(bFeedback.length).toBe(1);
    expect(aFeedback[0].text).toBe('A simulated');
    expect(bFeedback[0].text).toBe('B simulated');
  });

  it('all simulated feedback has SIMULATED channel', async () => {
    await simulateIngestion(ws, { text: 'First' });
    await simulateIngestion(ws, { text: 'Second' });
    await simulateIngestion(ws, { text: 'Third' });

    const store = getFeedbackStore();
    const simFeedback = store.filter((f: any) => f.workspaceId === ws);
    expect(simFeedback.every((f: any) => f.channel === 'SIMULATED')).toBe(true);
  });
});
