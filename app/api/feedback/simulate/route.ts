import { NextResponse } from 'next/server';
import { requireRole } from '../../../../utils/requireRole';
import { Role } from '@prisma/client';
import { simulateIngestion } from '../../../../services/simulateService';
import { AppError } from '../../../../utils/AppError';

import { parseJsonBody } from '../../../../utils/safeJson';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const sessionUser = await requireRole(Role.ADMIN, Role.ANALYST);
    const workspaceId = (sessionUser as any).workspaceId;

    const bodyResult = await parseJsonBody(request);
    if (!bodyResult.success) {
      return bodyResult.response;
    }

    const feedback = await simulateIngestion(workspaceId, bodyResult.data);
    return NextResponse.json({ data: feedback }, { status: 201 });
  } catch (e: any) {
    if (e instanceof AppError) {
      return NextResponse.json(
        { error: { code: e.statusCode === 401 ? 'UNAUTHORIZED' : 'FORBIDDEN', message: e.message } },
        { status: e.statusCode }
      );
    }
    if (e.message === 'VALIDATION_ERROR') {
      return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid body', fields: e.fields } }, { status: 400 });
    }
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: 'An internal server error occurred.' } }, { status: 500 });
  }
}

