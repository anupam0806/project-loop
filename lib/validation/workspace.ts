import { z } from "zod";

export const inviteUserSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100, "Name must not exceed 100 characters"),
  email: z.string().trim().email("Invalid email address").max(255, "Email must not exceed 255 characters"),
  password: z.string().min(6, "Password must be at least 6 characters").max(128, "Password must not exceed 128 characters"),
  role: z.enum(["ADMIN", "ANALYST", "VIEWER"]),
});

export const updateUserSchema = z.object({
  name: z.string().trim().min(1, "Name cannot be empty").max(100, "Name must not exceed 100 characters").optional(),
  role: z.enum(["ADMIN", "ANALYST", "VIEWER"]).optional(),
});

export type InviteUserInput = z.infer<typeof inviteUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;

