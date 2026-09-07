import { ensureWorkspace } from './helpers';
import { simulateIngestion } from '../services/simulateService';
import { describe, it, expect } from 'vitest';

const ws = 'sim-ws';

describe('Simulated Ingestion Service', () => {
  beforeAll(async () => {
    await ensureWorkspace(ws);
  });

  it('creates feedback with SIMULATED channel', async () => {
    const fb = await simulateIngestion(ws, { text: 'simulated feed' });
    expect(fb.channel).toBe('SIMULATED');
    expect(fb.text).toBe('simulated feed');
  });
});
