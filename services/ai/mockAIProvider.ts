import { AIProvider, ClassificationResult, AskLoopResponse, ReportNarrativeInput, ReportNarrativeResult } from './aiProvider';

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
      model: 'mock',
    };
  }

  async askLoop(prompt: string, context: { question: string; evidence: Array<{ id: string; text: string; channel: string }> }): Promise<AskLoopResponse> {
    if (context.evidence.length === 0 || context.question.includes('INSUFFICIENT')) {
      return {
        answer: "I do not have enough feedback evidence in this workspace to answer your question.",
        citations: [],
        confidence: "insufficient_evidence",
        model: 'mock',
      };
    }
    
    // Simulate hallucinated citation if requested
    if (context.question.includes('HALLUCINATE')) {
      return {
        answer: "Mock answer",
        citations: [{ feedbackId: "fake-id", snippet: "Mock snippet" }],
        confidence: "supported",
        model: 'mock',
      }
    }

    return {
      answer: "Mock grounded answer",
      citations: [
        { feedbackId: context.evidence[0].id, snippet: context.evidence[0].text.substring(0, 20) }
      ],
      confidence: "supported",
      model: 'mock',
    };
  }

  async generateReportNarrative(input: ReportNarrativeInput): Promise<ReportNarrativeResult> {
    if (input.period.from.includes('FAIL_NARRATIVE')) {
      throw new Error("Simulated narrative generation failure");
    }

    // If simulated hallucinated quote test
    if (input.title?.includes('HALLUCINATE_QUOTE') || input.period.from.includes('HALLUCINATE_QUOTE')) {
      return {
        summary: `During ${input.period.from} to ${input.period.to}, feedback volume was ${input.statistics.totalFeedback}.`,
        keyThemes: input.statistics.topThemes.map(t => ({ name: t.name, observation: `Customers mentioned ${t.name}.` })),
        sentimentTrends: `Positive was ${input.statistics.positivePercentage.toFixed(1)}%, Negative was ${input.statistics.negativePercentage.toFixed(1)}%.`,
        recommendations: ["Investigate customer pain points"],
        quotes: [{ feedbackId: "fabricated-id-999", quote: "This quote never existed in evidence" }],
        model: 'mock',
      };
    }


    const quotes: Array<{ feedbackId: string; quote: string }> = [];
    if (input.evidence.length > 0) {
      quotes.push({
        feedbackId: input.evidence[0].id,
        quote: input.evidence[0].text.substring(0, Math.min(input.evidence[0].text.length, 50)),
      });
    }

    return {
      summary: `During the period from ${input.period.from} to ${input.period.to}, a total of ${input.statistics.totalFeedback} customer feedback items were analyzed. Overall sentiment showed ${input.statistics.positivePercentage.toFixed(1)}% positive and ${input.statistics.negativePercentage.toFixed(1)}% negative responses.`,
      keyThemes: input.statistics.topThemes.map(t => ({
        name: t.name,
        observation: `Theme ${t.name} appeared in ${t.count} feedback items with noticeable impact.`
      })),
      sentimentTrends: `Customer sentiment is predominantly ${input.statistics.positivePercentage > input.statistics.negativePercentage ? 'positive' : 'negative'} across key channels.`,
      recommendations: [
        "Prioritize resolving recurring pain points identified in top themes.",
        "Maintain proactive communication with customers experiencing negative friction."
      ],
      quotes,
      model: 'mock',
    };
  }
}

