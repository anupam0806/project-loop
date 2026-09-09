import { describe, it, expect, beforeEach } from 'vitest';
import {
  getWorkspace,
  listWorkspaceUsers,
  createWorkspaceUser,
  updateWorkspaceUser,
  deleteWorkspaceUser,
} from '../services/workspaceService';
import { resetStores, mockPrisma } from './__mocks__/prisma';

describe('Workspace & User Management Service', () => {
  const ws1 = 'ws-test-1';
  const ws2 = 'ws-test-2';

  beforeEach(async () => {
    resetStores();
    await mockPrisma.workspace.create({ data: { id: ws1, name: 'Acme Corp' } });
    await mockPrisma.workspace.create({ data: { id: ws2, name: 'Beta Inc' } });
  });

  it('retrieves workspace metadata safely', async () => {
    const ws = await getWorkspace(ws1);
    expect(ws.name).toBe('Acme Corp');
    expect(ws.id).toBe(ws1);
  });

  it('manages workspace users within workspace scope', async () => {
    const admin = await createWorkspaceUser(ws1, {
      name: 'Alice Admin',
      email: 'alice@acme.com',
      password: 'password123',
      role: 'ADMIN',
    });

    const analyst = await createWorkspaceUser(ws1, {
      name: 'Bob Analyst',
      email: 'bob@acme.com',
      password: 'password123',
      role: 'ANALYST',
    });

    const users = await listWorkspaceUsers(ws1);
    expect(users.length).toBe(2);
    expect(users.map(u => u.email)).toContain('alice@acme.com');
    expect(users.map(u => u.email)).toContain('bob@acme.com');

    // Users in ws1 do not appear in ws2
    const ws2Users = await listWorkspaceUsers(ws2);
    expect(ws2Users.length).toBe(0);
  });

  it('prevents creating duplicate email addresses', async () => {
    await createWorkspaceUser(ws1, {
      name: 'Alice Admin',
      email: 'alice@acme.com',
      password: 'password123',
      role: 'ADMIN',
    });

    await expect(
      createWorkspaceUser(ws1, {
        name: 'Duplicate Alice',
        email: 'alice@acme.com',
        password: 'password456',
        role: 'VIEWER',
      })
    ).rejects.toThrow('already exists');
  });

  it('prevents removing or deleting the last admin', async () => {
    const admin = await createWorkspaceUser(ws1, {
      name: 'Sole Admin',
      email: 'admin@acme.com',
      password: 'password123',
      role: 'ADMIN',
    });

    const viewer = await createWorkspaceUser(ws1, {
      name: 'Dave Viewer',
      email: 'dave@acme.com',
      password: 'password123',
      role: 'VIEWER',
    });

    // Attempt to downgrade the sole admin
    await expect(
      updateWorkspaceUser(ws1, admin.id, { role: 'VIEWER' })
    ).rejects.toThrow('Cannot remove the last administrator');

    // Attempt to delete the sole admin by another user
    await expect(
      deleteWorkspaceUser(ws1, admin.id, viewer.id)
    ).rejects.toThrow('Cannot delete the last administrator');

    // Attempt self-deletion
    await expect(
      deleteWorkspaceUser(ws1, viewer.id, viewer.id)
    ).rejects.toThrow('cannot delete your own user account');
  });

  it('enforces tenant isolation: cannot modify user in another workspace', async () => {
    const ws1User = await createWorkspaceUser(ws1, {
      name: 'Ws1 User',
      email: 'user1@acme.com',
      password: 'password123',
      role: 'VIEWER',
    });

    // ws2 attempts to update ws1User
    await expect(
      updateWorkspaceUser(ws2, ws1User.id, { name: 'Hacked Name' })
    ).rejects.toThrow('User not found in workspace');

    // ws2 attempts to delete ws1User
    await expect(
      deleteWorkspaceUser(ws2, ws1User.id, 'some-ws2-admin')
    ).rejects.toThrow('User not found in workspace');
  });
});
