import { prisma } from "../lib/db";
import { feedbackCreateSchema, feedbackUpdateSchema } from "../lib/validation/feedback";
import { z } from "zod";
import { classifyAndAssignThemes } from "./ai/classificationService";
import { embedAndPersist } from "./ai/embeddingService";
import { AIProvider } from "./ai/aiProvider";

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

  // Fire-and-forget classification (non-blocking)
  classifyAndAssignThemes(workspaceId, feedback.id, feedback.text).catch((err) => {
    console.warn(`Classification failed for feedback ${feedback.id}:`, err);
  });

  // Fire-and-forget embedding (non-blocking)
  embedAndPersist(workspaceId, feedback.id, feedback.text).catch((err) => {
    console.warn(`Embedding failed for feedback ${feedback.id}:`, err);
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
      urgency: true,
      category: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  if (!feedback) return null;

  try {
    const feedbackThemes = await prisma.feedbackTheme.findMany({
      where: { feedbackId: id },
      include: { theme: { select: { id: true, name: true } } },
    });
    const populatedThemes = await Promise.all(
      feedbackThemes.map(async (ft: any) => {
        if (ft.theme) return ft;
        const t = await prisma.theme.findUnique({ where: { id: ft.themeId } });
        return { ...ft, theme: t ? { id: t.id, name: t.name } : { id: ft.themeId, name: 'General' } };
      })
    );
    return {
      ...feedback,
      themes: populatedThemes,
    };
  } catch {
    return {
      ...feedback,
      themes: [],
    };
  }
}

// Trigger / retry AI analysis for a feedback item without changing its workflow status
export async function analyzeFeedback(workspaceId: string, id: string, customProvider?: AIProvider) {
  const feedback = await prisma.feedback.findFirst({
    where: { id, workspaceId },
    select: { id: true, text: true, status: true },
  });
  if (!feedback) return null;

  await classifyAndAssignThemes(workspaceId, feedback.id, feedback.text, customProvider);

  return getFeedback(workspaceId, id);
}

export async function updateFeedback(workspaceId: string, id: string, payload: any) {
  const parsed = feedbackUpdateSchema.safeParse(payload);
  if (!parsed.success) {
    const err = new Error("VALIDATION_ERROR");
    (err as any).fields = parsed.error.flatten().fieldErrors;
    throw err;
  }
  const existing = await prisma.feedback.findUnique({ where: { id } });
  if (!existing || existing.workspaceId !== workspaceId) return null;

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
