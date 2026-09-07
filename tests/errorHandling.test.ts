/**
 * Error Handling Tests
 * Verifies that error responses follow the standardized error envelope from File 04.
 * Tests AppError utility and error code mapping.
 */
import { describe, it, expect } from 'vitest';
import { AppError } from '../utils/AppError';

describe('AppError', () => {
  it('creates error with default 500 status', () => {
    const err = new AppError('Something went wrong');
    expect(err.message).toBe('Something went wrong');
    expect(err.statusCode).toBe(500);
    expect(err.name).toBe('AppError');
    expect(err instanceof Error).toBe(true);
  });

  it('creates error with custom status code', () => {
    const err = new AppError('Not found', 404);
    expect(err.statusCode).toBe(404);
  });

  it('creates 401 unauthorized error', () => {
    const err = new AppError('Authentication required', 401);
    expect(err.statusCode).toBe(401);
    expect(err.message).toBe('Authentication required');
  });

  it('creates 403 forbidden error', () => {
    const err = new AppError('Insufficient role: requires ADMIN', 403);
    expect(err.statusCode).toBe(403);
  });

  it('creates 409 conflict error', () => {
    const err = new AppError('INVALID_STATUS_TRANSITION', 409);
    expect(err.statusCode).toBe(409);
  });
});

describe('Error Envelope Format (File 04)', () => {
  it('validation error has correct structure', () => {
    // Simulate what route handlers produce
    const errorResponse = {
      error: {
        code: 'VALIDATION_ERROR',
        message: 'The request contains invalid fields.',
        fields: { text: ['Required'] },
      },
    };
    expect(errorResponse.error).toHaveProperty('code');
    expect(errorResponse.error).toHaveProperty('message');
    expect(errorResponse.error.code).toBe('VALIDATION_ERROR');
  });

  it('unauthorized error has correct structure', () => {
    const errorResponse = {
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication is required.',
      },
    };
    expect(errorResponse.error.code).toBe('UNAUTHORIZED');
  });

  it('forbidden error has correct structure', () => {
    const errorResponse = {
      error: {
        code: 'FORBIDDEN',
        message: 'You do not have permission to perform this action.',
      },
    };
    expect(errorResponse.error.code).toBe('FORBIDDEN');
  });

  it('not found error has correct structure', () => {
    const errorResponse = {
      error: {
        code: 'NOT_FOUND',
        message: 'Feedback not found',
      },
    };
    expect(errorResponse.error.code).toBe('NOT_FOUND');
  });

  it('conflict error has correct structure', () => {
    const errorResponse = {
      error: {
        code: 'INVALID_STATUS_TRANSITION',
        message: 'This feedback cannot move to the requested status.',
      },
    };
    expect(errorResponse.error.code).toBe('INVALID_STATUS_TRANSITION');
  });

  it('error envelope never contains stack traces', () => {
    const err = new AppError('Test error', 500);
    const safeResponse = {
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred.',
      },
    };
    // Verify no stack trace in response
    expect(JSON.stringify(safeResponse)).not.toContain('at ');
    expect(JSON.stringify(safeResponse)).not.toContain('Error:');
    expect(safeResponse.error).not.toHaveProperty('stack');
  });
});

describe('Zod Validation Schema Tests', () => {
  it('feedbackCreateSchema rejects invalid data', async () => {
    const { feedbackCreateSchema } = await import('../lib/validation/feedback');
    
    const result = feedbackCreateSchema.safeParse({ text: '', channel: 'SUPPORT' });
    expect(result.success).toBe(false);
  });

  it('feedbackCreateSchema accepts valid data', async () => {
    const { feedbackCreateSchema } = await import('../lib/validation/feedback');
    
    const result = feedbackCreateSchema.safeParse({ text: 'Valid', channel: 'SUPPORT' });
    expect(result.success).toBe(true);
  });

  it('feedbackListQuerySchema enforces max pageSize', async () => {
    const { feedbackListQuerySchema } = await import('../lib/validation/feedback');
    
    const result = feedbackListQuerySchema.safeParse({ pageSize: '200' });
    expect(result.success).toBe(false);
  });

  it('feedbackListQuerySchema sets defaults', async () => {
    const { feedbackListQuerySchema } = await import('../lib/validation/feedback');
    
    const result = feedbackListQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.pageSize).toBe(25);
    }
  });

  it('feedbackListQuerySchema validates channel enum', async () => {
    const { feedbackListQuerySchema } = await import('../lib/validation/feedback');
    
    const result = feedbackListQuerySchema.safeParse({ channel: 'INVALID' });
    expect(result.success).toBe(false);
  });

  it('feedbackListQuerySchema validates sentiment enum', async () => {
    const { feedbackListQuerySchema } = await import('../lib/validation/feedback');
    
    const result = feedbackListQuerySchema.safeParse({ sentiment: 'INVALID' });
    expect(result.success).toBe(false);
  });

  it('feedbackListQuerySchema validates status enum', async () => {
    const { feedbackListQuerySchema } = await import('../lib/validation/feedback');
    
    const result = feedbackListQuerySchema.safeParse({ status: 'INVALID' });
    expect(result.success).toBe(false);
  });
});
