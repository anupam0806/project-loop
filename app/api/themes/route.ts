import { NextResponse } from 'next/server';
import { requireAuth } from '../../../utils/requireAuth';
import { requireRole } from '../../../utils/requireRole';
import { Role } from '@prisma/client';
import { z } from 'zod';
import { listThemes, createTheme } from '../../../services/themeService';

export async function GET() {
  const sessionUser = await requireAuth();
  const workspaceId = (sessionUser as any).workspaceId;
  const themes = await listThemes(workspaceId);
  return NextResponse.json({ data: themes });
}

export async function POST(request: Request) {
  const sessionUser = await requireRole(Role.ADMIN, Role.ANALYST);
  const workspaceId = (sessionUser as any).workspaceId;
  const json = await request.json();
  try {
    const theme = await createTheme(workspaceId, json);
    return NextResponse.json({ data: theme }, { status: 201 });
  } catch (e: any) {
    if (e.message === 'VALIDATION_ERROR') {
      return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid body', fields: e.fields } }, { status: 400 });
    }
    throw e;
  }
}
