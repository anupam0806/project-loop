import Anthropic from '@anthropic-ai/sdk';
import { AIProvider, ClassificationResult, AskLoopResponse } from './aiProvider';
import { classificationResultSchema, askLoopResponseSchema } from '../../lib/validation/ai';

export class ClaudeProvider implements AIProvider {
  private client: Anthropic | null = null;

  private getClient(): Anthropic {
    if (this.client) return this.client;
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY is not configured.");
    }
    this.client = new Anthropic({ apiKey });
    return this.client;
  }

  async classifyFeedback(text: string, context?: { featureArea?: string }): Promise<ClassificationResult> {
    const anthropic = this.getClient();
    
    const prompt = `You are a strict JSON data extraction assistant. Classify the following customer feedback.
Output ONLY valid JSON matching this schema:
{
  "sentiment": "POSITIVE" | "NEUTRAL" | "NEGATIVE" | "MIXED",
  "sentimentScore": number between -1.0 and 1.0,
  "urgency": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
  "category": "string identifying the main category (e.g. Bug, Feature Request, Usability, Performance)",
  "themeNames": ["Array of 1 to 3 string themes"]
}

Feedback text:
"${text}"
${context?.featureArea ? `\nKnown feature area: ${context.featureArea}` : ""}
`;

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      system: 'You return ONLY raw JSON. No markdown, no explanations.',
      messages: [{ role: 'user', content: prompt }],
    });

    const content = response.content[0].type === 'text' ? response.content[0].text : '';
    let parsed: any;
    try {
      parsed = JSON.parse(content);
    } catch (e) {
      throw new Error("Failed to parse Claude output as JSON");
    }

    return classificationResultSchema.parse(parsed);
  }

  async askLoop(prompt: string, context: { question: string; evidence: Array<{ id: string; text: string; channel: string }> }): Promise<AskLoopResponse> {
    const anthropic = this.getClient();
    
    const evidenceString = context.evidence.map(e => `[ID: ${e.id}] [Channel: ${e.channel}]\n${e.text}`).join('\n\n');
    
    const systemPrompt = `You are Ask LOOP, an AI assistant for a product team. You answer questions based ONLY on the provided customer feedback evidence.
If the evidence is insufficient to answer the question, set confidence to "insufficient_evidence" and do not invent an answer.
Only use IDs from the provided evidence for citations. Never hallucinate citations.

Output ONLY valid JSON matching this schema:
{
  "answer": "Your detailed answer",
  "citations": [
    { "feedbackId": "ID of the feedback", "snippet": "Exact quote from the feedback supporting the point" }
  ],
  "confidence": "supported" | "insufficient_evidence"
}`;

    const userPrompt = `Evidence:\n${evidenceString}\n\nQuestion: ${context.question}`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-5',
      max_tokens: 1000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const content = response.content[0].type === 'text' ? response.content[0].text : '';
    let parsed: any;
    try {
      parsed = JSON.parse(content);
    } catch (e) {
      throw new Error("Failed to parse Claude output as JSON");
    }

    return askLoopResponseSchema.parse(parsed);
  }
}
