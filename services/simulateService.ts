import { prisma } from "../lib/db";
import { z } from "zod";

const simulateSchema = z.object({
  text: z.string().trim().min(1, "Text is required").max(5000, "Text must not exceed 5,000 characters"),
  featureArea: z.string().trim().max(100, "Feature area must not exceed 100 characters").optional(),
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
