import { NextResponse } from 'next/server';
import { requireAuth } from '../../../utils/requireAuth';
import { requireRole } from '../../../utils/requireRole';
import { Role } from '@prisma/client';
import { createReportSchema } from '../../../lib/validation/report';
import { generateReport, listReports } from '../../../services/reportService';
import { AppError } from '../../../utils/AppError';

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
    
    const body = await req.json();
    const parsed = createReportSchema.safeParse(body);
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
      return NextResponse.json(
        { error: { code: 'REPORT_GENERATION_FAILED', message: error.message } },
        { status: error.statusCode }
      );
    }
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'An internal server error occurred.' } },
      { status: 500 }
    );
  }
}
