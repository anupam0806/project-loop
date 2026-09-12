import { NextResponse } from 'next/server';

// 1MB default request body size limit for JSON APIs
export const MAX_JSON_BODY_BYTES = 1024 * 1024;

export type SafeJsonResult<T = any> =
  | { success: true; data: T }
  | { success: false; response: NextResponse };

/**
 * Safely parse a JSON request body with size limit and syntax error protection.
 * Returns 400 for empty or malformed JSON, and 413 for oversized payloads.
 */
export async function parseJsonBody<T = any>(
  request: Request,
  maxBytes: number = MAX_JSON_BODY_BYTES
): Promise<SafeJsonResult<T>> {
  try {
    const text = await request.text();

    if (!text || text.trim() === '') {
      return {
        success: false,
        response: NextResponse.json(
          {
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Request body cannot be empty.',
            },
          },
          { status: 400 }
        ),
      };
    }

    const byteLength = Buffer.byteLength(text, 'utf8');
    if (byteLength > maxBytes) {
      return {
        success: false,
        response: NextResponse.json(
          {
            error: {
              code: 'PAYLOAD_TOO_LARGE',
              message: `Request payload exceeds the ${Math.round(maxBytes / 1024)}KB limit.`,
            },
          },
          { status: 413 }
        ),
      };
    }

    const data = JSON.parse(text);
    return { success: true, data };
  } catch {
    return {
      success: false,
      response: NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Malformed JSON payload in request body.',
          },
        },
        { status: 400 }
      ),
    };
  }
}
