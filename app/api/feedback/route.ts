import { NextResponse } from 'next/server';
import { feedbackListQuerySchema } from '../../../lib/validation/feedback';
import { requireAuth } from '../../../utils/requireAuth';
import { requireRole } from '../../../utils/requireRole';
import { AppError } from '../../../utils/AppError';
import { Role } from '@prisma/client';
import { z } from 'zod';
import { listFeedback, createFeedback } from '../../../services/feedbackService';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {

  const url = new URL(request.url);
  const sessionUser = await requireAuth();
  const workspaceId = (sessionUser as any).workspaceId;
  const parsed = feedbackListQuerySchema.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) {
    return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid query parameters', fields: parsed.error.flatten().fieldErrors } }, { status: 400 });
  }
  const result = await listFeedback({ workspaceId, ...parsed.data });
  return NextResponse.json(result);
}

export async function POST(request: Request) {
  const sessionUser = await requireRole(Role.ADMIN, Role.ANALYST);
  const workspaceId = (sessionUser as any).workspaceId;
  const json = await request.json();
  try {
    const feedback = await createFeedback(workspaceId, json);
    return NextResponse.json({ data: feedback }, { status: 201 });
  } catch (e: any) {
    if (e.message === 'VALIDATION_ERROR') {
      return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid request body', fields: e.fields } }, { status: 400 });
    }
    throw e;
  }
}
