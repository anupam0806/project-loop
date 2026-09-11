import { NextResponse } from 'next/server';
import { requireAuth } from '../../../../utils/requireAuth';
import { requireRole } from '../../../../utils/requireRole';
import { Role } from '@prisma/client';
import { getTheme, updateTheme } from '../../../../services/themeService';
import { AppError } from '../../../../utils/AppError';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const sessionUser = await requireAuth();
    const workspaceId = (sessionUser as any).workspaceId;
    const theme = await getTheme(workspaceId, params.id);
    if (!theme) {
      return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Theme not found' } }, { status: 404 });
    }
    return NextResponse.json({ data: theme });
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

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const sessionUser = await requireRole(Role.ADMIN, Role.ANALYST);
    const workspaceId = (sessionUser as any).workspaceId;
    const json = await request.json();
    const updated = await updateTheme(workspaceId, params.id, json);
    if (!updated) {
      return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Theme not found' } }, { status: 404 });
    }
    return NextResponse.json({ data: updated });
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

