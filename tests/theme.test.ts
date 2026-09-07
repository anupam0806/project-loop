/**
 * Theme Service Tests
 * Covers: CRUD, tenant isolation for themes
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { mockPrisma, resetStores } from './__mocks__/prisma';
import { createTheme, getTheme, listThemes, updateTheme } from '../services/themeService';

beforeEach(() => {
  resetStores();
});

describe('Theme CRUD', () => {
  const ws = 'theme-ws';

  it('creates a theme with valid input', async () => {
    const theme = await createTheme(ws, { name: 'Checkout Issues' });
    expect(theme).toHaveProperty('id');
    expect(theme.name).toBe('Checkout Issues');
  });

  it('creates a theme with description', async () => {
    const theme = await createTheme(ws, { name: 'Performance', description: 'Speed issues' });
    expect(theme.name).toBe('Performance');
  });

  it('rejects empty theme name', async () => {
    await expect(createTheme(ws, { name: '' })).rejects.toThrow('VALIDATION_ERROR');
  });

  it('rejects missing name', async () => {
    await expect(createTheme(ws, {})).rejects.toThrow('VALIDATION_ERROR');
  });

  it('retrieves a theme by ID', async () => {
    const created = await createTheme(ws, { name: 'Retrieval Test' });
    const fetched = await getTheme(ws, created.id);
    expect(fetched).not.toBeNull();
    expect(fetched!.name).toBe('Retrieval Test');
  });

  it('returns null for non-existent theme', async () => {
    const fetched = await getTheme(ws, 'nonexistent');
    expect(fetched).toBeNull();
  });

  it('lists themes for workspace', async () => {
    await createTheme(ws, { name: 'Theme 1' });
    await createTheme(ws, { name: 'Theme 2' });
    const list = await listThemes(ws);
    expect(list.length).toBe(2);
  });

  it('updates theme name', async () => {
    const theme = await createTheme(ws, { name: 'Old Name' });
    const updated = await updateTheme(ws, theme.id, { name: 'New Name' });
    expect(updated!.name).toBe('New Name');
  });

  it('updates theme description', async () => {
    const theme = await createTheme(ws, { name: 'Desc Test' });
    const updated = await updateTheme(ws, theme.id, { description: 'Updated desc' });
    expect(updated).not.toBeNull();
  });

  it('returns null when updating non-existent theme', async () => {
    const result = await updateTheme(ws, 'nonexistent', { name: 'Nope' });
    expect(result).toBeNull();
  });

  it('rejects empty name in update', async () => {
    const theme = await createTheme(ws, { name: 'Valid' });
    await expect(updateTheme(ws, theme.id, { name: '' })).rejects.toThrow('VALIDATION_ERROR');
  });
});

describe('Theme Tenant Isolation', () => {
  const wsA = 'theme-tenant-a';
  const wsB = 'theme-tenant-b';

  it('workspace A cannot read workspace B themes', async () => {
    const theme = await createTheme(wsA, { name: 'Secret Theme' });
    const fetched = await getTheme(wsB, theme.id);
    expect(fetched).toBeNull();
  });

  it('workspace A cannot update workspace B themes', async () => {
    const theme = await createTheme(wsA, { name: 'Protected' });
    const result = await updateTheme(wsB, theme.id, { name: 'Hacked' });
    expect(result).toBeNull();
  });

  it('listThemes only returns own workspace themes', async () => {
    await createTheme(wsA, { name: 'A Theme' });
    await createTheme(wsB, { name: 'B Theme' });

    const listA = await listThemes(wsA);
    const listB = await listThemes(wsB);

    expect(listA.every((t: any) => t.name !== 'B Theme')).toBe(true);
    expect(listB.every((t: any) => t.name !== 'A Theme')).toBe(true);
  });
});
