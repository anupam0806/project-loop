import {
  AIProvider,
  ClassificationResult,
  AskLoopResponse,
  ReportNarrativeInput,
  ReportNarrativeResult,
} from './aiProvider';
import { GeminiProvider } from './geminiProvider';
import { GroqProvider } from './groqProvider';

export interface FreeAIProviderOptions {
  groqProvider?: GroqProvider;
  geminiProvider?: GeminiProvider;
}

/**
 * FreeAIProvider combines Groq (for fast structured classification) and
 * Gemini 2.5 Flash (for grounded Ask LOOP RAG and VoC narrative reports).
 */
export class FreeAIProvider implements AIProvider {
  private groqProvider: GroqProvider;
  private geminiProvider: GeminiProvider;

  constructor(options?: FreeAIProviderOptions) {
    this.groqProvider = options?.groqProvider || new GroqProvider();
    this.geminiProvider = options?.geminiProvider || new GeminiProvider();
  }

  getGroqProvider(): GroqProvider {
    return this.groqProvider;
  }

  getGeminiProvider(): GeminiProvider {
    return this.geminiProvider;
  }

  async classifyFeedback(
    text: string,
    context?: { featureArea?: string }
  ): Promise<ClassificationResult> {
    return this.groqProvider.classifyFeedback(text, context);
  }

  async askLoop(
    prompt: string,
    context: {
      question: string;
      evidence: Array<{ id: string; text: string; channel: string }>;
    }
  ): Promise<AskLoopResponse> {
    return this.geminiProvider.askLoop(prompt, context);
  }

  async generateReportNarrative(input: ReportNarrativeInput): Promise<ReportNarrativeResult> {
    return this.geminiProvider.generateReportNarrative(input);
  }
}
