import { NextResponse } from 'next/server';
import { requireAuth } from '../../../utils/requireAuth';
import { requireRole } from '../../../utils/requireRole';
import { Role } from '@prisma/client';
import { createReportSchema } from '../../../lib/validation/report';
import { generateReport, listReports } from '../../../services/reportService';
import { AppError } from '../../../utils/AppError';
import { parseJsonBody } from '../../../utils/safeJson';
import { checkRateLimit, rateLimitExceededResponse } from '../../../utils/rateLimiter';

export const dynamic = 'force-dynamic';

export async function GET() {

  try {
    const user = await requireRole('ADMIN', 'ANALYST', 'VIEWER');
    const reports = await listReports(user.workspaceId);
    return NextResponse.json({ data: reports });
  } catch (error: any) {
    if (error instanceof AppError) {
      return NextResponse.json(
        { error: { code: 'REPORTS_FAILED', message: error.message } },
        { status: error.statusCode }
      );
    }
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to retrieve reports.' } },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    // Only ADMIN and ANALYST can generate reports. VIEWER is rejected with 403.
    const user = await requireRole('ADMIN', 'ANALYST');

    // Rate limit report generations: 15 per minute per workspace
    const rateCheck = checkRateLimit(`report-generate:${user.workspaceId}`, { maxRequests: 15, windowMs: 60 * 1000 });
    if (!rateCheck.allowed) {
      return rateLimitExceededResponse(rateCheck.resetTime);
    }

    const bodyResult = await parseJsonBody(req);
    if (!bodyResult.success) {
      return bodyResult.response;
    }

    const parsed = createReportSchema.safeParse(bodyResult.data);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid report parameters.',
            fields: parsed.error.flatten().fieldErrors,
          },
        },
        { status: 400 }
      );
    }

    const report = await generateReport(user.workspaceId, parsed.data);
    return NextResponse.json({ data: report }, { status: 201 });
  } catch (error: any) {
    if (error instanceof AppError) {
      const code = error.statusCode === 400 ? 'VALIDATION_ERROR' : error.statusCode === 401 ? 'UNAUTHORIZED' : error.statusCode === 403 ? 'FORBIDDEN' : 'REPORT_GENERATION_FAILED';
      return NextResponse.json(
        { error: { code, message: error.message } },
        { status: error.statusCode }
      );
    }
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'An internal server error occurred.' } },
      { status: 500 }
    );
  }
}
