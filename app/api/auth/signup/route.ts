import { NextResponse } from 'next/server';
import { signupSchema } from '../../../../lib/validation/auth';
import { signup } from '../../../../services/workspaceService';
import { AppError } from '../../../../utils/AppError';

import { parseJsonBody } from '../../../../utils/safeJson';
import { checkRateLimit, rateLimitExceededResponse, getClientIp } from '../../../../utils/rateLimiter';

export async function POST(req: Request) {
  try {
    // Rate limit registration: 10 signups per 15 minutes per IP
    const clientIp = getClientIp(req);
    const rateCheck = checkRateLimit(`signup:${clientIp}`, { maxRequests: 10, windowMs: 15 * 60 * 1000 });
    if (!rateCheck.allowed) {
      return rateLimitExceededResponse(rateCheck.resetTime);
    }

    const bodyResult = await parseJsonBody(req);
    if (!bodyResult.success) {
      return bodyResult.response;
    }

    const parsed = signupSchema.safeParse(bodyResult.data);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid registration parameters.',
            fields: parsed.error.flatten().fieldErrors,
          },
        },
        { status: 400 }
      );
    }

    const result = await signup(parsed.data);
    return NextResponse.json({ data: result }, { status: 201 });
  } catch (error: any) {
    if (error instanceof AppError) {
      return NextResponse.json(
        { error: { code: 'REGISTRATION_FAILED', message: error.message } },
        { status: error.statusCode }
      );
    }
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'An internal server error occurred.' } },
      { status: 500 }
    );
  }
}
