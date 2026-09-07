import { NextResponse } from 'next/server';
import { requireRole } from '../../../../utils/requireRole';
import { Role } from '@prisma/client';
import { importCsv } from '../../../../services/feedbackImportService';

export async function POST(request: Request) {
  const sessionUser = await requireRole(Role.ADMIN, Role.ANALYST);
  const workspaceId = (sessionUser as any).workspaceId;
  const formData = await request.formData();
  const file = formData.get('file');
  if (!file || !(file instanceof Blob)) {
    return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'CSV file missing' } }, { status: 400 });
  }
  const text = await file.text();
  try {
    const summary = await importCsv(workspaceId, text);
    return NextResponse.json({ data: summary });
  } catch (e: any) {
    if (e.message === 'IMPORT_ERROR') {
      return NextResponse.json({ error: { code: 'IMPORT_ERROR', message: 'Failed to parse CSV' } }, { status: 400 });
    }
    throw e;
  }
}
