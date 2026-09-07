import { NextResponse } from 'next/server';
import { requireAuth } from '../../../../utils/requireAuth';
import { requireRole } from '../../../../utils/requireRole';
import { AppError } from '../../../../utils/AppError';
import { Role } from '@prisma/client';
import { z } from 'zod';
import { getFeedback, updateFeedback, deleteFeedback } from '../../../../services/feedbackService';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const sessionUser = await requireAuth();
  const workspaceId = (sessionUser as any).workspaceId;
  const feedback = await getFeedback(workspaceId, params.id);
  if (!feedback) {
    return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Feedback not found' } }, { status: 404 });
  }
  return NextResponse.json({ data: feedback });
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const sessionUser = await requireRole(Role.ADMIN, Role.ANALYST);
  const workspaceId = (sessionUser as any).workspaceId;
  const json = await request.json();
  try {
    const updated = await updateFeedback(workspaceId, params.id, json);
    if (!updated) {
      return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Feedback not found' } }, { status: 404 });
    }
    return NextResponse.json({ data: updated });
  } catch (e: any) {
    if (e.message === 'VALIDATION_ERROR') {
      return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid body', fields: e.fields } }, { status: 400 });
    }
    if (e.message === 'INVALID_STATUS_TRANSITION') {
      return NextResponse.json({ error: { code: 'INVALID_STATUS_TRANSITION', message: 'Invalid status transition' } }, { status: 409 });
    }
    throw e;
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const sessionUser = await requireRole(Role.ADMIN);
  const workspaceId = (sessionUser as any).workspaceId;
  const success = await deleteFeedback(workspaceId, params.id);
  if (!success) {
    return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Feedback not found' } }, { status: 404 });
  }
  return new Response(null, { status: 204 });
}
