import { AIProvider } from './aiProvider';
import { ClaudeProvider } from './claudeProvider';
import { MockAIProvider } from './mockAIProvider';
import { GeminiProvider } from './geminiProvider';
import { GroqProvider } from './groqProvider';
import { FreeAIProvider } from './freeAIProvider';

export type AIProviderType = 'free' | 'claude' | 'gemini' | 'groq' | 'mock';
export type AIRole = 'classification' | 'ask' | 'voc';

let cachedFreeProvider: FreeAIProvider | null = null;
let cachedMockProvider: MockAIProvider | null = null;
let cachedClaudeProvider: ClaudeProvider | null = null;
let cachedGeminiProvider: GeminiProvider | null = null;
let cachedGroqProvider: GroqProvider | null = null;

export function clearProviderCache(): void {
  cachedFreeProvider = null;
  cachedMockProvider = null;
  cachedClaudeProvider = null;
  cachedGeminiProvider = null;
  cachedGroqProvider = null;
}

export function resolveProviderType(override?: string): AIProviderType {
  const envProvider = (override || process.env.AI_PROVIDER || '').toLowerCase().trim();
  if (envProvider === 'free' || envProvider === 'claude' || envProvider === 'gemini' || envProvider === 'groq' || envProvider === 'mock') {
    return envProvider as AIProviderType;
  }

  // When running in test environment, default to mock unless explicitly configured
  if (process.env.NODE_ENV === 'test') {
    return 'mock';
  }

  // Default non-test provider is free
  return 'free';
}

/**
 * Returns the configured AI provider.
 * For 'free', returns a composite provider: Groq for classification, Gemini for Ask & VoC.
 */
export function getAIProvider(override?: string): AIProvider {
  const type = resolveProviderType(override);

  switch (type) {
    case 'free':
      if (!cachedFreeProvider) cachedFreeProvider = new FreeAIProvider();
      return cachedFreeProvider;
    case 'claude':
      if (!cachedClaudeProvider) cachedClaudeProvider = new ClaudeProvider();
      return cachedClaudeProvider;
    case 'gemini':
      if (!cachedGeminiProvider) cachedGeminiProvider = new GeminiProvider();
      return cachedGeminiProvider;
    case 'groq':
      if (!cachedGroqProvider) cachedGroqProvider = new GroqProvider();
      return cachedGroqProvider;
    case 'mock':
    default:
      if (!cachedMockProvider) cachedMockProvider = new MockAIProvider();
      return cachedMockProvider;
  }
}

/**
 * Returns the specific provider instance for a designated role.
 */
export function getAIProviderForRole(role: AIRole, override?: string): AIProvider {
  const type = resolveProviderType(override);

  if (type === 'free') {
    const free = (getAIProvider('free') as FreeAIProvider);
    if (role === 'classification') {
      return free.getGroqProvider();
    }
    return free.getGeminiProvider();
  }

  return getAIProvider(override);
}

/**
 * Returns metadata regarding current model mappings.
 */
export function getAIModelInfo(role: AIRole, override?: string): { provider: string; model: string } {
  const type = resolveProviderType(override);

  if (type === 'mock') {
    return { provider: 'mock', model: 'mock' };
  }

  if (type === 'claude') {
    return {
      provider: 'claude',
      model: role === 'classification' ? 'claude-haiku-4-5-20251001' : 'claude-sonnet-5',
    };
  }

  if (type === 'free') {
    if (role === 'classification') {
      return { provider: 'groq', model: 'openai/gpt-oss-20b' };
    }
    return { provider: 'gemini', model: process.env.GEMINI_MODEL || 'gemini-1.5-flash' };
  }

  if (type === 'groq') {
    return { provider: 'groq', model: 'openai/gpt-oss-20b' };
  }

  if (type === 'gemini') {
    return { provider: 'gemini', model: process.env.GEMINI_MODEL || 'gemini-1.5-flash' };
  }

  return { provider: 'unknown', model: 'unknown' };
}
