import { describe, it, expect, beforeAll } from 'vitest';
import { prisma } from '../lib/db';
import { createFeedback, listFeedback, getFeedback, updateFeedback, deleteFeedback } from '../services/feedbackService';
import { Role } from '@prisma/client';
import { ensureWorkspace } from './helpers';

// Mock user/workspace
const workspaceA = 'workspace-a';
const workspaceB = 'workspace-b';

beforeAll(async () => {
  // Clean DB (skip if not connected)
  try {
    await prisma.feedback.deleteMany();
    await prisma.theme.deleteMany();
    await prisma.workspace.deleteMany();
    await prisma.workspace.createMany({ data: [{ id: workspaceA, name: 'A' }, { id: workspaceB, name: 'B' }] });
  } catch {}
});

describe('Feedback Service', () => {
  it('creates feedback', async () => {
    const fb = await createFeedback(workspaceA, { text: 'test', channel: 'SUPPORT', featureArea: 'ui' });
    expect(fb).toHaveProperty('id');
    expect(fb.text).toBe('test');
  });

  it('lists feedback with pagination', async () => {
    const result = await listFeedback({ workspaceId: workspaceA, page: 1, pageSize: 10 });
    expect(result.meta.total).toBeGreaterThanOrEqual(1);
  });

  it('gets feedback detail', async () => {
    const created = await createFeedback(workspaceA, { text: 'detail', channel: 'APP_REVIEW', featureArea: 'api' });
    const fetched = await getFeedback(workspaceA, created.id);
    expect(fetched?.text).toBe('detail');
  });

  it('updates feedback status with valid transition', async () => {
    const fb = await createFeedback(workspaceA, { text: 'status', channel: 'SURVEY' });
    const updated = await updateFeedback(workspaceA, fb.id, { status: 'REVIEWED' });
    expect(updated?.status).toBe('REVIEWED');
  });

  it('rejects invalid status transition', async () => {
    const fb = await createFeedback(workspaceA, { text: 'bad', channel: 'SALES' });
    await expect(updateFeedback(workspaceA, fb.id, { status: 'ACTIONED' })).rejects.toThrow('INVALID_STATUS_TRANSITION');
  });

  it('deletes feedback', async () => {
    const fb = await createFeedback(workspaceA, { text: 'del', channel: 'SOCIAL' });
    const ok = await deleteFeedback(workspaceA, fb.id);
    expect(ok).toBe(true);
  });

  it('enforces tenant isolation', async () => {
    const fb = await createFeedback(workspaceA, { text: 'isolated', channel: 'SUPPORT' });
    const fetched = await getFeedback(workspaceB, fb.id);
    expect(fetched).toBeNull();
  });
});
