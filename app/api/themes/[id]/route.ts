import { NextResponse } from 'next/server';
import { requireAuth } from '../../../../utils/requireAuth';
import { requireRole } from '../../../../utils/requireRole';
import { Role } from '@prisma/client';
import { z } from 'zod';
import { getTheme, updateTheme } from '../../../../services/themeService';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const sessionUser = await requireAuth();
  const workspaceId = (sessionUser as any).workspaceId;
  const theme = await getTheme(workspaceId, params.id);
  if (!theme) {
    return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Theme not found' } }, { status: 404 });
  }
  return NextResponse.json({ data: theme });
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const sessionUser = await requireRole(Role.ADMIN, Role.ANALYST);
  const workspaceId = (sessionUser as any).workspaceId;
  const json = await request.json();
  try {
    const updated = await updateTheme(workspaceId, params.id, json);
    if (!updated) {
      return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Theme not found' } }, { status: 404 });
    }
    return NextResponse.json({ data: updated });
  } catch (e: any) {
    if (e.message === 'VALIDATION_ERROR') {
      return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid body', fields: e.fields } }, { status: 400 });
    }
    throw e;
  }
}
