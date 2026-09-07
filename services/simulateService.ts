import { prisma } from "../lib/db";
import { z } from "zod";

const simulateSchema = z.object({
  text: z.string().min(1),
  featureArea: z.string().optional(),
});

export async function simulateIngestion(workspaceId: string, payload: any) {
  const parsed = simulateSchema.safeParse(payload);
  if (!parsed.success) {
    const err = new Error("VALIDATION_ERROR");
    (err as any).fields = parsed.error.flatten().fieldErrors;
    throw err;
  }
  const { text, featureArea } = parsed.data;
  return prisma.feedback.create({
    data: { workspaceId, text, channel: "SIMULATED", featureArea },
    select: { id: true, text: true, channel: true, createdAt: true },
  });
}
