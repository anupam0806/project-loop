import { NextResponse } from 'next/server';
import { feedbackListQuerySchema } from '../../../lib/validation/feedback';
import { requireAuth } from '../../../utils/requireAuth';
import { requireRole } from '../../../utils/requireRole';
import { AppError } from '../../../utils/AppError';
import { Role } from '@prisma/client';
import { listFeedback, createFeedback } from '../../../services/feedbackService';
import { parseJsonBody } from '../../../utils/safeJson';
import { checkRateLimit, rateLimitExceededResponse } from '../../../utils/rateLimiter';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const sessionUser = await requireAuth();
    const workspaceId = (sessionUser as any).workspaceId;
    const parsed = feedbackListQuerySchema.safeParse(Object.fromEntries(url.searchParams));
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Invalid query parameters', fields: parsed.error.flatten().fieldErrors } },
        { status: 400 }
      );
    }
    const result = await listFeedback({ workspaceId, ...parsed.data });
    return NextResponse.json(result);
  } catch (error: any) {
    if (error instanceof AppError) {
      return NextResponse.json(
        { error: { code: error.statusCode === 401 ? 'UNAUTHORIZED' : 'FORBIDDEN', message: error.message } },
        { status: error.statusCode }
      );
    }
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'An internal server error occurred.' } },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const sessionUser = await requireRole(Role.ADMIN, Role.ANALYST);
    const workspaceId = (sessionUser as any).workspaceId;

    // Rate limit feedback creation: 60 per minute per workspace
    const rateCheck = checkRateLimit(`feedback-create:${workspaceId}`, { maxRequests: 60, windowMs: 60 * 1000 });
    if (!rateCheck.allowed) {
      return rateLimitExceededResponse(rateCheck.resetTime);
    }

    const bodyResult = await parseJsonBody(request);
    if (!bodyResult.success) {
      return bodyResult.response;
    }

    const feedback = await createFeedback(workspaceId, bodyResult.data);
    return NextResponse.json({ data: feedback }, { status: 201 });
  } catch (error: any) {
    if (error instanceof AppError) {
      return NextResponse.json(
        { error: { code: error.statusCode === 401 ? 'UNAUTHORIZED' : 'FORBIDDEN', message: error.message } },
        { status: error.statusCode }
      );
    }
    if (error.message === 'VALIDATION_ERROR') {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Invalid request body', fields: error.fields } },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'An internal server error occurred.' } },
      { status: 500 }
    );
  }
}

