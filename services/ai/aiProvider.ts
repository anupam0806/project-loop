export interface ProviderUsageMetadata {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
}

export interface ClassificationResult {
  sentiment: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE' | 'MIXED';
  sentimentScore: number;
  urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  category: string;
  themeNames: string[];
  model?: string;
  usage?: ProviderUsageMetadata;
}

export interface Citation {
  feedbackId: string;
  snippet: string;
}

export interface AskLoopResponse {
  answer: string;
  citations: Citation[];
  confidence: 'supported' | 'insufficient_evidence';
  model?: string;
  usage?: ProviderUsageMetadata;
}

export interface ReportEvidence {
  id: string;
  text: string;
  channel: string;
  sentiment?: string | null;
}

export interface ReportNarrativeInput {
  title?: string;
  period: { from: string; to: string };

  statistics: {
    totalFeedback: number;
    positiveCount: number;
    negativeCount: number;
    neutralCount: number;
    mixedCount: number;
    positivePercentage: number;
    negativePercentage: number;
    channelCounts: Record<string, number>;
    topThemes: Array<{ name: string; count: number }>;
    sentimentDelta?: {
      positiveChange: number;
      negativeChange: number;
    };
  };
  evidence: ReportEvidence[];
}

export interface ReportNarrativeResult {
  summary: string;
  keyThemes: Array<{ name: string; observation: string }>;
  sentimentTrends: string;
  recommendations: string[];
  quotes: Array<{ feedbackId: string; quote: string }>;
  model?: string;
  usage?: ProviderUsageMetadata;
}

export interface AIProvider {
  classifyFeedback(text: string, context?: { featureArea?: string }): Promise<ClassificationResult>;
  askLoop(prompt: string, context: { question: string; evidence: Array<{ id: string; text: string; channel: string }> }): Promise<AskLoopResponse>;
  generateReportNarrative(input: ReportNarrativeInput): Promise<ReportNarrativeResult>;
}


