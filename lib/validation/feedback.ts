import { z } from "zod";

export const feedbackCreateSchema = z.object({
  text: z.string().trim().min(1, "Feedback text is required").max(5000, "Feedback text must not exceed 5,000 characters"),
  channel: z.enum(["SUPPORT","APP_REVIEW","SURVEY","SALES","SOCIAL","SIMULATED"]),
  featureArea: z.string().trim().max(100, "Feature area must not exceed 100 characters").optional(),
});

export const feedbackUpdateSchema = z.object({
  text: z.string().trim().min(1, "Feedback text cannot be empty").max(5000, "Feedback text must not exceed 5,000 characters").optional(),
  channel: z.enum(["SUPPORT","APP_REVIEW","SURVEY","SALES","SOCIAL","SIMULATED"]).optional(),
  featureArea: z.string().trim().max(100, "Feature area must not exceed 100 characters").optional(),
  status: z.enum(["NEW","REVIEWED","ACTIONED"]).optional(),
});

export const feedbackListQuerySchema = z.object({
  q: z.string().trim().max(500, "Search query must not exceed 500 characters").optional(),
  channel: z.enum(["SUPPORT","APP_REVIEW","SURVEY","SALES","SOCIAL","SIMULATED"]).optional(),
  sentiment: z.enum(["POSITIVE","NEUTRAL","NEGATIVE","MIXED"]).optional(),
  status: z.enum(["NEW","REVIEWED","ACTIONED"]).optional(),
  featureArea: z.string().trim().max(100, "Feature area filter must not exceed 100 characters").optional(),
  page: z.coerce.number().int().positive("Page must be a positive integer").max(100000).default(1),
  pageSize: z.coerce.number().int().positive("Page size must be a positive integer").max(100, "Page size cannot exceed 100").default(25),
  sort: z.string().max(50, "Sort field name must not exceed 50 characters").optional(),
  order: z.enum(["asc","desc"]).optional(),
});

