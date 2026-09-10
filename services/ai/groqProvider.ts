import {
  AIProvider,
  ClassificationResult,
  AskLoopResponse,
  ReportNarrativeInput,
  ReportNarrativeResult,
  ProviderUsageMetadata,
} from './aiProvider';
import { classificationResultSchema, askLoopResponseSchema } from '../../lib/validation/ai';
import { reportNarrativeSchema } from '../../lib/validation/report';

export interface GroqProviderOptions {
  apiKey?: string;
  model?: string;
  fetchFn?: typeof fetch;
}

export class GroqProvider implements AIProvider {
  private apiKey?: string;
  private model: string;
  private fetchFn: typeof fetch;

  constructor(options?: GroqProviderOptions) {
    this.apiKey = options?.apiKey;
    this.model = options?.model || 'openai/gpt-oss-20b';
    this.fetchFn = options?.fetchFn || globalThis.fetch;
  }

  private getApiKey(): string {
    const key = (this.apiKey || process.env.GROQ_API_KEY || '').trim();
    if (!key) {
      throw new Error('GROQ_API_KEY is not configured.');
    }
    return key;
  }

  private sanitizeError(rawMessage: string): string {
    // Redact any potential Groq API keys (gsk_...) or authorization headers
    return rawMessage
      .replace(/gsk_[0-9A-Za-z_-]{20,}/g, '[REDACTED_API_KEY]')
      .replace(/Bearer\s+[0-9A-Za-z_\-\.]+/gi, 'Bearer [REDACTED]');
  }

  private cleanJsonText(raw: string): string {
    let text = raw.trim();
    if (text.startsWith('```json')) {
      text = text.slice(7);
    } else if (text.startsWith('```')) {
      text = text.slice(3);
    }
    if (text.endsWith('```')) {
      text = text.slice(0, -3);
    }
    return text.trim();
  }

  private async callGroqApi(
    systemPrompt: string,
    userPrompt: string,
    temperature = 0.1
  ): Promise<{ contentText: string; usage?: ProviderUsageMetadata }> {
    const apiKey = this.getApiKey();
    const endpoint = 'https://api.groq.com/openai/v1/chat/completions';

    const requestBody = {
      model: this.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature,
    };

    let response: Response;
    try {
      response = await this.fetchFn(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(requestBody),
      });
    } catch (networkErr: any) {
      throw new Error(
        `Groq network error: ${this.sanitizeError(networkErr?.message || 'Failed to connect')}`
      );
    }

    if (!response.ok) {
      let errorDetails = response.statusText;
      try {
        const errJson = await response.json();
        errorDetails = errJson?.error?.message || JSON.stringify(errJson);
      } catch {
        // use status text
      }
      throw new Error(
        `Groq API error (${response.status}): ${this.sanitizeError(errorDetails)}`
      );
    }

    const data = await response.json();
    const choice = data?.choices?.[0];
    const text = choice?.message?.content || '';

    let usage: ProviderUsageMetadata | undefined;
    if (data?.usage) {
      usage = {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens,
      };
    }

    return { contentText: text, usage };
  }

  async classifyFeedback(
    text: string,
    context?: { featureArea?: string }
  ): Promise<ClassificationResult> {
    const systemPrompt = `You are a strict JSON data extraction assistant. Classify the customer feedback.
Output ONLY a valid JSON object matching this schema:
{
  "sentiment": "POSITIVE" | "NEUTRAL" | "NEGATIVE" | "MIXED",
  "sentimentScore": number between -1.0 and 1.0,
  "urgency": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
  "category": "string identifying the main category (e.g. Bug, Feature Request, Usability, Performance)",
  "themeNames": ["Array of 1 to 3 string themes"]
}`;

    const userPrompt = `Feedback text:
"${text}"
${context?.featureArea ? `\nKnown feature area: ${context.featureArea}` : ''}`;

    const { contentText, usage } = await this.callGroqApi(systemPrompt, userPrompt, 0.1);

    let parsed: unknown;
    try {
      parsed = JSON.parse(this.cleanJsonText(contentText));
    } catch {
      throw new Error('Failed to parse Groq output as JSON');
    }

    // Always enforce strict Zod validation
    const validated = classificationResultSchema.parse(parsed);
    return {
      ...validated,
      model: this.model,
      usage,
    };
  }

  async askLoop(
    prompt: string,
    context: {
      question: string;
      evidence: Array<{ id: string; text: string; channel: string }>;
    }
  ): Promise<AskLoopResponse> {
    const evidenceString = context.evidence
      .map((e) => `[ID: ${e.id}] [Channel: ${e.channel}]\n${e.text}`)
      .join('\n\n');

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

    const { contentText, usage } = await this.callGroqApi(systemPrompt, userPrompt, 0.2);

    let parsed: unknown;
    try {
      parsed = JSON.parse(this.cleanJsonText(contentText));
    } catch {
      throw new Error('Failed to parse Groq output as JSON');
    }

    const validated = askLoopResponseSchema.parse(parsed);
    return {
      ...validated,
      model: this.model,
      usage,
    };
  }

  async generateReportNarrative(input: ReportNarrativeInput): Promise<ReportNarrativeResult> {
    const evidenceString = input.evidence
      .map(
        (e) =>
          `[ID: ${e.id}] [Channel: ${e.channel}] [Sentiment: ${e.sentiment || 'UNKNOWN'}]\n${e.text}`
      )
      .join('\n\n');

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
- Top Themes: ${input.statistics.topThemes.map((t) => `${t.name} (${t.count})`).join(', ')}
${
  input.statistics.sentimentDelta
    ? `- Period Delta: Positive change ${input.statistics.sentimentDelta.positiveChange.toFixed(1)}%, Negative change ${input.statistics.sentimentDelta.negativeChange.toFixed(1)}%`
    : ''
}

Real Feedback Evidence:
${evidenceString}
`;

    const { contentText, usage } = await this.callGroqApi(systemPrompt, userPrompt, 0.2);

    let parsed: unknown;
    try {
      parsed = JSON.parse(this.cleanJsonText(contentText));
    } catch {
      throw new Error('Failed to parse Groq output as JSON');
    }

    const validated = reportNarrativeSchema.parse(parsed);
    return {
      ...validated,
      model: this.model,
      usage,
    };
  }
}
