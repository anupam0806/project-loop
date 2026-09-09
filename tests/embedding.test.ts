import { describe, it, expect, beforeEach, vi } from 'vitest';
import { embedAndPersist } from '../services/ai/embeddingService';
import { resetStores } from './__mocks__/prisma';
import { prisma } from '../lib/db';

describe('Embedding Service', () => {
  beforeEach(() => {
    resetStores();
  });

  it('embeds and persists successfully using raw sql', async () => {
    // This will trigger the MOCK_EMBEDDING code path returning 384 dimensions of 0.1
    await embedAndPersist('ws-1', 'fb-1', 'This is a MOCK_EMBEDDING test');
    
    // In our mock, executeRaw just returns 1, so we verify executeRaw was called
    expect(prisma.$executeRaw).toHaveBeenCalled();
  });
});
