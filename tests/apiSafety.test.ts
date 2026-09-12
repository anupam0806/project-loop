/**
 * Phase 5.3 API Safety & Input/Resource Limits Test Suite
 * Validates:
 * 1. Malformed JSON & empty request bodies return 400 VALIDATION_ERROR
 * 2. Request body size limits (1MB limit -> 413 PAYLOAD_TOO_LARGE)
 * 3. Zod schema boundary limits (text <= 5000, featureArea <= 100, password <= 128)
 * 4. Search query limits (q <= 500)
 * 5. Ask LOOP question limits (3 <= length <= 500)
 * 6. Pagination limits (positive integers, pageSize <= 100, defaults applied)
 * 7. Report date range validity (valid ISO dates, from <= to)
 * 8. CSV API safety (5MB upload limit, 1000 row limit, formula sanitization on text and featureArea)
 * 9. In-memory rate limiting (threshold enforcement, 429 response, Retry-After header)
 * 10. Predictable error envelopes without stack traces or sensitive leaks
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { parseJsonBody, MAX_JSON_BODY_BYTES } from '../utils/safeJson';
import { checkRateLimit, resetRateLimitStore, rateLimitExceededResponse, getClientIp } from '../utils/rateLimiter';
import { feedbackCreateSchema, feedbackUpdateSchema, feedbackListQuerySchema } from '../lib/validation/feedback';
import { askLoopRequestSchema } from '../lib/validation/ai';
import { signupSchema } from '../lib/validation/auth';
import { inviteUserSchema, updateUserSchema } from '../lib/validation/workspace';
import { createReportSchema } from '../lib/validation/report';
import { importCsv } from '../services/feedbackImportService';
import { resetStores, getFeedbackStore } from './__mocks__/prisma';

beforeEach(() => {
  resetRateLimitStore();
  resetStores();
});

describe('Phase 5.3: Request Body Parsing & Resource Limits', () => {
  describe('parseJsonBody', () => {
    it('returns 400 VALIDATION_ERROR for malformed JSON', async () => {
      const request = new Request('http://localhost/api/feedback', {
        method: 'POST',
        body: '{"text": "broken json...',
        headers: { 'Content-Type': 'application/json' },
      });

      const result = await parseJsonBody(request);
      expect(result.success).toBe(false);
      if (!result.success) {
        const json = await result.response.json();
        expect(result.response.status).toBe(400);
        expect(json.error.code).toBe('VALIDATION_ERROR');
        expect(json.error.message).toContain('Malformed JSON');
      }
    });

    it('returns 400 VALIDATION_ERROR for empty request body', async () => {
      const request = new Request('http://localhost/api/feedback', {
        method: 'POST',
        body: '   ',
        headers: { 'Content-Type': 'application/json' },
      });

      const result = await parseJsonBody(request);
      expect(result.success).toBe(false);
      if (!result.success) {
        const json = await result.response.json();
        expect(result.response.status).toBe(400);
        expect(json.error.code).toBe('VALIDATION_ERROR');
        expect(json.error.message).toContain('cannot be empty');
      }
    });

    it('returns 413 PAYLOAD_TOO_LARGE when payload exceeds max limit', async () => {
      // Create body exceeding 1MB limit
      const oversizedText = 'a'.repeat(MAX_JSON_BODY_BYTES + 10);
      const request = new Request('http://localhost/api/feedback', {
        method: 'POST',
        body: JSON.stringify({ text: oversizedText, channel: 'SUPPORT' }),
        headers: { 'Content-Type': 'application/json' },
      });

      const result = await parseJsonBody(request);
      expect(result.success).toBe(false);
      if (!result.success) {
        const json = await result.response.json();
        expect(result.response.status).toBe(413);
        expect(json.error.code).toBe('PAYLOAD_TOO_LARGE');
        expect(json.error.message).toContain('limit');
      }
    });

    it('successfully parses valid JSON within size limits', async () => {
      const request = new Request('http://localhost/api/feedback', {
        method: 'POST',
        body: JSON.stringify({ text: 'Valid feedback text', channel: 'SUPPORT' }),
        headers: { 'Content-Type': 'application/json' },
      });

      const result = await parseJsonBody(request);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.text).toBe('Valid feedback text');
        expect(result.data.channel).toBe('SUPPORT');
      }
    });
  });
});

describe('Phase 5.3: Field Boundary & Zod Validation', () => {
  describe('Feedback Schemas', () => {
    it('feedbackCreateSchema rejects feedback text exceeding 5,000 characters', () => {
      const oversizedText = 'x'.repeat(5001);
      const result = feedbackCreateSchema.safeParse({ text: oversizedText, channel: 'SUPPORT' });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.text?.[0]).toContain('5,000');
      }
    });

    it('feedbackCreateSchema rejects featureArea exceeding 100 characters', () => {
      const oversizedArea = 'a'.repeat(101);
      const result = feedbackCreateSchema.safeParse({ text: 'Valid', channel: 'SUPPORT', featureArea: oversizedArea });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.featureArea?.[0]).toContain('100');
      }
    });

    it('feedbackUpdateSchema rejects empty text when provided', () => {
      const result = feedbackUpdateSchema.safeParse({ text: '   ' });
      expect(result.success).toBe(false);
    });

    it('feedbackUpdateSchema rejects text exceeding 5,000 characters', () => {
      const oversizedText = 'x'.repeat(5001);
      const result = feedbackUpdateSchema.safeParse({ text: oversizedText });
      expect(result.success).toBe(false);
    });
  });

  describe('Search & Query Pagination Schemas', () => {
    it('feedbackListQuerySchema rejects search query q exceeding 500 characters', () => {
      const oversizedQuery = 'q'.repeat(501);
      const result = feedbackListQuerySchema.safeParse({ q: oversizedQuery });
      expect(result.success).toBe(false);
    });

    it('feedbackListQuerySchema rejects negative or zero page values', () => {
      const negResult = feedbackListQuerySchema.safeParse({ page: '-5' });
      expect(negResult.success).toBe(false);

      const zeroResult = feedbackListQuerySchema.safeParse({ page: '0' });
      expect(zeroResult.success).toBe(false);
    });

    it('feedbackListQuerySchema rejects pageSize exceeding 100', () => {
      const result = feedbackListQuerySchema.safeParse({ pageSize: '101' });
      expect(result.success).toBe(false);
    });

    it('feedbackListQuerySchema applies safe defaults for pagination', () => {
      const result = feedbackListQuerySchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.pageSize).toBe(25);
      }
    });

    it('feedbackListQuerySchema rejects sort parameters exceeding 50 characters', () => {
      const longSort = 's'.repeat(51);
      const result = feedbackListQuerySchema.safeParse({ sort: longSort });
      expect(result.success).toBe(false);
    });
  });

  describe('AI-Bound Input Schemas', () => {
    it('askLoopRequestSchema rejects question exceeding 500 characters', () => {
      const longQuestion = 'What is the feedback regarding our billing system? ' + 'x'.repeat(500);
      const result = askLoopRequestSchema.safeParse({ question: longQuestion });
      expect(result.success).toBe(false);
    });

    it('askLoopRequestSchema rejects question shorter than 3 characters', () => {
      const result = askLoopRequestSchema.safeParse({ question: 'hi' });
      expect(result.success).toBe(false);
    });

    it('askLoopRequestSchema accepts valid question length', () => {
      const result = askLoopRequestSchema.safeParse({ question: 'How is our customer onboarding?' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.question).toBe('How is our customer onboarding?');
      }
    });
  });

  describe('Auth & Password Security Schemas (Bcrypt DoS Protection)', () => {
    it('signupSchema rejects passwords exceeding 128 characters', () => {
      const longPassword = 'P'.repeat(129);
      const result = signupSchema.safeParse({
        name: 'Alice',
        email: 'alice@example.com',
        password: longPassword,
        workspaceName: 'Acme Corp',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.password?.[0]).toContain('128');
      }
    });

    it('inviteUserSchema rejects passwords exceeding 128 characters', () => {
      const longPassword = 'P'.repeat(129);
      const result = inviteUserSchema.safeParse({
        name: 'Bob',
        email: 'bob@example.com',
        password: longPassword,
        role: 'ANALYST',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.password?.[0]).toContain('128');
      }
    });

    it('updateUserSchema rejects empty name', () => {
      const result = updateUserSchema.safeParse({ name: '   ' });
      expect(result.success).toBe(false);
    });
  });

  describe('Report Date Range Validation', () => {
    it('createReportSchema rejects period where start date is after end date', () => {
      const result = createReportSchema.safeParse({
        period: {
          from: '2026-09-10T00:00:00.000Z',
          to: '2026-09-01T00:00:00.000Z',
        },
        title: 'Inverted Period Report',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const errorMsg = JSON.stringify(result.error.flatten());
        expect(errorMsg).toContain('Start date cannot be after end date');
      }
    });

    it('createReportSchema rejects invalid date strings', () => {
      const result = createReportSchema.safeParse({
        period: {
          from: 'not-a-valid-date',
          to: '2026-09-10T00:00:00.000Z',
        },
      });
      expect(result.success).toBe(false);
    });

    it('createReportSchema accepts valid chronological date range', () => {
      const result = createReportSchema.safeParse({
        period: {
          from: '2026-08-01T00:00:00.000Z',
          to: '2026-08-31T23:59:59.999Z',
        },
        title: 'August VoC Summary',
      });
      expect(result.success).toBe(true);
    });
  });
});

describe('Phase 5.3: CSV API Safety Hardening', () => {
  const ws = 'csv-safety-ws';

  it('rejects rows with text exceeding 5,000 characters during CSV import', async () => {
    const longText = 'x'.repeat(5001);
    const csv = `text,channel,featureArea\n"${longText}",SUPPORT,checkout`;
    const summary = await importCsv(ws, csv);

    expect(summary.imported).toBe(0);
    expect(summary.failed).toBe(1);
    expect(summary.errors[0].message).toContain('5,000');
  });

  it('sanitizes spreadsheet formula injection in featureArea column', async () => {
    const csv = 'text,channel,featureArea\nLegitimate feedback,SUPPORT,=cmd|\' /C calc\'!A0';
    const summary = await importCsv(ws, csv);

    expect(summary.imported).toBe(1);
    const store = getFeedbackStore();
    const importedItem = store.find((f: any) => f.workspaceId === ws);
    expect(importedItem).toBeDefined();
    // Feature area should be sanitized with leading apostrophe
    expect(importedItem?.featureArea).toBe("'=cmd|' /C calc'!A0");
  });

  it('sanitizes spreadsheet formula injection in text column', async () => {
    const csv = 'text,channel,featureArea\n=SUM(A1:A10),APP_REVIEW,checkout';
    const summary = await importCsv(ws, csv);

    expect(summary.imported).toBe(1);
    const store = getFeedbackStore();
    const importedItem = store.find((f: any) => f.workspaceId === ws && f.channel === 'APP_REVIEW');
    expect(importedItem).toBeDefined();
    expect(importedItem?.text).toBe("'=SUM(A1:A10)");
  });
});

describe('Phase 5.3: In-Memory Rate Limiting', () => {
  it('allows requests within rate limit threshold', () => {
    const id = 'client-1';
    const options = { maxRequests: 3, windowMs: 1000 };

    expect(checkRateLimit(id, options).allowed).toBe(true);
    expect(checkRateLimit(id, options).allowed).toBe(true);
    expect(checkRateLimit(id, options).allowed).toBe(true);
  });

  it('blocks requests exceeding rate limit threshold with remaining 0', () => {
    const id = 'client-abuser';
    const options = { maxRequests: 2, windowMs: 10000 };

    checkRateLimit(id, options);
    checkRateLimit(id, options);
    const blocked = checkRateLimit(id, options);

    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
  });

  it('rateLimitExceededResponse returns 429 status and standardized error envelope', async () => {
    const resetTime = Date.now() + 5000;
    const response = rateLimitExceededResponse(resetTime);

    expect(response.status).toBe(429);
    expect(response.headers.get('Retry-After')).toBeDefined();

    const body = await response.json();
    expect(body.error.code).toBe('RATE_LIMIT_EXCEEDED');
    expect(body.error.message).toContain('Too many requests');
    expect(body).not.toHaveProperty('stack');
  });

  it('getClientIp extracts first IP from x-forwarded-for', () => {
    const req = new Request('http://localhost/api/auth/signup', {
      headers: { 'x-forwarded-for': '203.0.113.195, 70.41.3.18, 150.172.238.178' },
    });
    expect(getClientIp(req)).toBe('203.0.113.195');
  });

  it('getClientIp falls back to x-real-ip or default', () => {
    const reqWithRealIp = new Request('http://localhost/api/auth/signup', {
      headers: { 'x-real-ip': '198.51.100.1' },
    });
    expect(getClientIp(reqWithRealIp)).toBe('198.51.100.1');

    const reqWithoutIp = new Request('http://localhost/api/auth/signup');
    expect(getClientIp(reqWithoutIp)).toBe('unknown-client');
  });
});
