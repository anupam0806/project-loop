import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/db';
import { requireAuth } from '../../../../utils/requireAuth';
import { requireRole } from '../../../../utils/requireRole';
import { AppError } from '../../../../utils/AppError';
import { Role } from '@prisma/client';
import { z } from 'zod';

const feedbackUpdateSchema = z.object({
  text: z.string().min(1).optional(),
  channel: z.enum(['SUPPORT','APP_REVIEW','SURVEY','SALES','SOCIAL','SIMULATED']).optional(),
  featureArea: z.string().optional(),
  status: z.enum(['NEW','REVIEWED','ACTIONED']).optional(),
});

// Helper to enforce status workflow
function validateStatusTransition(current: string, next: string): boolean {
  const allowed: Record<string, string> = {
    NEW: 'REVIEWED',
    REVIEWED: 'ACTIONED',
  };
  return allowed[current] === next;
}

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const sessionUser = await requireAuth();
  const workspaceId = (sessionUser as any).workspaceId;
  const feedback = await prisma.feedback.findFirst({
    where: { id: params.id, workspaceId },
    select: {
      id: true,
      text: true,
      channel: true,
      sentiment: true,
      sentimentScore: true,
      featureArea: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  if (!feedback) {
    return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Feedback not found' } }, { status: 404 });
  }
  return NextResponse.json({ data: feedback });
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const sessionUser = await requireRole(Role.ADMIN, Role.ANALYST);
  const workspaceId = (sessionUser as any).workspaceId;
  const json = await request.json();
  const parsed = feedbackUpdateSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid body', fields: parsed.error.flatten().fieldErrors } }, { status: 400 });
  }
  const existing = await prisma.feedback.findUnique({ where: { id: params.id } });
  if (!existing || existing.workspaceId !== workspaceId) {
    return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Feedback not found' } }, { status: 404 });
  }
  if (parsed.data.status && parsed.data.status !== existing.status) {
    if (!validateStatusTransition(existing.status, parsed.data.status)) {
      return NextResponse.json({ error: { code: 'INVALID_STATUS_TRANSITION', message: 'Invalid status transition' } }, { status: 409 });
    }
  }
  const updated = await prisma.feedback.update({
    where: { id: params.id },
    data: parsed.data,
    select: { id: true, text: true, channel: true, featureArea: true, status: true, updatedAt: true },
  });
  return NextResponse.json({ data: updated });
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const sessionUser = await requireRole(Role.ADMIN);
  const workspaceId = (sessionUser as any).workspaceId;
  const existing = await prisma.feedback.findUnique({ where: { id: params.id } });
  if (!existing || existing.workspaceId !== workspaceId) {
    return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Feedback not found' } }, { status: 404 });
  }
  await prisma.feedback.delete({ where: { id: params.id } });
  return new Response(null, { status: 204 });
}
