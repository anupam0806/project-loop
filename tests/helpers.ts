import { prisma } from '../lib/db';

export async function ensureWorkspace(id: string, name = 'Test Workspace') {
  const existing = await prisma.workspace.findUnique({ where: { id } });
  if (!existing) {
    await prisma.workspace.create({ data: { id, name } });
  }
}
