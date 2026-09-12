import { prisma } from "../lib/db";
import { z } from "zod";

const themeCreateSchema = z.object({
  name: z.string().trim().min(1, "Theme name is required").max(100, "Theme name must not exceed 100 characters"),
  description: z.string().trim().max(1000, "Description must not exceed 1,000 characters").optional(),
});

export async function listThemes(workspaceId: string) {
  const themes = await prisma.theme.findMany({
    where: { workspaceId },
    select: { id: true, name: true, description: true, createdAt: true },
  });

  const feedbackThemes = await prisma.feedbackTheme.findMany({
    where: { theme: { workspaceId } },
    include: { feedback: { select: { sentiment: true } } },
  }).catch(() => []);

  return themes.map(t => {
    const matched = feedbackThemes.filter((ft: any) => ft.themeId === t.id);
    let positive = 0, negative = 0, neutral = 0, mixed = 0;
    for (const m of matched) {
      const sent = m.feedback?.sentiment;
      if (sent === 'POSITIVE') positive++;
      else if (sent === 'NEGATIVE') negative++;
      else if (sent === 'NEUTRAL') neutral++;
      else if (sent === 'MIXED') mixed++;
    }
    return {
      ...t,
      feedbackCount: matched.length,
      sentiments: { positive, negative, neutral, mixed },
    };
  });
}


export async function getTheme(workspaceId: string, id: string) {
  return prisma.theme.findFirst({ where: { id, workspaceId }, select: { id: true, name: true, description: true, createdAt: true } });
}

export async function createTheme(workspaceId: string, payload: any) {
  const parsed = themeCreateSchema.safeParse(payload);
  if (!parsed.success) {
    const err = new Error("VALIDATION_ERROR");
    (err as any).fields = parsed.error.flatten().fieldErrors;
    throw err;
  }
  const { name, description } = parsed.data;
  return prisma.theme.create({ data: { workspaceId, name, description }, select: { id: true, name: true, description: true, createdAt: true } });
}

export async function updateTheme(workspaceId: string, id: string, payload: any) {
  const updateSchema = z.object({
    name: z.string().trim().min(1, "Theme name cannot be empty").max(100, "Theme name must not exceed 100 characters").optional(),
    description: z.string().trim().max(1000, "Description must not exceed 1,000 characters").optional(),
  });
  const parsed = updateSchema.safeParse(payload);
  if (!parsed.success) {
    const err = new Error("VALIDATION_ERROR");
    (err as any).fields = parsed.error.flatten().fieldErrors;
    throw err;
  }
  const existing = await prisma.theme.findFirst({ where: { id, workspaceId } });
  if (!existing) return null;
  return prisma.theme.update({ where: { id }, data: parsed.data, select: { id: true, name: true, description: true, updatedAt: true } });
}
