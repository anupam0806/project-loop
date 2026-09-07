import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/db';
import { requireAuth } from '../../../../utils/requireAuth';
import { requireRole } from '../../../../utils/requireRole';
import { AppError } from '../../../../utils/AppError';
import { Role } from '@prisma/client';
import { z } from 'zod';
import { parse } from 'csv-parse/sync';

// CSV row schema matching feedbackCreateSchema plus required fields
const csvRowSchema = z.object({
  text: z.string().min(1),
  channel: z.enum(['SUPPORT','APP_REVIEW','SURVEY','SALES','SOCIAL','SIMULATED']),
  featureArea: z.string().optional(),
});

export async function POST(request: Request) {
  const sessionUser = await requireRole(Role.ADMIN, Role.ANALYST);
  const workspaceId = (sessionUser as any).workspaceId;
  // Assuming multipart/form-data with field 'file' containing CSV text
  const formData = await request.formData();
  const file = formData.get('file');
  if (!file || !(file instanceof Blob)) {
    return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'CSV file missing' } }, { status: 400 });
  }
  const text = await file.text();
  let records: any[];
  try {
    records = parse(text, { columns: true, skip_empty_lines: true, trim: true });
  } catch (e) {
    return NextResponse.json({ error: { code: 'IMPORT_ERROR', message: 'Failed to parse CSV' } }, { status: 400 });
  }
  const errors: any[] = [];
  const toCreate: any[] = [];
  records.forEach((row, idx) => {
    const result = csvRowSchema.safeParse(row);
    if (!result.success) {
      errors.push({ row: idx + 1, message: result.error.message });
    } else {
      toCreate.push({ ...result.data, workspaceId });
    }
  });
  // Insert valid rows in a transaction
  const created = await prisma.$transaction(toCreate.map(data => prisma.feedback.create({ data, select: { id: true } })));
  const summary = { totalRows: records.length, imported: created.length, failed: errors.length, errors };
  return NextResponse.json({ data: summary });
}
