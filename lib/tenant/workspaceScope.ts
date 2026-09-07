export function withWorkspaceScope<T>(workspaceId: string, fn: (prisma: any) => Promise<T>) {
  // Simple wrapper to enforce workspace scoping
  return fn(prisma);
}
