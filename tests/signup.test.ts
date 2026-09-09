import { describe, it, expect, beforeEach } from 'vitest';
import { signup } from '../services/workspaceService';
import { resetStores, mockPrisma } from './__mocks__/prisma';

describe('Signup and Workspace Registration Flow', () => {
  beforeEach(() => {
    resetStores();
  });

  it('successfully creates workspace and assigns ADMIN role to creator', async () => {
    const result = await signup({
      name: 'John Founder',
      email: 'john@startup.com',
      password: 'securepassword123',
      workspaceName: 'Acme Startup',
    });

    expect(result.workspace).toBeDefined();
    expect(result.workspace.name).toBe('Acme Startup');
    expect(result.user).toBeDefined();
    expect(result.user.name).toBe('John Founder');
    expect(result.user.email).toBe('john@startup.com');
    expect(result.user.role).toBe('ADMIN');
    expect(result.user.workspaceId).toBe(result.workspace.id);
  });

  it('rejects duplicate email during signup', async () => {
    await signup({
      name: 'User One',
      email: 'duplicate@test.com',
      password: 'password123',
      workspaceName: 'Workspace One',
    });

    await expect(
      signup({
        name: 'User Two',
        email: 'duplicate@test.com',
        password: 'password456',
        workspaceName: 'Workspace Two',
      })
    ).rejects.toThrow('already exists');
  });
});
