/**
 * AI Security & Boundary Protection Utility
 *
 * Provides prompt injection neutralization by escaping XML delimiter tags
 * in untrusted customer input and redacting sensitive API keys from provider errors.
 */

/**
 * Escapes XML boundary delimiter tags inside untrusted customer feedback
 * or evidence strings to prevent prompt injection delimiter escapes.
 */
export function escapeXmlBoundaries(text: string): string {
  if (!text || typeof text !== 'string') return '';
  return text
    .replace(/<\/customer_feedback>/gi, '&lt;/customer_feedback&gt;')
    .replace(/<customer_feedback\b[^>]*>/gi, (m) => m.replace('<', '&lt;').replace('>', '&gt;'))
    .replace(/<\/evidence_item>/gi, '&lt;/evidence_item&gt;')
    .replace(/<evidence_item\b[^>]*>/gi, (m) => m.replace('<', '&lt;').replace('>', '&gt;'))
    .replace(/<\/evidence_quote>/gi, '&lt;/evidence_quote&gt;')
    .replace(/<evidence_quote\b[^>]*>/gi, (m) => m.replace('<', '&lt;').replace('>', '&gt;'))
    .replace(/<\/?system\b[^>]*>/gi, '&lt;system&gt;')
    .replace(/<\/?instructions\b[^>]*>/gi, '&lt;instructions&gt;')
    .replace(/<\/?developer\b[^>]*>/gi, '&lt;developer&gt;');
}

/**
 * Bounds text length to prevent unbounded context consumption by AI providers.
 */
export function boundAIText(text: string, maxChars: number = 5000): string {
  if (!text || typeof text !== 'string') return '';
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars);
}

/**
 * Sanitizes raw error messages from AI providers to guarantee that no
 * Anthropic, Gemini, Groq, or generic API keys or Bearer tokens can be leaked.
 */
export function sanitizeAIError(errorMsg: string): string {
  if (!errorMsg || typeof errorMsg !== 'string') return 'AI processing failed.';
  return errorMsg
    .replace(/sk-ant-[0-9A-Za-z_-]{20,}/g, '[REDACTED_API_KEY]')
    .replace(/gsk_[0-9A-Za-z_-]{20,}/g, '[REDACTED_API_KEY]')
    .replace(/AIza[0-9A-Za-z-_]{35}/g, '[REDACTED_API_KEY]')
    .replace(/AQ\.[0-9A-Za-z-_]{30,}/g, '[REDACTED_API_KEY]')
    .replace(/Bearer\s+[0-9A-Za-z_\-\.]+/gi, 'Bearer [REDACTED]')
    .replace(/api[-_]?key=[^&\s]+/gi, 'api_key=[REDACTED]')
    .replace(/key=[^&\s]+/gi, 'key=[REDACTED]');
}
