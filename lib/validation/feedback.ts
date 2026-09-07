import { z } from "zod";

export const feedbackCreateSchema = z.object({
  text: z.string().min(1),
  channel: z.enum(["SUPPORT","APP_REVIEW","SURVEY","SALES","SOCIAL","SIMULATED"]),
  featureArea: z.string().optional(),
});
