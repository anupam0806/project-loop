import { prisma } from '../lib/db';
import bcrypt from 'bcryptjs';
import { Role } from '@prisma/client';
import { AppError } from '../utils/AppError';
import { InviteUserInput, UpdateUserInput } from '../lib/validation/workspace';
import { SignupInput } from '../lib/validation/auth';

export async function getWorkspace(workspaceId: string) {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: {
      id: true,
      name: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!workspace) {
    throw new AppError("Workspace not found", 404);
  }

  return workspace;
}

export async function listWorkspaceUsers(workspaceId: string) {
  const users = await prisma.user.findMany({
    where: { workspaceId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  return users;
}

export async function createWorkspaceUser(workspaceId: string, data: InviteUserInput) {
  const existing = await prisma.user.findUnique({
    where: { email: data.email },
  });

  if (existing) {
    throw new AppError("A user with this email already exists.", 409);
  }

  const passwordHash = await bcrypt.hash(data.password, 10);

  const user = await prisma.user.create({
    data: {
      workspaceId,
      name: data.name,
      email: data.email,
      passwordHash,
      role: data.role as Role,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
    },
  });

  return user;
}

export async function updateWorkspaceUser(
  workspaceId: string,
  targetUserId: string,
  data: UpdateUserInput
) {
  const targetUser = await prisma.user.findFirst({
    where: { id: targetUserId, workspaceId },
  });

  if (!targetUser) {
    throw new AppError("User not found in workspace.", 404);
  }

  // If downgrading an ADMIN to a different role, ensure there's at least one other ADMIN
  if (data.role && data.role !== 'ADMIN' && targetUser.role === 'ADMIN') {
    const adminCount = await prisma.user.count({
      where: { workspaceId, role: 'ADMIN' },
    });
    if (adminCount <= 1) {
      throw new AppError("Cannot remove the last administrator from the workspace.", 400);
    }
  }

  const updated = await prisma.user.update({
    where: { id: targetUserId },
    data: {
      ...(data.name ? { name: data.name } : {}),
      ...(data.role ? { role: data.role as Role } : {}),
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return updated;
}

export async function deleteWorkspaceUser(
  workspaceId: string,
  targetUserId: string,
  currentUserId: string
) {
  if (targetUserId === currentUserId) {
    throw new AppError("You cannot delete your own user account.", 400);
  }

  const targetUser = await prisma.user.findFirst({
    where: { id: targetUserId, workspaceId },
  });

  if (!targetUser) {
    throw new AppError("User not found in workspace.", 404);
  }

  if (targetUser.role === 'ADMIN') {
    const adminCount = await prisma.user.count({
      where: { workspaceId, role: 'ADMIN' },
    });
    if (adminCount <= 1) {
      throw new AppError("Cannot delete the last administrator from the workspace.", 400);
    }
  }

  await prisma.user.delete({
    where: { id: targetUserId },
  });

  return { success: true };
}

export async function signup(data: SignupInput) {
  const existing = await prisma.user.findUnique({
    where: { email: data.email },
  });

  if (existing) {
    throw new AppError("A user with this email already exists.", 409);
  }

  const passwordHash = await bcrypt.hash(data.password, 10);

  // Use a transaction to create workspace and admin user
  const result = await prisma.$transaction(async (tx: any) => {
    const workspace = await tx.workspace.create({
      data: {
        name: data.workspaceName,
      },
    });

    const user = await tx.user.create({
      data: {
        workspaceId: workspace.id,
        name: data.name,
        email: data.email,
        passwordHash,
        role: 'ADMIN',
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        workspaceId: true,
        createdAt: true,
      },
    });

    return { user, workspace };
  });

  return result;
}
