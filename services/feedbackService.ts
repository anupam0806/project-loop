import { prisma } from "../lib/db";
import { feedbackCreateSchema } from "../lib/validation/feedback";
import { z } from "zod";

// Allow-listed sort fields per File 04 Section 26
const ALLOWED_SORT_FIELDS: Record<string, string> = {
  createdAt: 'createdAt',
  sentiment: 'sentiment',
  status: 'status',
  channel: 'channel',
  updatedAt: 'updatedAt',
};

// List feedback with filtering, pagination, and sorting
export async function listFeedback(params: {
  workspaceId: string;
  q?: string;
  channel?: string;
  sentiment?: string;
  status?: string;
  featureArea?: string;
  page: number;
  pageSize: number;
  sort?: string;
  order?: string;
}) {
  const { workspaceId, q, channel, sentiment, status, featureArea, page, pageSize, sort, order } = params;
  const where: any = { workspaceId };
  if (q) where.text = { contains: q, mode: "insensitive" };
  if (channel) where.channel = channel;
  if (sentiment) where.sentiment = sentiment;
  if (status) where.status = status;
  if (featureArea) where.featureArea = { contains: featureArea, mode: "insensitive" };
  const orderBy: any = {};
  const safeSortField = sort && ALLOWED_SORT_FIELDS[sort] ? ALLOWED_SORT_FIELDS[sort] : 'createdAt';
  orderBy[safeSortField] = order ?? 'desc';
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
  return { data, meta: { page, pageSize, total, totalPages } };
}

// Create feedback (ADMIN or ANALYST)
export async function createFeedback(workspaceId: string, payload: any) {
  const parsed = feedbackCreateSchema.safeParse(payload);
  if (!parsed.success) {
    const err = new Error("VALIDATION_ERROR");
    (err as any).fields = parsed.error.flatten().fieldErrors;
    throw err;
  }
  const { text, channel, featureArea } = parsed.data;
  const feedback = await prisma.feedback.create({
    data: { workspaceId, text, channel, featureArea },
    select: { id: true, text: true, channel: true, status: true, featureArea: true, createdAt: true },
  });
  return feedback;
}

// Get single feedback
export async function getFeedback(workspaceId: string, id: string) {
  const feedback = await prisma.feedback.findFirst({
    where: { id, workspaceId },
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
  return feedback;
}

// Update feedback with status transition validation
function validateStatusTransition(current: string, next: string): boolean {
  const allowed: Record<string, string> = { NEW: "REVIEWED", REVIEWED: "ACTIONED" };
  return allowed[current] === next;
}

export async function updateFeedback(workspaceId: string, id: string, payload: any) {
  const updateSchema = z.object({
    text: z.string().min(1).optional(),
    channel: z.enum(["SUPPORT","APP_REVIEW","SURVEY","SALES","SOCIAL","SIMULATED"]).optional(),
    featureArea: z.string().optional(),
    status: z.enum(["NEW","REVIEWED","ACTIONED"]).optional(),
  });
  const parsed = updateSchema.safeParse(payload);
  if (!parsed.success) {
    const err = new Error("VALIDATION_ERROR");
    (err as any).fields = parsed.error.flatten().fieldErrors;
    throw err;
  }
  const existing = await prisma.feedback.findUnique({ where: { id } });
  if (!existing || existing.workspaceId !== workspaceId) return null;
  if (parsed.data.status && parsed.data.status !== existing.status) {
    if (!validateStatusTransition(existing.status, parsed.data.status)) {
      const err = new Error("INVALID_STATUS_TRANSITION");
      throw err;
    }
  }
  const updated = await prisma.feedback.update({
    where: { id },
    data: parsed.data,
    select: { id: true, text: true, channel: true, featureArea: true, status: true, updatedAt: true },
  });
  return updated;
}

export async function deleteFeedback(workspaceId: string, id: string) {
  const existing = await prisma.feedback.findUnique({ where: { id } });
  if (!existing || existing.workspaceId !== workspaceId) return false;
  await prisma.feedback.delete({ where: { id } });
  return true;
}
