import { NextResponse } from 'next/server';

/**
 * In-Memory Sliding Window Rate Limiter
 *
 * NOTE ON ARCHITECTURAL BOUNDARIES:
 * This in-memory store provides rate limiting for single-instance, local, and development
 * environments. In distributed or serverless multi-instance deployments (e.g. Vercel Edge/Serverless),
 * in-memory state is local to each instance/lambda. For production distributed rate limiting
 * across multiple serverless nodes, Upstash / Redis should be used (currently deferred per
 * Section 16 of plan.md).
 */

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitRecord>();

// Cleanup stale entries every 5 minutes to prevent memory leaks
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of rateLimitStore.entries()) {
      if (now > record.resetTime) {
        rateLimitStore.delete(key);
      }
    }
  }, 5 * 60 * 1000).unref?.();
}

export interface RateLimitOptions {
  /** Maximum allowed requests within the window */
  maxRequests: number;
  /** Window duration in milliseconds */
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
}

/**
 * Check if a request identifier (e.g. IP or workspaceId) exceeds the rate limit.
 */
export function checkRateLimit(
  identifier: string,
  options: RateLimitOptions
): RateLimitResult {
  const now = Date.now();
  const record = rateLimitStore.get(identifier);

  if (!record || now > record.resetTime) {
    const newRecord: RateLimitRecord = {
      count: 1,
      resetTime: now + options.windowMs,
    };
    rateLimitStore.set(identifier, newRecord);
    return {
      allowed: true,
      remaining: options.maxRequests - 1,
      resetTime: newRecord.resetTime,
    };
  }

  if (record.count < options.maxRequests) {
    record.count += 1;
    return {
      allowed: true,
      remaining: options.maxRequests - record.count,
      resetTime: record.resetTime,
    };
  }

  return {
    allowed: false,
    remaining: 0,
    resetTime: record.resetTime,
  };
}

/**
 * Reset rate limit store (primarily for unit tests).
 */
export function resetRateLimitStore(): void {
  rateLimitStore.clear();
}

/**
 * Create a standardized 429 Too Many Requests response.
 */
export function rateLimitExceededResponse(resetTime: number): NextResponse {
  const retryAfterSeconds = Math.max(1, Math.ceil((resetTime - Date.now()) / 1000));
  return NextResponse.json(
    {
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests. Please wait before retrying.',
      },
    },
    {
      status: 429,
      headers: {
        'Retry-After': String(retryAfterSeconds),
      },
    }
  );
}

/**
 * Extract client IP from standard request headers.
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return request.headers.get('x-real-ip') ?? 'unknown-client';
}
