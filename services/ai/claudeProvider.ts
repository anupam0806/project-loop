import Anthropic from '@anthropic-ai/sdk';
import { AIProvider, ClassificationResult, AskLoopResponse, ReportNarrativeInput, ReportNarrativeResult } from './aiProvider';
import { classificationResultSchema, askLoopResponseSchema } from '../../lib/validation/ai';
import { reportNarrativeSchema } from '../../lib/validation/report';

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

    const validated = classificationResultSchema.parse(parsed);
    return {
      ...validated,
      model: 'claude-haiku-4-5-20251001',
    };
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

    const validated = askLoopResponseSchema.parse(parsed);
    return {
      ...validated,
      model: 'claude-sonnet-5',
    };
  }

  async generateReportNarrative(input: ReportNarrativeInput): Promise<ReportNarrativeResult> {
    const anthropic = this.getClient();

    const evidenceString = input.evidence.map(e => `[ID: ${e.id}] [Channel: ${e.channel}] [Sentiment: ${e.sentiment || 'UNKNOWN'}]\n${e.text}`).join('\n\n');

    const systemPrompt = `You are a Voice-of-Customer (VoC) report narrative generator for Project LOOP.
Your role is to write executive narrative summaries and actionable interpretations based STRICTLY on the deterministic numbers and real customer feedback evidence provided.

RULES:
1. You must NEVER fabricate numbers, percentages, or statistics. All numerical facts are provided in the input; refer to them accurately.
2. Every quote in the "quotes" array must use an exact "feedbackId" from the provided evidence, and the "quote" string must be a verbatim excerpt from that specific feedback item.
3. Keep the tone calm, objective, analytical, and professional.
4. Output ONLY valid JSON matching this schema:
{
  "summary": "High-level executive summary of customer sentiment and key feedback patterns during the period.",
  "keyThemes": [
    {
      "name": "Theme name from the data",
      "observation": "What customers are saying about this theme, based on evidence"
    }
  ],
  "sentimentTrends": "Analysis of customer sentiment distribution and changes.",
  "recommendations": [
    "Concrete actionable recommendation 1",
    "Concrete actionable recommendation 2"
  ],
  "quotes": [
    {
      "feedbackId": "ID from provided evidence",
      "quote": "Verbatim excerpt from this feedback"
    }
  ]
}`;

    const userPrompt = `Reporting Period: ${input.period.from} to ${input.period.to}

Calculated Statistics:
- Total Feedback: ${input.statistics.totalFeedback}
- Positive: ${input.statistics.positiveCount} (${input.statistics.positivePercentage.toFixed(1)}%)
- Negative: ${input.statistics.negativeCount} (${input.statistics.negativePercentage.toFixed(1)}%)
- Neutral: ${input.statistics.neutralCount}
- Mixed: ${input.statistics.mixedCount}
- Channels: ${JSON.stringify(input.statistics.channelCounts)}
- Top Themes: ${input.statistics.topThemes.map(t => `${t.name} (${t.count})`).join(', ')}
${input.statistics.sentimentDelta ? `- Period Delta: Positive change ${input.statistics.sentimentDelta.positiveChange.toFixed(1)}%, Negative change ${input.statistics.sentimentDelta.negativeChange.toFixed(1)}%` : ''}

Real Feedback Evidence:
${evidenceString}
`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-5',
      max_tokens: 1500,
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

    const validated = reportNarrativeSchema.parse(parsed);
    return {
      ...validated,
      model: 'claude-sonnet-5',
    };
  }
}

