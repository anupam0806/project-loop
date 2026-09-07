import { getServerSession } from "next-auth";
import { authOptions } from "../app/auth/[...nextauth]/route";
import { AppError } from "../utils/AppError";

export async function requireAuth() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    throw new AppError("Authentication required", 401);
  }
  return session.user;
}

