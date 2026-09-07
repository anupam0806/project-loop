/**
 * Comprehensive Feedback Service Tests
 * Covers: CRUD, status transitions (valid/invalid), tenant isolation, error handling
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { mockPrisma, resetStores } from './__mocks__/prisma';
import { createFeedback, listFeedback, getFeedback, updateFeedback, deleteFeedback } from '../services/feedbackService';

beforeEach(() => {
  resetStores();
});

describe('Feedback CRUD', () => {
  const wsA = 'workspace-a';
  const wsB = 'workspace-b';

  describe('createFeedback', () => {
    it('creates feedback with valid input', async () => {
      const fb = await createFeedback(wsA, { text: 'Great product', channel: 'SUPPORT', featureArea: 'checkout' });
      expect(fb).toHaveProperty('id');
      expect(fb.text).toBe('Great product');
      expect(fb.channel).toBe('SUPPORT');
    });

    it('rejects empty text', async () => {
      await expect(createFeedback(wsA, { text: '', channel: 'SUPPORT' })).rejects.toThrow('VALIDATION_ERROR');
    });

    it('rejects invalid channel', async () => {
      await expect(createFeedback(wsA, { text: 'Test', channel: 'INVALID' })).rejects.toThrow('VALIDATION_ERROR');
    });

    it('rejects missing text field', async () => {
      await expect(createFeedback(wsA, { channel: 'SUPPORT' })).rejects.toThrow('VALIDATION_ERROR');
    });

    it('rejects missing channel field', async () => {
      await expect(createFeedback(wsA, { text: 'Test' })).rejects.toThrow('VALIDATION_ERROR');
    });

    it('accepts all valid channels', async () => {
      const channels = ['SUPPORT', 'APP_REVIEW', 'SURVEY', 'SALES', 'SOCIAL', 'SIMULATED'];
      for (const channel of channels) {
        const fb = await createFeedback(wsA, { text: `Test ${channel}`, channel });
        expect(fb.channel).toBe(channel);
      }
    });

    it('assigns workspace correctly', async () => {
      const fb = await createFeedback(wsA, { text: 'Scoped', channel: 'SUPPORT' });
      // Verify the underlying store has the right workspace
      const store = (await import('./__mocks__/prisma')).getFeedbackStore();
      const created = store.find((f: any) => f.id === fb.id);
      expect(created.workspaceId).toBe(wsA);
    });
  });

  describe('listFeedback', () => {
    it('lists feedback with pagination', async () => {
      await createFeedback(wsA, { text: 'Item 1', channel: 'SUPPORT' });
      await createFeedback(wsA, { text: 'Item 2', channel: 'APP_REVIEW' });
      await createFeedback(wsA, { text: 'Item 3', channel: 'SURVEY' });

      const result = await listFeedback({ workspaceId: wsA, page: 1, pageSize: 2 });
      expect(result.data.length).toBeLessThanOrEqual(2);
      expect(result.meta.total).toBe(3);
      expect(result.meta.totalPages).toBe(2);
      expect(result.meta.page).toBe(1);
      expect(result.meta.pageSize).toBe(2);
    });

    it('filters by channel', async () => {
      await createFeedback(wsA, { text: 'Support item', channel: 'SUPPORT' });
      await createFeedback(wsA, { text: 'Survey item', channel: 'SURVEY' });

      const result = await listFeedback({ workspaceId: wsA, page: 1, pageSize: 25, channel: 'SUPPORT' });
      expect(result.data.length).toBe(1);
      expect(result.data[0].channel).toBe('SUPPORT');
    });

    it('filters by status', async () => {
      await createFeedback(wsA, { text: 'New item', channel: 'SUPPORT' });
      const result = await listFeedback({ workspaceId: wsA, page: 1, pageSize: 25, status: 'NEW' });
      expect(result.data.length).toBe(1);
    });

    it('searches by text (q parameter)', async () => {
      await createFeedback(wsA, { text: 'Checkout is slow', channel: 'SUPPORT' });
      await createFeedback(wsA, { text: 'Login is fine', channel: 'SUPPORT' });

      const result = await listFeedback({ workspaceId: wsA, page: 1, pageSize: 25, q: 'checkout' });
      expect(result.data.length).toBe(1);
      expect(result.data[0].text).toBe('Checkout is slow');
    });

    it('only returns feedback from requested workspace', async () => {
      await createFeedback(wsA, { text: 'A item', channel: 'SUPPORT' });
      await createFeedback(wsB, { text: 'B item', channel: 'SUPPORT' });

      const resultA = await listFeedback({ workspaceId: wsA, page: 1, pageSize: 25 });
      const resultB = await listFeedback({ workspaceId: wsB, page: 1, pageSize: 25 });
      expect(resultA.meta.total).toBe(1);
      expect(resultB.meta.total).toBe(1);
      expect(resultA.data[0].text).toBe('A item');
      expect(resultB.data[0].text).toBe('B item');
    });
  });

  describe('getFeedback', () => {
    it('returns feedback by ID within workspace', async () => {
      const fb = await createFeedback(wsA, { text: 'Detail test', channel: 'APP_REVIEW', featureArea: 'api' });
      const fetched = await getFeedback(wsA, fb.id);
      expect(fetched).not.toBeNull();
      expect(fetched!.text).toBe('Detail test');
    });

    it('returns null for non-existent ID', async () => {
      const fetched = await getFeedback(wsA, 'nonexistent-id');
      expect(fetched).toBeNull();
    });
  });

  describe('updateFeedback', () => {
    it('updates text field', async () => {
      const fb = await createFeedback(wsA, { text: 'Original', channel: 'SUPPORT' });
      const updated = await updateFeedback(wsA, fb.id, { text: 'Updated' });
      expect(updated!.text).toBe('Updated');
    });

    it('updates channel field', async () => {
      const fb = await createFeedback(wsA, { text: 'Test', channel: 'SUPPORT' });
      const updated = await updateFeedback(wsA, fb.id, { channel: 'SURVEY' });
      expect(updated).not.toBeNull();
    });

    it('rejects invalid channel in update', async () => {
      const fb = await createFeedback(wsA, { text: 'Test', channel: 'SUPPORT' });
      await expect(updateFeedback(wsA, fb.id, { channel: 'INVALID' })).rejects.toThrow('VALIDATION_ERROR');
    });
  });

  describe('deleteFeedback', () => {
    it('deletes existing feedback', async () => {
      const fb = await createFeedback(wsA, { text: 'To delete', channel: 'SOCIAL' });
      const result = await deleteFeedback(wsA, fb.id);
      expect(result).toBe(true);
    });

    it('returns false for non-existent feedback', async () => {
      const result = await deleteFeedback(wsA, 'nonexistent-id');
      expect(result).toBe(false);
    });
  });
});

describe('Status Transitions', () => {
  const ws = 'status-ws';

  it('allows NEW → REVIEWED', async () => {
    const fb = await createFeedback(ws, { text: 'Status test', channel: 'SURVEY' });
    const updated = await updateFeedback(ws, fb.id, { status: 'REVIEWED' });
    expect(updated!.status).toBe('REVIEWED');
  });

  it('allows REVIEWED → ACTIONED', async () => {
    const fb = await createFeedback(ws, { text: 'Status test 2', channel: 'SURVEY' });
    await updateFeedback(ws, fb.id, { status: 'REVIEWED' });
    const updated = await updateFeedback(ws, fb.id, { status: 'ACTIONED' });
    expect(updated!.status).toBe('ACTIONED');
  });

  it('rejects NEW → ACTIONED (skip)', async () => {
    const fb = await createFeedback(ws, { text: 'Bad transition', channel: 'SALES' });
    await expect(updateFeedback(ws, fb.id, { status: 'ACTIONED' })).rejects.toThrow('INVALID_STATUS_TRANSITION');
  });

  it('rejects REVIEWED → NEW (backward)', async () => {
    const fb = await createFeedback(ws, { text: 'Backward', channel: 'SALES' });
    await updateFeedback(ws, fb.id, { status: 'REVIEWED' });
    await expect(updateFeedback(ws, fb.id, { status: 'NEW' })).rejects.toThrow('INVALID_STATUS_TRANSITION');
  });

  it('rejects ACTIONED → NEW', async () => {
    const fb = await createFeedback(ws, { text: 'Full cycle', channel: 'SALES' });
    await updateFeedback(ws, fb.id, { status: 'REVIEWED' });
    await updateFeedback(ws, fb.id, { status: 'ACTIONED' });
    await expect(updateFeedback(ws, fb.id, { status: 'NEW' })).rejects.toThrow('INVALID_STATUS_TRANSITION');
  });

  it('rejects ACTIONED → REVIEWED', async () => {
    const fb = await createFeedback(ws, { text: 'Back from actioned', channel: 'SUPPORT' });
    await updateFeedback(ws, fb.id, { status: 'REVIEWED' });
    await updateFeedback(ws, fb.id, { status: 'ACTIONED' });
    await expect(updateFeedback(ws, fb.id, { status: 'REVIEWED' })).rejects.toThrow('INVALID_STATUS_TRANSITION');
  });

  it('allows update without changing status', async () => {
    const fb = await createFeedback(ws, { text: 'No status change', channel: 'SUPPORT' });
    const updated = await updateFeedback(ws, fb.id, { text: 'Updated text' });
    expect(updated!.text).toBe('Updated text');
    expect(updated!.status).toBe('NEW');
  });
});

describe('Tenant Isolation', () => {
  const wsA = 'tenant-a';
  const wsB = 'tenant-b';

  it('workspace A cannot read workspace B feedback', async () => {
    const fb = await createFeedback(wsA, { text: 'Private A', channel: 'SUPPORT' });
    const fetched = await getFeedback(wsB, fb.id);
    expect(fetched).toBeNull();
  });

  it('workspace A cannot update workspace B feedback', async () => {
    const fb = await createFeedback(wsA, { text: 'Tenant update test', channel: 'SUPPORT' });
    const result = await updateFeedback(wsB, fb.id, { text: 'Hacked' });
    expect(result).toBeNull();
  });

  it('workspace A cannot delete workspace B feedback', async () => {
    const fb = await createFeedback(wsA, { text: 'Tenant delete test', channel: 'SUPPORT' });
    const result = await deleteFeedback(wsB, fb.id);
    expect(result).toBe(false);
  });

  it('listFeedback only returns own workspace data', async () => {
    await createFeedback(wsA, { text: 'A data', channel: 'SUPPORT' });
    await createFeedback(wsB, { text: 'B data', channel: 'SUPPORT' });

    const resultA = await listFeedback({ workspaceId: wsA, page: 1, pageSize: 25 });
    expect(resultA.data.every((fb: any) => fb.text !== 'B data')).toBe(true);

    const resultB = await listFeedback({ workspaceId: wsB, page: 1, pageSize: 25 });
    expect(resultB.data.every((fb: any) => fb.text !== 'A data')).toBe(true);
  });
});

describe('Error Handling', () => {
  it('validation errors include field details', async () => {
    try {
      await createFeedback('ws', { text: '', channel: 'SUPPORT' });
      expect.unreachable('Should have thrown');
    } catch (e: any) {
      expect(e.message).toBe('VALIDATION_ERROR');
      expect(e.fields).toBeDefined();
    }
  });

  it('invalid status transition throws INVALID_STATUS_TRANSITION', async () => {
    const fb = await createFeedback('ws', { text: 'Test', channel: 'SUPPORT' });
    try {
      await updateFeedback('ws', fb.id, { status: 'ACTIONED' });
      expect.unreachable('Should have thrown');
    } catch (e: any) {
      expect(e.message).toBe('INVALID_STATUS_TRANSITION');
    }
  });
});
