import { AIProvider, ClassificationResult, AskLoopResponse } from './aiProvider';

export class MockAIProvider implements AIProvider {
  async classifyFeedback(text: string, context?: { featureArea?: string }): Promise<ClassificationResult> {
    if (text.includes('FAIL_CLASSIFICATION')) {
      throw new Error("Simulated classification failure");
    }
    return {
      sentiment: text.includes('hate') ? 'NEGATIVE' : 'POSITIVE',
      sentimentScore: text.includes('hate') ? -0.8 : 0.8,
      urgency: text.includes('urgent') ? 'HIGH' : 'LOW',
      category: 'General',
      themeNames: ['Mock Theme'],
    };
  }

  async askLoop(prompt: string, context: { question: string; evidence: Array<{ id: string; text: string; channel: string }> }): Promise<AskLoopResponse> {
    if (context.evidence.length === 0 || context.question.includes('INSUFFICIENT')) {
      return {
        answer: "I do not have enough feedback evidence in this workspace to answer your question.",
        citations: [],
        confidence: "insufficient_evidence",
      };
    }
    
    // Simulate hallucinated citation if requested
    if (context.question.includes('HALLUCINATE')) {
      return {
        answer: "Mock answer",
        citations: [{ feedbackId: "fake-id", snippet: "Mock snippet" }],
        confidence: "supported"
      }
    }

    return {
      answer: "Mock grounded answer",
      citations: [
        { feedbackId: context.evidence[0].id, snippet: context.evidence[0].text.substring(0, 20) }
      ],
      confidence: "supported",
    };
  }
}
