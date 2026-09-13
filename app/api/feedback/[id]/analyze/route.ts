import { NextResponse } from 'next/server';
import { requireRole } from '../../../../../utils/requireRole';
import { AppError } from '../../../../../utils/AppError';
import { Role } from '@prisma/client';
import { analyzeFeedback } from '../../../../../services/feedbackService';
import { sanitizeAIError } from '../../../../../services/ai/aiSecurity';
import { checkRateLimit, rateLimitExceededResponse } from '../../../../../utils/rateLimiter';

export const dynamic = 'force-dynamic';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    if (!params.id || typeof params.id !== 'string' || params.id.trim() === '') {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Valid ID parameter is required' } },
        { status: 400 }
      );
    }

    const sessionUser = await requireRole(Role.ADMIN, Role.ANALYST);
    const workspaceId = (sessionUser as any).workspaceId;

    // Workspace rate limiting: 30 analysis retries per minute
    const rateCheck = checkRateLimit(`feedback-analyze:${workspaceId}`, { maxRequests: 30, windowMs: 60 * 1000 });
    if (!rateCheck.allowed) {
      return rateLimitExceededResponse(rateCheck.resetTime);
    }

    const updated = await analyzeFeedback(workspaceId, params.id);
    if (!updated) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Feedback not found' } },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: updated });
  } catch (error: any) {
    if (error instanceof AppError) {
      return NextResponse.json(
        { error: { code: error.statusCode === 401 ? 'UNAUTHORIZED' : 'FORBIDDEN', message: error.message } },
        { status: error.statusCode }
      );
    }

    const sanitizedMessage = sanitizeAIError(error?.message || 'AI analysis failed.');
    return NextResponse.json(
      { error: { code: 'AI_ANALYSIS_FAILED', message: sanitizedMessage } },
      { status: 500 }
    );
  }
}
