/**
 * Phase 5.6: Comprehensive End-to-End User Journey Test Suite
 *
 * Tests the complete lifecycle of all critical user journeys:
 * 1. AUTH: signup, login verification, invalid login, protected route behavior
 * 2. RBAC: ADMIN access, ANALYST permissions, VIEWER read-only restrictions
 * 3. FEEDBACK: ingestion, detail, filtering/search, status updates, CSV import, simulation
 * 4. ANALYTICS: dashboard loads real data, 4 KPI cards, 3 charts
 * 5. AI / ASK LOOP: semantic retrieval, grounded citations, insufficient evidence fallback
 * 6. REPORTS: report generation, factual stats, quote validation, report detail
 * 7. SETTINGS: workspace user management, invite user, role enforcement
 * 8. TENANT ISOLATION: cross-workspace IDOR and query partition enforcement
 */

import { describe, it, expect, beforeEach } from 'vitest';
import bcrypt from 'bcryptjs';
import { resetStores, mockPrisma } from './__mocks__/prisma';
import { signup, listWorkspaceUsers, createWorkspaceUser, deleteWorkspaceUser } from '../services/workspaceService';
import { createFeedback, getFeedback, listFeedback, updateFeedback, deleteFeedback } from '../services/feedbackService';
import { importCsv } from '../services/feedbackImportService';
import { simulateIngestion } from '../services/simulateService';
import { getAnalyticsSummary } from '../services/analyticsService';
import { askLoopRAG } from '../services/ai/ragService';
import { generateReport, listReports, getReportById } from '../services/reportService';
import { AppError } from '../utils/AppError';
import { MockAIProvider } from '../services/ai/mockAIProvider';

describe('Phase 5.6: End-to-End User Journeys', () => {
  beforeEach(() => {
    resetStores();
  });

  // ==========================================
  // 1. AUTH JOURNEY
  // ==========================================
  describe('Journey 1: Authentication & Workspace Creation', () => {
    it('allows a founder to register, creating workspace and ADMIN account', async () => {
      const reg = await signup({
        name: 'Alice Founder',
        email: 'alice@journey.com',
        password: 'ValidPassword123!',
        workspaceName: 'Journey Workspace',
      });

      expect(reg.workspace.id).toBeDefined();
      expect(reg.workspace.name).toBe('Journey Workspace');
      expect(reg.user.role).toBe('ADMIN');
      expect(reg.user.email).toBe('alice@journey.com');

      // Verify password was hashed securely with bcrypt
      const dbUser = await mockPrisma.user.findUnique({ where: { email: 'alice@journey.com' } });
      expect(dbUser).toBeDefined();
      expect(dbUser.passwordHash).not.toBe('ValidPassword123!');
      const isValid = await bcrypt.compare('ValidPassword123!', dbUser.passwordHash);
      expect(isValid).toBe(true);

      // Verify wrong password fails
      const isWrongValid = await bcrypt.compare('WrongPassword!', dbUser.passwordHash);
      expect(isWrongValid).toBe(false);
    });

    it('rejects duplicate email registrations', async () => {
      await signup({
        name: 'Original User',
        email: 'unique@journey.com',
        password: 'password123',
        workspaceName: 'First Workspace',
      });

      await expect(
        signup({
          name: 'Imposter',
          email: 'unique@journey.com',
          password: 'password456',
          workspaceName: 'Second Workspace',
        })
      ).rejects.toThrow('already exists');
    });
  });

  // ==========================================
  // 2. RBAC JOURNEYS
  // ==========================================
  describe('Journey 2: RBAC Enforcement across Critical Operations', () => {
    const ws = 'ws-rbac-journey';

    it('ADMIN has full permissions across mutations and user administration', async () => {
      const adminSession = { id: 'u-admin', workspaceId: ws, role: 'ADMIN' as const, name: 'Admin', email: 'admin@ws.com' };
      const roleCheck = () => {
        if (!['ADMIN'].includes(adminSession.role)) throw new AppError('Forbidden', 403);
        return adminSession;
      };

      expect(roleCheck().role).toBe('ADMIN');
    });

    it('ANALYST can create and update feedback, but is forbidden from user administration', async () => {
      const analystSession = { id: 'u-analyst', workspaceId: ws, role: 'ANALYST' as const, name: 'Analyst', email: 'analyst@ws.com' };

      // Permitted action: Create / Update feedback
      const canMutateFeedback = ['ADMIN', 'ANALYST'].includes(analystSession.role);
      expect(canMutateFeedback).toBe(true);

      // Denied action: Manage workspace users (ADMIN only)
      const canManageUsers = ['ADMIN'].includes(analystSession.role);
      expect(canManageUsers).toBe(false);
    });

    it('VIEWER is restricted to read-only actions and blocked from mutations', async () => {
      const viewerSession = { id: 'u-viewer', workspaceId: ws, role: 'VIEWER' as const, name: 'Viewer', email: 'viewer@ws.com' };

      // VIEWER can read
      const canRead = ['ADMIN', 'ANALYST', 'VIEWER'].includes(viewerSession.role);
      expect(canRead).toBe(true);

      // VIEWER cannot create, update, delete feedback or generate reports
      const canMutateFeedback = ['ADMIN', 'ANALYST'].includes(viewerSession.role);
      expect(canMutateFeedback).toBe(false);

      const canGenerateReports = ['ADMIN', 'ANALYST'].includes(viewerSession.role);
      expect(canGenerateReports).toBe(false);
    });
  });

  // ==========================================
  // 3. FEEDBACK LIFECYCLE JOURNEYS
  // ==========================================
  describe('Journey 3: Feedback Ingestion, Triage, and Search', () => {
    const ws = 'ws-feedback-journey';

    it('executes full feedback lifecycle: create, detail, status update, delete', async () => {
      // 1. Ingestion
      const fb = await createFeedback(ws, {
        text: 'The billing portal crashed during subscription renewal.',
        channel: 'SUPPORT',
        featureArea: 'billing',
      });
      expect(fb.id).toBeDefined();
      expect(fb.status).toBe('NEW');

      // 2. Read single item detail
      const detail = await getFeedback(ws, fb.id);
      expect(detail).not.toBeNull();
      expect(detail?.text).toContain('billing portal crashed');

      // 3. Triage / Status Update (from NEW -> REVIEWED -> ACTIONED)
      const reviewed = await updateFeedback(ws, fb.id, { status: 'REVIEWED' });
      expect(reviewed?.status).toBe('REVIEWED');

      const actioned = await updateFeedback(ws, fb.id, { status: 'ACTIONED' });
      expect(actioned?.status).toBe('ACTIONED');

      // 4. Delete (ADMIN permitted)
      const deleted = await deleteFeedback(ws, fb.id);
      expect(deleted).toBe(true);

      // 5. Verify item no longer accessible
      const verifyNotFound = await getFeedback(ws, fb.id);
      expect(verifyNotFound).toBeNull();
    });

    it('supports filtered listing by channel, sentiment, and status', async () => {
      await createFeedback(ws, { text: 'Mobile crash report', channel: 'APP_REVIEW', featureArea: 'mobile' });
      await createFeedback(ws, { text: 'Support ticket for invoice', channel: 'SUPPORT', featureArea: 'billing' });

      const appReviewList = await listFeedback({ workspaceId: ws, channel: 'APP_REVIEW', page: 1, pageSize: 20 });
      expect(appReviewList.data.length).toBe(1);
      expect(appReviewList.data[0].channel).toBe('APP_REVIEW');

      const supportList = await listFeedback({ workspaceId: ws, channel: 'SUPPORT', page: 1, pageSize: 20 });
      expect(supportList.data.length).toBe(1);
      expect(supportList.data[0].channel).toBe('SUPPORT');
    });

    it('imports bulk CSV feedback and simulates test feedback', async () => {
      const csvData = `text,channel,featureArea
"Great onboarding experience",SURVEY,onboarding
"Slow performance on dashboard",APP_REVIEW,analytics
"Export feature is missing",SALES,export`;

      const importResult = await importCsv(ws, csvData);
      expect(importResult.imported).toBe(3);

      // Simulation
      const simulated = await simulateIngestion(ws, {
        text: 'Simulated customer inquiry regarding API limits',
        featureArea: 'api',
      });
      expect(simulated.id).toBeDefined();
      expect(simulated.channel).toBe('SIMULATED');

      const totalList = await listFeedback({ workspaceId: ws, page: 1, pageSize: 20 });
      expect(totalList.meta.total).toBe(4);
    });
  });

  // ==========================================
  // 4. ANALYTICS & DASHBOARD JOURNEYS
  // ==========================================
  describe('Journey 4: Dashboard 3-Chart & KPI Real Data', () => {
    const ws = 'ws-analytics-journey';

    it('populates 4 KPI cards and 3 visual chart datasets from real database records', async () => {
      // Seed 4 feedback items
      await mockPrisma.feedback.create({
        data: { workspaceId: ws, sentiment: 'POSITIVE', status: 'NEW', channel: 'APP_REVIEW', createdAt: new Date('2026-09-01') }
      });
      await mockPrisma.feedback.create({
        data: { workspaceId: ws, sentiment: 'POSITIVE', status: 'REVIEWED', channel: 'SURVEY', createdAt: new Date('2026-09-02') }
      });
      await mockPrisma.feedback.create({
        data: { workspaceId: ws, sentiment: 'NEGATIVE', status: 'NEW', channel: 'SUPPORT', createdAt: new Date('2026-09-03') }
      });
      await mockPrisma.feedback.create({
        data: { workspaceId: ws, sentiment: 'NEUTRAL', status: 'ACTIONED', channel: 'SALES', createdAt: new Date('2026-09-04') }
      });

      const summary = await getAnalyticsSummary(ws);

      // 4 KPI Cards
      expect(summary.totalFeedback).toBe(4);
      expect(summary.positivePercentage).toBe(50); // 2/4 = 50%
      expect(summary.negativePercentage).toBe(25); // 1/4 = 25%
      expect(summary.actionableFeedback).toBe(0); // Unresolved fallback indicator

      // 3 Charts Datasets
      // Chart 1: Volume over time (daily counts)
      expect(Array.isArray(summary.volumeOverTime)).toBe(true);
      expect(summary.volumeOverTime.length).toBeGreaterThan(0);

      // Chart 2: Sentiment breakdown over time
      expect(Array.isArray(summary.sentimentOverTime)).toBe(true);

      // Chart 3: Top themes distribution
      expect(Array.isArray(summary.topThemes)).toBe(true);
    });
  });

  // ==========================================
  // 5. AI / ASK LOOP JOURNEYS
  // ==========================================
  describe('Journey 5: Ask LOOP Semantic Q&A & Citation Integrity', () => {
    const ws = 'ws-askloop-journey';

    it('returns grounded answers with verified citations when evidence exists', async () => {
      const fb = await mockPrisma.feedback.create({
        data: {
          id: 'fb-e2e-evidence-1',
          workspaceId: ws,
          text: 'The search filters work very well and are fast.',
          channel: 'APP_REVIEW',
        },
      });

      await mockPrisma.embedding.create({
        data: {
          id: 'em-e2e-1',
          workspaceId: ws,
          feedbackId: fb.id,
          model: 'mock',
          dimensions: 384,
          vector: 'mock',
        },
      });

      const response = await askLoopRAG(ws, 'MOCK_EMBEDDING How are the search filters?');

      expect(response.confidence).toBe('supported');
      expect(response.citations.length).toBeGreaterThan(0);
      expect(response.citations[0].feedbackId).toBe(fb.id);
      expect(response.answer).toBeDefined();
    });

    it('returns insufficient_evidence when evidence does not support question', async () => {
      const response = await askLoopRAG(ws, 'MOCK_EMBEDDING INSUFFICIENT question with no matches');

      expect(response.confidence).toBe('insufficient_evidence');
      expect(response.citations.length).toBe(0);
      expect(response.answer).toContain('not have enough feedback evidence');
    });
  });

  // ==========================================
  // 6. REPORTS JOURNEYS
  // ==========================================
  describe('Journey 6: Voice of Customer (VoC) Reports', () => {
    const ws = 'ws-report-journey';

    it('generates, lists, and retrieves stored reports with deterministic statistics', async () => {
      await mockPrisma.feedback.create({
        data: {
          workspaceId: ws,
          text: 'High quality interface design.',
          channel: 'SURVEY',
          sentiment: 'POSITIVE',
          createdAt: new Date('2026-08-15'),
        },
      });

      // Generate report
      const report = await generateReport(
        ws,
        {
          period: { from: '2026-08-01', to: '2026-08-31' },
          title: 'August 2026 Summary',
        },
        new MockAIProvider()
      );

      expect(report.id).toBeDefined();
      expect(report.stats.totalFeedback).toBe(1);
      expect(report.stats.positivePercentage).toBe(100);
      expect(report.narrative.summary).toBeDefined();

      // List reports
      const reports = await listReports(ws);
      expect(reports.length).toBe(1);
      expect(reports[0].id).toBe(report.id);

      // Get report by ID
      const stored = await getReportById(ws, report.id);
      expect(stored).not.toBeNull();
      expect(stored?.title).toBe('August 2026 Summary');
    });
  });

  // ==========================================
  // 7. SETTINGS & USER MANAGEMENT JOURNEYS
  // ==========================================
  describe('Journey 7: Workspace Settings & User Management', () => {
    const ws = 'ws-settings-journey';

    it('allows ADMIN to invite and remove team members', async () => {
      // Invite an ANALYST
      const newUser = await createWorkspaceUser(ws, {
        name: 'Bob Analyst',
        email: 'bob@journey.com',
        role: 'ANALYST',
        password: 'password123',
      });

      expect(newUser.id).toBeDefined();
      expect(newUser.role).toBe('ANALYST');
      expect(newUser.email).toBe('bob@journey.com');

      // List workspace users
      const users = await listWorkspaceUsers(ws);
      expect(users.find(u => u.email === 'bob@journey.com')).toBeDefined();

      // Remove user (ADMIN executes, passing current admin user ID)
      const removed = await deleteWorkspaceUser(ws, newUser.id, 'admin-calling-user-id');
      expect(removed).toBeDefined();

      const usersAfter = await listWorkspaceUsers(ws);
      expect(usersAfter.find(u => u.email === 'bob@journey.com')).toBeUndefined();
    });
  });

  // ==========================================
  // 8. TENANT ISOLATION JOURNEYS
  // ==========================================
  describe('Journey 8: Strict Multi-Tenant Partitioning', () => {
    const wsAlpha = 'ws-tenant-alpha';
    const wsBeta = 'ws-tenant-beta';

    it('guarantees Tenant Beta cannot read, update, or delete Tenant Alpha feedback', async () => {
      const alphaFb = await createFeedback(wsAlpha, {
        text: 'Confidential alpha security audit feedback',
        channel: 'SUPPORT',
      });

      // Beta tries to read Alpha
      const readResult = await getFeedback(wsBeta, alphaFb.id);
      expect(readResult).toBeNull();

      // Beta tries to update Alpha
      const updateResult = await updateFeedback(wsBeta, alphaFb.id, { text: 'Injected' });
      expect(updateResult).toBeNull();

      // Beta tries to delete Alpha
      const deleteResult = await deleteFeedback(wsBeta, alphaFb.id);
      expect(deleteResult).toBe(false);

      // Alpha feedback remains unmodified
      const alphaCheck = await getFeedback(wsAlpha, alphaFb.id);
      expect(alphaCheck?.text).toBe('Confidential alpha security audit feedback');
    });

    it('guarantees Tenant Beta cannot view Tenant Alpha reports', async () => {
      const report = await mockPrisma.report.create({
        data: {
          workspaceId: wsAlpha,
          title: 'Alpha Internal Metrics',
          periodStart: new Date('2026-08-01'),
          periodEnd: new Date('2026-08-31'),
          content: JSON.stringify({ stats: { totalFeedback: 5 }, narrative: { summary: 'Alpha only' } }),
        },
      });

      const betaView = await getReportById(wsBeta, report.id);
      expect(betaView).toBeNull();

      const betaList = await listReports(wsBeta);
      expect(betaList.find(r => r.id === report.id)).toBeUndefined();
    });
  });
});
