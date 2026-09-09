import { describe, it, expect, beforeEach } from 'vitest';
import { askLoopRAG } from '../services/ai/ragService';
import { resetStores, getFeedbackStore, mockPrisma } from './__mocks__/prisma';

describe('RAG Service', () => {
  beforeEach(() => {
    resetStores();
  });

  it('answers question with sufficient evidence', async () => {
    const feedbackStore = getFeedbackStore();
    feedbackStore.push({ id: 'fb-1', workspaceId: 'ws-1', text: 'This is great evidence', channel: 'SUPPORT' });
    
    // We add to the mock embedding store to simulate vector search results
    mockPrisma.embedding.create({ data: { id: 'em-1', workspaceId: 'ws-1', feedbackId: 'fb-1', model: 'mock', dimensions: 384, vector: 'mock' }});

    const response = await askLoopRAG('ws-1', 'MOCK_EMBEDDING what is the evidence?');

    expect(response.confidence).toBe('supported');
    expect(response.citations.length).toBeGreaterThan(0);
    expect(response.citations[0].feedbackId).toBe('fb-1');
  });

  it('handles insufficient evidence', async () => {
    const response = await askLoopRAG('ws-1', 'MOCK_EMBEDDING INSUFFICIENT');

    expect(response.confidence).toBe('insufficient_evidence');
    expect(response.citations.length).toBe(0);
  });
});
