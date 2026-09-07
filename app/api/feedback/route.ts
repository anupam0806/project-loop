import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/db';
import { feedbackCreateSchema } from '../../../lib/validation/feedback';
import { requireAuth } from '../../../utils/requireAuth';
import { requireRole } from '../../../utils/requireRole';
import { AppError } from '../../../utils/AppError';
import { Role } from '@prisma/client';
import { z } from 'zod';

// Query validation schema
const feedbackListQuerySchema = z.object({
  q: z.string().optional(),
  channel: z.enum(['SUPPORT','APP_REVIEW','SURVEY','SALES','SOCIAL','SIMULATED']).optional(),
  sentiment: z.enum(['POSITIVE','NEUTRAL','NEGATIVE','MIXED']).optional(),
  status: z.enum(['NEW','REVIEWED','ACTIONED']).optional(),
  featureArea: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  sort: z.enum(['createdAt','sentiment','status']).optional(),
  order: z.enum(['asc','desc']).optional(),
});

export async function GET(request: Request) {
  const url = new URL(request.url);
  const sessionUser = await requireAuth(); // throws 401 if not auth
  const workspaceId = (sessionUser as any).workspaceId;
  const parsed = feedbackListQuerySchema.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) {
    return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid query parameters', fields: parsed.error.flatten().fieldErrors } }, { status: 400 });
  }
  const { q, channel, sentiment, status, featureArea, page, pageSize, sort, order } = parsed.data;
  const where: any = { workspaceId };
  if (q) where.text = { contains: q, mode: 'insensitive' };
  if (channel) where.channel = channel;
  if (sentiment) where.sentiment = sentiment;
  if (status) where.status = status;
  if (featureArea) where.featureArea = { contains: featureArea, mode: 'insensitive' };

  const orderBy: any = {};
  if (sort) orderBy[sort] = order ?? 'desc';

  const [total, data] = await Promise.all([
    prisma.feedback.count({ where }),
    prisma.feedback.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        text: true,
        channel: true,
        sentiment: true,
        status: true,
        featureArea: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
  ]);

  const totalPages = Math.ceil(total / pageSize);
  return NextResponse.json({ data, meta: { page, pageSize, total, totalPages } });
}

export async function POST(request: Request) {
  const sessionUser = await requireRole(Role.ADMIN, Role.ANALYST);
  const workspaceId = (sessionUser as any).workspaceId;
  const json = await request.json();
  const parsed = feedbackCreateSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid request body', fields: parsed.error.flatten().fieldErrors } }, { status: 400 });
  }
  const { text, channel, featureArea } = parsed.data;
  const feedback = await prisma.feedback.create({
    data: {
      workspaceId,
      text,
      channel,
      featureArea,
    },
    select: {
      id: true,
      text: true,
      channel: true,
      status: true,
      featureArea: true,
      createdAt: true,
    },
  });
  return NextResponse.json({ data: feedback }, { status: 201 });
}
