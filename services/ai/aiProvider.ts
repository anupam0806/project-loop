export interface ClassificationResult {
  sentiment: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE' | 'MIXED';
  sentimentScore: number;
  urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  category: string;
  themeNames: string[];
}

export interface Citation {
  feedbackId: string;
  snippet: string;
}

export interface AskLoopResponse {
  answer: string;
  citations: Citation[];
  confidence: 'supported' | 'insufficient_evidence';
}

export interface AIProvider {
  classifyFeedback(text: string, context?: { featureArea?: string }): Promise<ClassificationResult>;
  askLoop(prompt: string, context: { question: string; evidence: Array<{ id: string; text: string; channel: string }> }): Promise<AskLoopResponse>;
}
