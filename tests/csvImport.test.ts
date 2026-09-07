/**
 * CSV Import Service Tests
 * Covers: valid CSV, invalid rows, missing fields, invalid channels,
 *         malformed data, row-level validation errors
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { mockPrisma, resetStores } from './__mocks__/prisma';
import { importCsv } from '../services/feedbackImportService';

beforeEach(() => {
  resetStores();
});

describe('CSV Import Service', () => {
  const ws = 'csv-ws';

  it('imports valid CSV rows', async () => {
    const csv = 'text,channel,featureArea\nGreat product,SUPPORT,checkout\nLove it,APP_REVIEW,ui';
    const result = await importCsv(ws, csv);
    expect(result.totalRows).toBe(2);
    expect(result.imported).toBe(2);
    expect(result.failed).toBe(0);
    expect(result.errors).toHaveLength(0);
  });

  it('reports errors for rows with missing text', async () => {
    const csv = 'text,channel,featureArea\n,SUPPORT,checkout';
    const result = await importCsv(ws, csv);
    expect(result.imported).toBe(0);
    expect(result.failed).toBe(1);
    expect(result.errors.length).toBe(1);
    expect(result.errors[0].row).toBe(1);
  });

  it('reports errors for rows with invalid channel', async () => {
    const csv = 'text,channel,featureArea\nFeedback text,INVALID_CHANNEL,checkout';
    const result = await importCsv(ws, csv);
    expect(result.imported).toBe(0);
    expect(result.failed).toBe(1);
    expect(result.errors[0].row).toBe(1);
  });

  it('reports errors for rows with missing channel', async () => {
    const csv = 'text,channel\nFeedback text,';
    const result = await importCsv(ws, csv);
    expect(result.imported).toBe(0);
    expect(result.failed).toBe(1);
  });

  it('handles mix of valid and invalid rows', async () => {
    const csv = 'text,channel,featureArea\nValid feedback,SUPPORT,checkout\n,SUPPORT,ui\nAnother valid,SURVEY,api\nBad channel,BOGUS,';
    const result = await importCsv(ws, csv);
    expect(result.totalRows).toBe(4);
    expect(result.imported).toBe(2);
    expect(result.failed).toBe(2);
    expect(result.errors).toHaveLength(2);
  });

  it('handles completely empty CSV', async () => {
    const csv = '';
    const result = await importCsv(ws, csv);
    expect(result.totalRows).toBe(0);
    expect(result.imported).toBe(0);
  });

  it('handles CSV with only headers', async () => {
    const csv = 'text,channel,featureArea';
    const result = await importCsv(ws, csv);
    expect(result.totalRows).toBe(0);
    expect(result.imported).toBe(0);
    expect(result.failed).toBe(0);
  });

  it('handles malformed CSV gracefully', async () => {
    const csv = 'not,,a,,proper,,csv"""""';
    const result = await importCsv(ws, csv);
    // Should either parse with errors or return parse failure
    expect(result).toBeDefined();
    expect(typeof result.totalRows).toBe('number');
  });

  it('accepts all valid channel types in CSV', async () => {
    const csv = 'text,channel\nSup,SUPPORT\nApp,APP_REVIEW\nSurv,SURVEY\nSale,SALES\nSoc,SOCIAL\nSim,SIMULATED';
    const result = await importCsv(ws, csv);
    expect(result.imported).toBe(6);
    expect(result.failed).toBe(0);
  });

  it('imports feedback into the correct workspace', async () => {
    const csv = 'text,channel\nWorkspace test,SUPPORT';
    await importCsv(ws, csv);
    const { getFeedbackStore } = await import('./__mocks__/prisma');
    const store = getFeedbackStore();
    const imported = store.find((f: any) => f.text === 'Workspace test');
    expect(imported).toBeDefined();
    expect(imported.workspaceId).toBe(ws);
  });

  it('provides row numbers in error reports', async () => {
    const csv = 'text,channel\nValid,SUPPORT\n,SUPPORT\nAnother valid,SURVEY\n,BOGUS';
    const result = await importCsv(ws, csv);
    expect(result.errors.length).toBe(2);
    // Row numbers should be present
    for (const err of result.errors) {
      expect(err.row).toBeGreaterThan(0);
      expect(typeof err.message).toBe('string');
    }
  });
});
