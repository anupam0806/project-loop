import { describe, it, expect } from 'vitest';
import { ensureWorkspace } from './helpers';
import { createTheme, getTheme, updateTheme } from '../services/themeService';
import { describe, it, expect } from 'vitest';

const workspace = 'theme-ws';

describe('Theme Service', () => {
  beforeAll(async () => {
    await ensureWorkspace(workspace);
  });

  it('creates and retrieves theme', async () => {
    const theme = await createTheme(workspace, { name: 'Test Theme' });
    const fetched = await getTheme(workspace, theme.id);
    expect(fetched?.name).toBe('Test Theme');
  });

  it('updates theme', async () => {
    const theme = await createTheme(workspace, { name: 'Old' });
    const updated = await updateTheme(workspace, theme.id, { name: 'New' });
    expect(updated?.name).toBe('New');
  });
});

