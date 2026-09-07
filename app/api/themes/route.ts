import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/db';
import { requireAuth } from '../../../utils/requireAuth';
import { requireRole } from '../../../utils/requireRole';
import { Role } from '@prisma/client';
import { z } from 'zod';

const themeCreateSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
});

export async function GET() {
  const sessionUser = await requireAuth();
  const workspaceId = (sessionUser as any).workspaceId;
  const themes = await prisma.theme.findMany({
    where: { workspaceId },
    select: { id: true, name: true, description: true, createdAt: true },
  });
  return NextResponse.json({ data: themes });
}

export async function POST(request: Request) {
  const sessionUser = await requireRole(Role.ADMIN, Role.ANALYST);
  const workspaceId = (sessionUser as any).workspaceId;
  const json = await request.json();
  const parsed = themeCreateSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid body', fields: parsed.error.flatten().fieldErrors } }, { status: 400 });
  }
  const { name, description } = parsed.data;
  const theme = await prisma.theme.create({
    data: { workspaceId, name, description },
    select: { id: true, name: true, description: true, createdAt: true },
  });
  return NextResponse.json({ data: theme }, { status: 201 });
}
