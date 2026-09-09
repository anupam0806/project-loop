import { prisma } from '../../lib/db';
import { Prisma } from '@prisma/client';
import { generateEmbedding } from './embeddingService';
import { ClaudeProvider } from './claudeProvider';
import { MockAIProvider } from './mockAIProvider';

export async function askLoopRAG(workspaceId: string, question: string, requestedLimit?: number) {
  const queryEmbedding = await generateEmbedding(question);
  const vectorString = `[${queryEmbedding.join(',')}]`;
  const maxDistance = 0.65;
  const limit = Math.min(requestedLimit || 5, 10); // Default top-K 5, Max 10

  // Execute pgvector search scoped to workspace
  // We use Prisma.sql to safely inject the workspaceId and limits
  const results = await prisma.$queryRaw<Array<{ feedbackId: string; distance: number; text: string; channel: string }>>`
    SELECT e."feedbackId", (e.vector <=> CAST(${vectorString} AS vector)) AS distance, f.text, f.channel
    FROM "Embedding" e
    JOIN "Feedback" f ON e."feedbackId" = f.id
    WHERE e."workspaceId" = ${workspaceId}
      AND (e.vector <=> CAST(${vectorString} AS vector)) <= ${maxDistance}
    ORDER BY distance ASC
    LIMIT ${limit};
  `;

  if (results.length === 0) {
    return {
      answer: "I do not have enough feedback evidence in this workspace to answer your question.",
      citations: [],
      confidence: "insufficient_evidence",
    };
  }

  const evidence = results.map(r => ({
    id: r.feedbackId,
    text: r.text,
    channel: r.channel,
  }));

  const provider = process.env.NODE_ENV === 'test' ? new MockAIProvider() : new ClaudeProvider();
  
  const aiResponse = await provider.askLoop(question, { question, evidence });

  // Citation Validation
  const validIds = new Set(results.map(r => r.feedbackId));
  const validatedCitations = aiResponse.citations.filter(c => validIds.has(c.feedbackId)).map(c => {
    // Optionally replace hallucinated snippets with real text from DB
    const realSource = results.find(r => r.feedbackId === c.feedbackId);
    return {
      feedbackId: c.feedbackId,
      snippet: realSource ? realSource.text.substring(0, 150) : c.snippet,
    };
  });

  return {
    answer: aiResponse.answer,
    citations: validatedCitations,
    confidence: aiResponse.confidence,
  };
}
