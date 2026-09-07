import { prisma } from "../lib/db";
import { z } from "zod";

const themeCreateSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
});

export async function listThemes(workspaceId: string) {
  return prisma.theme.findMany({ where: { workspaceId }, select: { id: true, name: true, description: true, createdAt: true } });
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
    name: z.string().min(1).optional(),
    description: z.string().optional(),
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
