import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/db';
import { requireAuth } from '../../../../utils/requireAuth';
import { requireRole } from '../../../../utils/requireRole';
import { Role } from '@prisma/client';
import { z } from 'zod';

const themeUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
});

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const sessionUser = await requireAuth();
  const workspaceId = (sessionUser as any).workspaceId;
  const theme = await prisma.theme.findFirst({
    where: { id: params.id, workspaceId },
    select: { id: true, name: true, description: true, createdAt: true },
  });
  if (!theme) {
    return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Theme not found' } }, { status: 404 });
  }
  return NextResponse.json({ data: theme });
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const sessionUser = await requireRole(Role.ADMIN, Role.ANALYST);
  const workspaceId = (sessionUser as any).workspaceId;
  const json = await request.json();
  const parsed = themeUpdateSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid body', fields: parsed.error.flatten().fieldErrors } }, { status: 400 });
  }
  const existing = await prisma.theme.findFirst({ where: { id: params.id, workspaceId } });
  if (!existing) {
    return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Theme not found' } }, { status: 404 });
  }
  const updated = await prisma.theme.update({
    where: { id: params.id },
    data: parsed.data,
    select: { id: true, name: true, description: true, updatedAt: true },
  });
  return NextResponse.json({ data: updated });
}
