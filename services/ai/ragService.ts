import { prisma } from '../../lib/db';
import { generateEmbedding } from './embeddingService';
import { getAIProvider } from './providerFactory';
import { AIProvider } from './aiProvider';
import { askLoopResponseSchema } from '../../lib/validation/ai';
import { boundAIText } from './aiSecurity';

export async function askLoopRAG(
  workspaceId: string,
  question: string,
  requestedLimit?: number,
  customProvider?: AIProvider
) {
  const safeQuestion = boundAIText(question.trim(), 500);
  const queryEmbedding = await generateEmbedding(safeQuestion);
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
      confidence: "insufficient_evidence" as const,
    };
  }

  const evidence = results.map(r => ({
    id: r.feedbackId,
    text: r.text,
    channel: r.channel,
  }));

  const provider = customProvider || getAIProvider();
  
  const rawAiResponse = await provider.askLoop(safeQuestion, { question: safeQuestion, evidence });
  const validatedAiResponse = askLoopResponseSchema.safeParse(rawAiResponse);
  const aiResponse = validatedAiResponse.success
    ? validatedAiResponse.data
    : {
        answer: rawAiResponse.answer || "Could not generate grounded answer.",
        citations: Array.isArray(rawAiResponse.citations) ? rawAiResponse.citations : [],
        confidence: "insufficient_evidence" as const,
      };

  // Citation Validation against strictly retrieved workspace IDs
  const validIds = new Set(results.map(r => r.feedbackId));
  const validatedCitations = aiResponse.citations.filter(c => validIds.has(c.feedbackId)).map(c => {
    const realSource = results.find(r => r.feedbackId === c.feedbackId);
    return {
      feedbackId: c.feedbackId,
      snippet: realSource ? realSource.text.substring(0, 150) : c.snippet,
    };
  });

  // If citations were claimed but none matched verified evidence IDs, downgrade confidence
  const finalConfidence = validatedCitations.length === 0 ? "insufficient_evidence" : aiResponse.confidence;

  return {
    answer: aiResponse.answer,
    citations: validatedCitations,
    confidence: finalConfidence,
  };
}
