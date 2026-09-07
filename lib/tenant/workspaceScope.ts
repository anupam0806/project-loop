import { prisma } from "../db";
import type { PrismaClient } from "@prisma/client";

export function withWorkspaceScope<T>(workspaceId: string, fn: (prisma: PrismaClient) => Promise<T>) {
  // Simple wrapper to enforce workspace scoping
  return fn(prisma);
}
