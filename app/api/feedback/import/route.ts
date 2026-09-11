import { NextResponse } from 'next/server';
import { requireRole } from '../../../../utils/requireRole';
import { Role } from '@prisma/client';
import { importCsv } from '../../../../services/feedbackImportService';
import { AppError } from '../../../../utils/AppError';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const sessionUser = await requireRole(Role.ADMIN, Role.ANALYST);
    const workspaceId = (sessionUser as any).workspaceId;
    const formData = await request.formData();
    const file = formData.get('file');
    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'CSV file missing' } }, { status: 400 });
    }
    const text = await file.text();
    const summary = await importCsv(workspaceId, text);
    if (summary.errors?.length > 0 && summary.imported === 0 && summary.errors[0]?.message?.includes('1,000 rows')) {
      return NextResponse.json({ error: { code: 'PAYLOAD_TOO_LARGE', message: summary.errors[0].message } }, { status: 413 });
    }
    return NextResponse.json({ data: summary });
  } catch (e: any) {
    if (e instanceof AppError) {
      return NextResponse.json(
        { error: { code: e.statusCode === 401 ? 'UNAUTHORIZED' : 'FORBIDDEN', message: e.message } },
        { status: e.statusCode }
      );
    }
    if (e.message === 'IMPORT_ERROR') {
      return NextResponse.json({ error: { code: 'IMPORT_ERROR', message: 'Failed to parse CSV' } }, { status: 400 });
    }
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: 'An internal server error occurred.' } }, { status: 500 });
  }
}

