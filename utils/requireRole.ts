import { requireAuth } from "../utils/requireAuth";
import { Role } from "@prisma/client";
import { AppError } from "../utils/AppError";

export async function requireRole(...required: Role[]) {
  const user = await requireAuth();
  if (!required.includes(user.role)) {
    throw new AppError(`Insufficient role: requires ${required.join(", ")}`, 403);
  }
  return user;
}
