import { ensureWorkspace } from './helpers';
import { describe, it, expect } from 'vitest';
import { importCsv } from '../services/feedbackImportService';

const workspace = 'csv-ws';

const validCsv = `text,channel,featureArea\nGood feedback,SUPPORT,ui`;
const invalidCsv = `text,channel\nMissing channel,,`;

describe('CSV Import Service', () => {
  beforeAll(async () => {
    await ensureWorkspace(workspace);
  });

  it('imports valid rows', async () => {
    const result = await importCsv(workspace, validCsv);
    expect(result.imported).toBe(1);
    expect(result.failed).toBe(0);
  });

  it('reports errors for invalid rows', async () => {
    const result = await importCsv(workspace, invalidCsv);
    expect(result.imported).toBe(0);
    expect(result.failed).toBeGreaterThan(0);
  });
});
