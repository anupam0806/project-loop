import { z } from "zod";

export const feedbackCreateSchema = z.object({
  text: z.string().min(1),
  channel: z.enum(["SUPPORT","APP_REVIEW","SURVEY","SALES","SOCIAL","SIMULATED"]),
  featureArea: z.string().optional(),
});

export const feedbackListQuerySchema = z.object({
  q: z.string().optional(),
  channel: z.enum(["SUPPORT","APP_REVIEW","SURVEY","SALES","SOCIAL","SIMULATED"]).optional(),
  sentiment: z.enum(["POSITIVE","NEUTRAL","NEGATIVE","MIXED"]).optional(),
  status: z.enum(["NEW","REVIEWED","ACTIONED"]).optional(),
  featureArea: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(25),
  sort: z.string().optional(),
  order: z.enum(["asc","desc"]).optional(),
});
