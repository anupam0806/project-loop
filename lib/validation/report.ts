import { z } from "zod";

export const createReportSchema = z.object({
  period: z.object({
    from: z.string().min(1, "Start date is required"),
    to: z.string().min(1, "End date is required"),
  }),
  title: z.string().min(1).max(200).optional(),
});

export const quoteItemSchema = z.object({
  feedbackId: z.string(),
  quote: z.string(),
});

export const keyThemeItemSchema = z.object({
  name: z.string(),
  observation: z.string(),
});

export const reportNarrativeSchema = z.object({
  summary: z.string(),
  keyThemes: z.array(keyThemeItemSchema),
  sentimentTrends: z.string(),
  recommendations: z.array(z.string()),
  quotes: z.array(quoteItemSchema),
});

export type CreateReportInput = z.infer<typeof createReportSchema>;
export type ReportNarrativeOutput = z.infer<typeof reportNarrativeSchema>;
