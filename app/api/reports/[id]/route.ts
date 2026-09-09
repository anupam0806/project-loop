import { NextResponse } from 'next/server';
import { requireRole } from '../../../../utils/requireRole';
import { getReportById } from '../../../../services/reportService';
import { AppError } from '../../../../utils/AppError';

export const dynamic = 'force-dynamic';

export async function GET(

  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireRole('ADMIN', 'ANALYST', 'VIEWER');
    const report = await getReportById(user.workspaceId, params.id);

    if (!report) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Report not found.' } },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: report });
  } catch (error: any) {
    if (error instanceof AppError) {
      return NextResponse.json(
        { error: { code: 'REPORT_FAILED', message: error.message } },
        { status: error.statusCode }
      );
    }
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'An internal server error occurred.' } },
      { status: 500 }
    );
  }
}
