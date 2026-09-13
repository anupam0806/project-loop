import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getAIProvider,
  getAIProviderForRole,
  getAIModelInfo,
  resolveProviderType,
  clearProviderCache,
} from '../services/ai/providerFactory';
import { MockAIProvider } from '../services/ai/mockAIProvider';
import { ClaudeProvider } from '../services/ai/claudeProvider';
import { GeminiProvider } from '../services/ai/geminiProvider';
import { GroqProvider } from '../services/ai/groqProvider';
import { FreeAIProvider } from '../services/ai/freeAIProvider';
import { ZodError } from 'zod';

describe('AI Provider Selection & Factory', () => {
  beforeEach(() => {
    clearProviderCache();
    delete process.env.AI_PROVIDER;
  });

  it('defaults to MockAIProvider in test environment', () => {
    const provider = getAIProvider();
    expect(provider).toBeInstanceOf(MockAIProvider);
  });

  it('resolves FreeAIProvider when AI_PROVIDER=free', () => {
    const provider = getAIProvider('free');
    expect(provider).toBeInstanceOf(FreeAIProvider);
  });

  it('resolves ClaudeProvider when AI_PROVIDER=claude without calling API', () => {
    const provider = getAIProvider('claude');
    expect(provider).toBeInstanceOf(ClaudeProvider);
  });

  it('resolves GroqProvider when AI_PROVIDER=groq', () => {
    const provider = getAIProvider('groq');
    expect(provider).toBeInstanceOf(GroqProvider);
  });

  it('resolves GeminiProvider when AI_PROVIDER=gemini', () => {
    const provider = getAIProvider('gemini');
    expect(provider).toBeInstanceOf(GeminiProvider);
  });

  it('resolves MockAIProvider when AI_PROVIDER=mock', () => {
    const provider = getAIProvider('mock');
    expect(provider).toBeInstanceOf(MockAIProvider);
  });

  it('correctly maps roles in free configuration', () => {
    const classificationProvider = getAIProviderForRole('classification', 'free');
    const askProvider = getAIProviderForRole('ask', 'free');
    const vocProvider = getAIProviderForRole('voc', 'free');

    expect(classificationProvider).toBeInstanceOf(GroqProvider);
    expect(askProvider).toBeInstanceOf(GeminiProvider);
    expect(vocProvider).toBeInstanceOf(GeminiProvider);
  });

  it('reports correct model metadata for free configuration', () => {
    const classificationInfo = getAIModelInfo('classification', 'free');
    const askInfo = getAIModelInfo('ask', 'free');
    const vocInfo = getAIModelInfo('voc', 'free');

    expect(classificationInfo).toEqual({ provider: 'groq', model: 'openai/gpt-oss-20b' });
    expect(askInfo).toEqual({ provider: 'gemini', model: 'gemini-1.5-flash' });
    expect(vocInfo).toEqual({ provider: 'gemini', model: 'gemini-1.5-flash' });
  });

  it('reports correct model metadata for claude configuration', () => {
    const classificationInfo = getAIModelInfo('classification', 'claude');
    const askInfo = getAIModelInfo('ask', 'claude');
    const vocInfo = getAIModelInfo('voc', 'claude');

    expect(classificationInfo).toEqual({ provider: 'claude', model: 'claude-haiku-4-5-20251001' });
    expect(askInfo).toEqual({ provider: 'claude', model: 'claude-sonnet-5' });
    expect(vocInfo).toEqual({ provider: 'claude', model: 'claude-sonnet-5' });
  });
});

describe('FreeAIProvider Composite Delegation', () => {
  it('delegates classification to Groq and ask/voc to Gemini', async () => {
    const mockGroq = new GroqProvider({ apiKey: 'mock-key' });
    const mockGemini = new GeminiProvider({ apiKey: 'mock-key' });

    vi.spyOn(mockGroq, 'classifyFeedback').mockResolvedValue({
      sentiment: 'POSITIVE',
      sentimentScore: 0.9,
      urgency: 'LOW',
      category: 'Feature Request',
      themeNames: ['Speed'],
      model: 'openai/gpt-oss-20b',
    });

    vi.spyOn(mockGemini, 'classifyFeedback');

    vi.spyOn(mockGemini, 'askLoop').mockResolvedValue({
      answer: 'Gemini Answer',
      citations: [{ feedbackId: 'fb-1', snippet: 'fast checkout' }],
      confidence: 'supported',
      model: 'gemini-2.5-flash',
    });

    vi.spyOn(mockGemini, 'generateReportNarrative').mockResolvedValue({
      summary: 'Executive Summary',
      keyThemes: [{ name: 'Speed', observation: 'Fast' }],
      sentimentTrends: 'Positive',
      recommendations: ['Keep going'],
      quotes: [{ feedbackId: 'fb-1', quote: 'fast checkout' }],
      model: 'gemini-2.5-flash',
    });

    const composite = new FreeAIProvider({
      groqProvider: mockGroq,
      geminiProvider: mockGemini,
    });

    // Classify feedback -> Groq
    const classResult = await composite.classifyFeedback('The checkout is super fast!');
    expect(classResult.sentiment).toBe('POSITIVE');
    expect(classResult.model).toBe('openai/gpt-oss-20b');
    expect(mockGroq.classifyFeedback).toHaveBeenCalledTimes(1);
    expect(mockGemini.classifyFeedback).not.toHaveBeenCalled();

    // Ask LOOP -> Gemini
    const askResult = await composite.askLoop('Is checkout fast?', {
      question: 'Is checkout fast?',
      evidence: [{ id: 'fb-1', text: 'The checkout is super fast!', channel: 'SUPPORT' }],
    });
    expect(askResult.confidence).toBe('supported');
    expect(askResult.model).toBe('gemini-2.5-flash');
    expect(mockGemini.askLoop).toHaveBeenCalledTimes(1);

    // VoC Narrative -> Gemini
    const narrativeResult = await composite.generateReportNarrative({
      period: { from: '2026-08-01', to: '2026-08-31' },
      statistics: {
        totalFeedback: 1,
        positiveCount: 1,
        negativeCount: 0,
        neutralCount: 0,
        mixedCount: 0,
        positivePercentage: 100,
        negativePercentage: 0,
        channelCounts: { SUPPORT: 1 },
        topThemes: [{ name: 'Speed', count: 1 }],
      },
      evidence: [{ id: 'fb-1', text: 'The checkout is super fast!', channel: 'SUPPORT' }],
    });
    expect(narrativeResult.summary).toBe('Executive Summary');
    expect(narrativeResult.model).toBe('gemini-2.5-flash');
    expect(mockGemini.generateReportNarrative).toHaveBeenCalledTimes(1);
  });
});

describe('GeminiProvider Adapter Normalization', () => {
  it('normalizes askLoop response and extracts usage metadata', async () => {
    const mockGeminiResponse = {
      candidates: [
        {
          content: {
            parts: [
              {
                text: JSON.stringify({
                  answer: 'The users love the new dashboard performance.',
                  citations: [{ feedbackId: 'fb-101', snippet: 'dashboard is lightning fast' }],
                  confidence: 'supported',
                }),
              },
            ],
            role: 'model',
          },
          finishReason: 'STOP',
        },
      ],
      usageMetadata: {
        promptTokenCount: 150,
        candidatesTokenCount: 45,
        totalTokenCount: 195,
      },
    };

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockGeminiResponse,
    });

    const provider = new GeminiProvider({
      apiKey: 'test-gemini-key',
      fetchFn: mockFetch as any,
    });

    const result = await provider.askLoop('How is performance?', {
      question: 'How is performance?',
      evidence: [{ id: 'fb-101', text: 'dashboard is lightning fast', channel: 'SURVEY' }],
    });

    expect(result.answer).toBe('The users love the new dashboard performance.');
    expect(result.confidence).toBe('supported');
    expect(result.citations).toHaveLength(1);
    expect(result.citations[0].feedbackId).toBe('fb-101');
    expect(result.model).toBe('gemini-1.5-flash');
    expect(result.usage).toEqual({
      promptTokens: 150,
      completionTokens: 45,
      totalTokens: 195,
    });

    // Ensure raw response candidates are not leaked onto the returned object
    expect((result as any).candidates).toBeUndefined();
    expect((result as any).finishReason).toBeUndefined();
  });

  it('cleans markdown code block wrapping from Gemini JSON response', async () => {
    const rawJsonString = `\`\`\`json\n{\n  "answer": "Clean answer",\n  "citations": [],\n  "confidence": "insufficient_evidence"\n}\n\`\`\``;

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: rawJsonString }] } }],
      }),
    });

    const provider = new GeminiProvider({
      apiKey: 'test-gemini-key',
      fetchFn: mockFetch as any,
    });

    const result = await provider.askLoop('Any questions?', {
      question: 'Any questions?',
      evidence: [],
    });

    expect(result.answer).toBe('Clean answer');
    expect(result.confidence).toBe('insufficient_evidence');
  });

  it('normalizes generateReportNarrative and validates schema', async () => {
    const narrativeOutput = {
      summary: 'Strong customer satisfaction in August.',
      keyThemes: [{ name: 'Onboarding', observation: 'First-run wizard received praise.' }],
      sentimentTrends: '90% positive sentiment across all touchpoints.',
      recommendations: ['Expand self-serve onboarding guides.'],
      quotes: [{ feedbackId: 'fb-201', quote: 'Setup was a breeze!' }],
    };

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: JSON.stringify(narrativeOutput) }] } }],
        usageMetadata: { promptTokenCount: 300, candidatesTokenCount: 120, totalTokenCount: 420 },
      }),
    });

    const provider = new GeminiProvider({
      apiKey: 'test-gemini-key',
      fetchFn: mockFetch as any,
    });

    const result = await provider.generateReportNarrative({
      period: { from: '2026-08-01', to: '2026-08-31' },
      statistics: {
        totalFeedback: 10,
        positiveCount: 9,
        negativeCount: 1,
        neutralCount: 0,
        mixedCount: 0,
        positivePercentage: 90,
        negativePercentage: 10,
        channelCounts: { SURVEY: 10 },
        topThemes: [{ name: 'Onboarding', count: 8 }],
      },
      evidence: [{ id: 'fb-201', text: 'Setup was a breeze!', channel: 'SURVEY' }],
    });

    expect(result.summary).toBe('Strong customer satisfaction in August.');
    expect(result.recommendations).toHaveLength(1);
    expect(result.quotes[0].feedbackId).toBe('fb-201');
    expect(result.model).toBe('gemini-1.5-flash');
    expect(result.usage?.totalTokens).toBe(420);
  });

  it('sanitizes and normalizes Gemini API errors without exposing secrets', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      statusText: 'Forbidden',
      json: async () => ({
        error: {
          code: 403,
          message: 'Permission denied with key=AQ.dummySecretKeyForSanitizerCheck123456789',
        },
      }),
    });

    const provider = new GeminiProvider({
      apiKey: 'AQ.dummySecretKeyForSanitizerCheck123456789',
      fetchFn: mockFetch as any,
    });

    await expect(
      provider.askLoop('Test question', { question: 'Test question', evidence: [] })
    ).rejects.toThrowError(/Gemini API error \(403\)/);

    // Verify key was redacted
    try {
      await provider.askLoop('Test question', { question: 'Test question', evidence: [] });
    } catch (err: any) {
      expect(err.message).not.toContain('AQ.dummySecretKeyForSanitizerCheck123456789');
      expect(err.message).toContain('[REDACTED');
    }
  });

  it('fails safely when output cannot be parsed as JSON', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: 'This is plain unformatted text, not JSON.' }] } }],
      }),
    });

    const provider = new GeminiProvider({
      apiKey: 'test-key',
      fetchFn: mockFetch as any,
    });

    await expect(
      provider.askLoop('Test question', { question: 'Test question', evidence: [] })
    ).rejects.toThrow('Failed to parse Gemini output as JSON');
  });

  it('throws descriptive error if GEMINI_API_KEY is not configured', async () => {
    delete process.env.GEMINI_API_KEY;
    const provider = new GeminiProvider();
    await expect(
      provider.askLoop('Test', { question: 'Test', evidence: [] })
    ).rejects.toThrow('GEMINI_API_KEY is not configured.');
  });
});

describe('GroqProvider Adapter Normalization & Validation', () => {
  it('normalizes classification response with schema compliance', async () => {
    const groqOutput = {
      sentiment: 'NEGATIVE',
      sentimentScore: -0.75,
      urgency: 'HIGH',
      category: 'Bug',
      themeNames: ['Crash', 'Mobile'],
    };

    const mockGroqResponse = {
      id: 'chatcmpl-test-123',
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: JSON.stringify(groqOutput),
          },
          finish_reason: 'stop',
        },
      ],
      usage: {
        prompt_tokens: 80,
        completion_tokens: 35,
        total_tokens: 115,
      },
    };

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockGroqResponse,
    });

    const provider = new GroqProvider({
      apiKey: 'test-groq-key',
      fetchFn: mockFetch as any,
    });

    const result = await provider.classifyFeedback('App crashes whenever I tap the upload button.');

    expect(result.sentiment).toBe('NEGATIVE');
    expect(result.sentimentScore).toBe(-0.75);
    expect(result.urgency).toBe('HIGH');
    expect(result.category).toBe('Bug');
    expect(result.themeNames).toEqual(['Crash', 'Mobile']);
    expect(result.model).toBe('openai/gpt-oss-20b');
    expect(result.usage).toEqual({
      promptTokens: 80,
      completionTokens: 35,
      totalTokens: 115,
    });

    // Ensure raw Groq properties are not leaked
    expect((result as any).choices).toBeUndefined();
    expect((result as any).id).toBeUndefined();
  });

  it('strictly validates schema with Zod and rejects malformed classification output', async () => {
    const invalidOutput = {
      sentiment: 'SUPER_ANGRY', // Invalid sentiment enum
      sentimentScore: 5.0,      // Out of [-1, 1] range
      urgency: 'ASAP',          // Invalid urgency enum
      category: 'Bug',
      themeNames: [],           // Schema requires min 1 theme
    };

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        choices: [{ message: { content: JSON.stringify(invalidOutput) } }],
      }),
    });

    const provider = new GroqProvider({
      apiKey: 'test-groq-key',
      fetchFn: mockFetch as any,
    });

    await expect(provider.classifyFeedback('Bad feedback')).rejects.toThrow(ZodError);
  });

  it('sanitizes and normalizes Groq API errors without leaking secrets', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      json: async () => ({
        error: {
          message: 'Invalid API Key: gsk_dummySecretKeyForSanitizerCheck123456789',
          type: 'invalid_request_error',
        },
      }),
    });

    const provider = new GroqProvider({
      apiKey: 'gsk_dummySecretKeyForSanitizerCheck123456789',
      fetchFn: mockFetch as any,
    });

    await expect(provider.classifyFeedback('Test')).rejects.toThrowError(/Groq API error \(401\)/);

    // Verify key was redacted
    try {
      await provider.classifyFeedback('Test');
    } catch (err: any) {
      expect(err.message).not.toContain('gsk_dummySecretKeyForSanitizerCheck123456789');
      expect(err.message).toContain('[REDACTED_API_KEY]');
    }
  });

  it('throws descriptive error if GROQ_API_KEY is not configured', async () => {
    delete process.env.GROQ_API_KEY;
    const provider = new GroqProvider();
    await expect(provider.classifyFeedback('Test')).rejects.toThrow('GROQ_API_KEY is not configured.');
  });
});
