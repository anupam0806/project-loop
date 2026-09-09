import { z } from "zod";

export const classificationResultSchema = z.object({
  sentiment: z.enum(["POSITIVE", "NEUTRAL", "NEGATIVE", "MIXED"]),
  sentimentScore: z.number().min(-1).max(1),
  urgency: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
  category: z.string(),
  themeNames: z.array(z.string()).min(1).max(3),
});

export const askLoopRequestSchema = z.object({
  question: z.string().trim().min(3).max(500),
});

export const citationSchema = z.object({
  feedbackId: z.string(),
  snippet: z.string(),
});

export const askLoopResponseSchema = z.object({
  answer: z.string(),
  citations: z.array(citationSchema),
  confidence: z.enum(["supported", "insufficient_evidence"]),
});
