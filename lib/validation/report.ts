import { z } from "zod";

export const createReportSchema = z.object({
  period: z.object({
    from: z.string().min(1, "Start date is required").refine((d) => !isNaN(Date.parse(d)), {
      message: "Invalid start date format.",
    }),
    to: z.string().min(1, "End date is required").refine((d) => !isNaN(Date.parse(d)), {
      message: "Invalid end date format.",
    }),
  }).refine((p) => new Date(p.from) <= new Date(p.to), {
    message: "Start date cannot be after end date.",
    path: ["from"],
  }),
  title: z.string().trim().min(1).max(200).optional(),
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
