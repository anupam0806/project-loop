import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mockPrisma, resetStores } from './__mocks__/prisma';
import { createFeedback, getFeedback, updateFeedback, analyzeFeedback } from '../services/feedbackService';
import { AIProvider } from '../services/ai/aiProvider';
import { AppError } from '../utils/AppError';

// Mock auth module for route handler testing
const mockSession = vi.fn();
vi.mock('../utils/requireAuth', () => ({
  requireAuth: () => mockSession(),
}));

import { POST as analyzeRouteHandler } from '../app/api/feedback/[id]/analyze/route';

describe('Retry Analysis & Status Decoupling', () => {
  const wsA = 'workspace-retry-a';
  const wsB = 'workspace-retry-b';

  beforeEach(() => {
    resetStores();
    vi.clearAllMocks();
  });

  describe('analyzeFeedback service', () => {
    it('successfully analyzes ACTIONED feedback and preserves ACTIONED status', async () => {
      // 1. Create a feedback item
      const fb = await createFeedback(wsA, {
        text: 'The onboarding process is wonderfully intuitive and delightful.',
        channel: 'APP_REVIEW',
      });

      // 2. Transition NEW -> REVIEWED -> ACTIONED
      await updateFeedback(wsA, fb.id, { status: 'REVIEWED' });
      const actioned = await updateFeedback(wsA, fb.id, { status: 'ACTIONED' });
      expect(actioned!.status).toBe('ACTIONED');

      // 3. Clear sentiment to simulate unanalyzed or failed analysis state
      const store = (await import('./__mocks__/prisma')).getFeedbackStore();
      const fbInStore = store.find((f: any) => f.id === fb.id);
      fbInStore.sentiment = null;
      fbInStore.urgency = null;
      fbInStore.category = null;

      const preAnalysis = await getFeedback(wsA, fb.id);
      expect(preAnalysis!.sentiment).toBeNull();
      expect(preAnalysis!.status).toBe('ACTIONED');

      // 4. Retry analysis
      const analyzed = await analyzeFeedback(wsA, fb.id);

      // 5. Verify status remains ACTIONED and classification fields are populated
      expect(analyzed).not.toBeNull();
      expect(analyzed!.status).toBe('ACTIONED');
      expect(analyzed!.sentiment).toBe('POSITIVE');
      expect(analyzed!.urgency).toBeDefined();
      expect(analyzed!.category).toBeDefined();
      expect(analyzed!.themes).toBeDefined();
      expect(analyzed!.themes.length).toBeGreaterThan(0);
    });

    it('successfully analyzes NEW and REVIEWED feedback without altering their status', async () => {
      const fbNew = await createFeedback(wsA, { text: 'I really love this product', channel: 'SUPPORT' });
      const analyzedNew = await analyzeFeedback(wsA, fbNew.id);
      expect(analyzedNew!.status).toBe('NEW');
      expect(analyzedNew!.sentiment).toBe('POSITIVE');

      const fbReviewed = await createFeedback(wsA, { text: 'Great tool for our team', channel: 'SALES' });
      await updateFeedback(wsA, fbReviewed.id, { status: 'REVIEWED' });
      const analyzedReviewed = await analyzeFeedback(wsA, fbReviewed.id);
      expect(analyzedReviewed!.status).toBe('REVIEWED');
      expect(analyzedReviewed!.sentiment).toBe('POSITIVE');
    });

    it('enforces tenant isolation (cannot analyze feedback in another workspace)', async () => {
      const fb = await createFeedback(wsA, { text: 'Workspace A sensitive feedback', channel: 'SURVEY' });
      const crossWorkspaceAttempt = await analyzeFeedback(wsB, fb.id);
      expect(crossWorkspaceAttempt).toBeNull();
    });

    it('proves the status state machine was NOT changed to permit ANALYZING', async () => {
      const fb = await createFeedback(wsA, { text: 'Testing status transition rejection', channel: 'SUPPORT' });
      await updateFeedback(wsA, fb.id, { status: 'REVIEWED' });
      await updateFeedback(wsA, fb.id, { status: 'ACTIONED' });

      // Attempting to send { status: "ANALYZING" } must be rejected by Zod validation
      await expect(
        updateFeedback(wsA, fb.id, { status: 'ANALYZING' as any })
      ).rejects.toThrow('VALIDATION_ERROR');

      // Attempting an invalid status transition on ACTIONED (e.g. back to REVIEWED) must throw INVALID_STATUS_TRANSITION
      await expect(
        updateFeedback(wsA, fb.id, { status: 'REVIEWED' })
      ).rejects.toThrow('INVALID_STATUS_TRANSITION');
    });
  });

  describe('POST /api/feedback/[id]/analyze Route Handler', () => {
    function mockSessionUser(role: string, workspaceId = wsA) {
      return {
        id: 'user-1',
        name: 'Test Analyst',
        email: 'analyst@test.com',
        role,
        workspaceId,
      };
    }

    it('allows ADMIN to trigger retry analysis and returns 200 with updated feedback', async () => {
      mockSession.mockResolvedValue(mockSessionUser('ADMIN'));

      const fb = await createFeedback(wsA, { text: 'Great app overall', channel: 'APP_REVIEW' });
      await updateFeedback(wsA, fb.id, { status: 'REVIEWED' });
      await updateFeedback(wsA, fb.id, { status: 'ACTIONED' });

      const request = new Request(`http://localhost/api/feedback/${fb.id}/analyze`, {
        method: 'POST',
      });

      const response = await analyzeRouteHandler(request, { params: { id: fb.id } });
      expect(response.status).toBe(200);

      const json = await response.json();
      expect(json.data).toBeDefined();
      expect(json.data.id).toBe(fb.id);
      expect(json.data.status).toBe('ACTIONED');
      expect(json.data.sentiment).toBe('POSITIVE');
    });

    it('allows ANALYST to trigger retry analysis and returns 200', async () => {
      mockSession.mockResolvedValue(mockSessionUser('ANALYST'));

      const fb = await createFeedback(wsA, { text: 'Fast response times', channel: 'SUPPORT' });
      const request = new Request(`http://localhost/api/feedback/${fb.id}/analyze`, {
        method: 'POST',
      });

      const response = await analyzeRouteHandler(request, { params: { id: fb.id } });
      expect(response.status).toBe(200);

      const json = await response.json();
      expect(json.data.sentiment).toBe('POSITIVE');
    });

    it('denies VIEWER role with 403 Forbidden', async () => {
      mockSession.mockResolvedValue(mockSessionUser('VIEWER'));

      const fb = await createFeedback(wsA, { text: 'Testing viewer access', channel: 'SUPPORT' });
      const request = new Request(`http://localhost/api/feedback/${fb.id}/analyze`, {
        method: 'POST',
      });

      const response = await analyzeRouteHandler(request, { params: { id: fb.id } });
      expect(response.status).toBe(403);

      const json = await response.json();
      expect(json.error.code).toBe('FORBIDDEN');
    });

    it('denies unauthenticated request with 401 Unauthorized', async () => {
      mockSession.mockRejectedValue(new AppError('Authentication required', 401));

      const request = new Request('http://localhost/api/feedback/any-id/analyze', {
        method: 'POST',
      });

      const response = await analyzeRouteHandler(request, { params: { id: 'any-id' } });
      expect(response.status).toBe(401);

      const json = await response.json();
      expect(json.error.code).toBe('UNAUTHORIZED');
    });

    it('returns 404 NOT_FOUND when feedback belongs to another workspace', async () => {
      // User is in wsB, feedback is in wsA
      mockSession.mockResolvedValue(mockSessionUser('ADMIN', wsB));

      const fb = await createFeedback(wsA, { text: 'Cross workspace feedback', channel: 'SUPPORT' });
      const request = new Request(`http://localhost/api/feedback/${fb.id}/analyze`, {
        method: 'POST',
      });

      const response = await analyzeRouteHandler(request, { params: { id: fb.id } });
      expect(response.status).toBe(404);

      const json = await response.json();
      expect(json.error.code).toBe('NOT_FOUND');
    });

    it('returns 400 VALIDATION_ERROR for empty ID parameter', async () => {
      mockSession.mockResolvedValue(mockSessionUser('ADMIN'));

      const request = new Request('http://localhost/api/feedback//analyze', {
        method: 'POST',
      });

      const response = await analyzeRouteHandler(request, { params: { id: '   ' } });
      expect(response.status).toBe(400);

      const json = await response.json();
      expect(json.error.code).toBe('VALIDATION_ERROR');
    });

    it('sanitizes AI provider errors without leaking API keys', async () => {
      mockSession.mockResolvedValue(mockSessionUser('ADMIN'));

      const fb = await createFeedback(wsA, { text: 'Simulate API key leak in error', channel: 'SUPPORT' });

      // Create a mock provider that throws an error containing a raw Anthropic API key
      const leakyProvider: AIProvider = {
        classifyFeedback: async () => {
          throw new Error('Anthropic API failed with sk-ant-api03-1234567890abcdef1234567890abcdef');
        },
        askLoop: async () => ({} as any),
        generateReportNarrative: async () => ({} as any),
      };

      // Temporarily mock analyzeFeedback to use the leakyProvider
      const analyzeSpy = vi.spyOn(await import('../services/feedbackService'), 'analyzeFeedback')
        .mockImplementationOnce(async (workspaceId, id) => {
          const { analyzeFeedback: realAnalyze } = await vi.importActual<any>('../services/feedbackService');
          return realAnalyze(workspaceId, id, leakyProvider);
        });

      const request = new Request(`http://localhost/api/feedback/${fb.id}/analyze`, {
        method: 'POST',
      });

      const response = await analyzeRouteHandler(request, { params: { id: fb.id } });
      expect(response.status).toBe(500);

      const json = await response.json();
      expect(json.error.code).toBe('AI_ANALYSIS_FAILED');
      expect(json.error.message).not.toContain('sk-ant-api03-1234567890abcdef1234567890abcdef');
      expect(json.error.message).toContain('[REDACTED_API_KEY]');

      analyzeSpy.mockRestore();
    });
  });
});
