import { NextResponse } from 'next/server';
import { requireRole } from '../../../../utils/requireRole';
import { Role } from '@prisma/client';
import { simulateIngestion } from '../../../../services/simulateService';

export async function POST(request: Request) {
  const sessionUser = await requireRole(Role.ADMIN, Role.ANALYST);
  const workspaceId = (sessionUser as any).workspaceId;
  const json = await request.json();
  try {
    const feedback = await simulateIngestion(workspaceId, json);
    return NextResponse.json({ data: feedback }, { status: 201 });
  } catch (e: any) {
    if (e.message === 'VALIDATION_ERROR') {
      return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid body' } }, { status: 400 });
    }
    throw e;
  }
}
