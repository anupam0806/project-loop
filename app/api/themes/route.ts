import { NextResponse } from 'next/server';
import { requireAuth } from '../../../utils/requireAuth';
import { requireRole } from '../../../utils/requireRole';
import { Role } from '@prisma/client';
import { listThemes, createTheme } from '../../../services/themeService';
import { AppError } from '../../../utils/AppError';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const sessionUser = await requireAuth();
    const workspaceId = (sessionUser as any).workspaceId;
    const themes = await listThemes(workspaceId);
    return NextResponse.json({ data: themes });
  } catch (error: any) {
    if (error instanceof AppError) {
      return NextResponse.json(
        { error: { code: error.statusCode === 401 ? 'UNAUTHORIZED' : 'FORBIDDEN', message: error.message } },
        { status: error.statusCode }
      );
    }
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'An internal server error occurred.' } },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const sessionUser = await requireRole(Role.ADMIN, Role.ANALYST);
    const workspaceId = (sessionUser as any).workspaceId;
    const json = await request.json();
    const theme = await createTheme(workspaceId, json);
    return NextResponse.json({ data: theme }, { status: 201 });
  } catch (error: any) {
    if (error instanceof AppError) {
      return NextResponse.json(
        { error: { code: error.statusCode === 401 ? 'UNAUTHORIZED' : 'FORBIDDEN', message: error.message } },
        { status: error.statusCode }
      );
    }
    if (error.message === 'VALIDATION_ERROR') {
      return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid body', fields: error.fields } }, { status: 400 });
    }
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'An internal server error occurred.' } },
      { status: 500 }
    );
  }
}

