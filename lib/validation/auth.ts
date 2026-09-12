import { z } from "zod";

export const signupSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100, "Name must not exceed 100 characters"),
  email: z.string().trim().email("Invalid email address").max(255, "Email must not exceed 255 characters"),
  password: z.string().min(6, "Password must be at least 6 characters").max(128, "Password must not exceed 128 characters"),
  workspaceName: z.string().trim().min(1, "Workspace name is required").max(100, "Workspace name must not exceed 100 characters"),
});

export type SignupInput = z.infer<typeof signupSchema>;

