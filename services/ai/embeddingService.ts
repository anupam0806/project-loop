import { prisma } from '../../lib/db';

let pipelinePromise: Promise<any> | null = null;

async function getEmbeddingPipeline() {
  if (!pipelinePromise) {
    const { pipeline, env } = await import('@xenova/transformers');
    if (env && typeof process !== 'undefined' && process.env) {
      env.cacheDir = '/tmp/.transformers_cache';
    }
    pipelinePromise = pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  }
  return pipelinePromise;
}

export async function generateEmbedding(text: string): Promise<number[]> {
  // If we are in test mode and the mock is requested or we're simulating, we might just return dummy data,
  // but to preserve realism, we will use the local transformer in tests if possible.
  // Actually, for unit tests we can just mock the module or return a fixed length array.
  if (process.env.NODE_ENV === 'test' && text.includes('MOCK_EMBEDDING')) {
    return new Array(384).fill(0.1);
  }

  try {
    const pipe = await getEmbeddingPipeline();
    const output = await pipe(text, { pooling: 'mean', normalize: true });
    return Array.from(output.data);
  } catch (err) {
    console.error("Failed to generate embedding", err);
    throw err;
  }
}

export async function embedAndPersist(workspaceId: string, feedbackId: string, text: string) {
  const vector = await generateEmbedding(text);
  
  // Persist using Prisma.sql to safely cast
  const vectorString = `[${vector.join(',')}]`;
  
  // Clean up any existing embedding for this feedback
  await prisma.embedding.deleteMany({
    where: { feedbackId }
  });

  // Use raw sql because Prisma create doesn't support vector literals easily without raw query
  await prisma.$executeRaw`
    INSERT INTO "Embedding" (id, "workspaceId", "feedbackId", model, dimensions, vector, "createdAt")
    VALUES (
      gen_random_uuid(),
      ${workspaceId},
      ${feedbackId},
      'Xenova/all-MiniLM-L6-v2',
      384,
      CAST(${vectorString} AS vector),
      NOW()
    )
  `;
}
