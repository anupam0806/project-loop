import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/db';
import { requireAuth } from '../../../../utils/requireAuth';
import { requireRole } from '../../../../utils/requireRole';
import { Role } from '@prisma/client';
import { z } from 'zod';

const simulateSchema = z.object({
  text: z.string().min(1),
  featureArea: z.string().optional(),
});

export async function POST(request: Request) {
  const sessionUser = await requireRole(Role.ADMIN, Role.ANALYST);
  const workspaceId = (sessionUser as any).workspaceId;
  const json = await request.json();
  const parsed = simulateSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid body' } }, { status: 400 });
  }
  const feedback = await prisma.feedback.create({
    data: {
      workspaceId,
      text: parsed.data.text,
      channel: 'SIMULATED',
      featureArea: parsed.data.featureArea,
    },
    select: { id: true, text: true, channel: true, createdAt: true },
  });
  return NextResponse.json({ data: feedback }, { status: 201 });
}
