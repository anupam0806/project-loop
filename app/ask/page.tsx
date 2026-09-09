'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { AppShell } from '../../components/layout/AppShell';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';

interface Citation {
  feedbackId: string;
  snippet: string;
}

interface AskResult {
  answer: string;
  citations: Citation[];
  confidence: 'supported' | 'insufficient_evidence';
}

export default function AskLoopPage() {
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AskResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const suggestedQuestions = [
    'What are the most frequent complaints regarding checkout?',
    'What features do customers request most often?',
    'Why are users giving negative reviews on mobile?',
  ];

  const handleAsk = async (qText?: string) => {
    const targetQuestion = qText || question;
    if (!targetQuestion.trim()) return;

    if (qText) {
      setQuestion(qText);
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: targetQuestion.trim() }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json?.error?.message || 'Failed to get answer from LOOP.');
      }

      setResult(json.data);
    } catch (err: any) {
      setError(err.message || 'An error occurred while answering your question.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto space-y-6 pt-4">
        {/* Title and Intro */}
        <div className="text-center space-y-1">
          <h1 className="text-xl font-semibold text-primary">Ask LOOP</h1>
          <p className="text-xs text-secondary">
            Synthesize answers grounded strictly in verified customer feedback evidence
          </p>
        </div>

        {/* Question Input Card */}
        <Card className="p-4 sm:p-5 shadow-card space-y-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleAsk();
            }}
            className="space-y-3"
          >
            <div className="relative">
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Ask a question about your feedback…"
                className="w-full pl-3 pr-24 py-2.5 text-sm bg-surface border border-border rounded-DEFAULT text-primary placeholder-secondary/60 focus:outline-none focus:ring-2 focus:ring-accent"
                disabled={loading}
              />
              <div className="absolute right-1.5 top-1.5">
                <Button
                  type="submit"
                  size="sm"
                  variant="primary"
                  disabled={loading || !question.trim()}
                >
                  Ask
                </Button>
              </div>
            </div>

            {/* Suggested Question Chips */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[11px] text-secondary font-medium mr-1">Suggested:</span>
              {suggestedQuestions.map((sq, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleAsk(sq)}
                  disabled={loading}
                  className="text-xs text-secondary hover:text-primary bg-gray-100 hover:bg-gray-200/80 px-2.5 py-1 rounded-badge transition-colors text-left"
                >
                  {sq}
                </button>
              ))}
            </div>
          </form>
        </Card>

        {/* Loading State per File 05: "Reading feedback…" text placeholder */}
        {loading && (
          <div className="p-8 text-center bg-surface border border-border rounded-DEFAULT">
            <p className="text-sm font-medium text-secondary animate-pulse">
              Reading feedback…
            </p>
          </div>
        )}

        {/* Request Error State */}
        {error && !loading && (
          <div className="p-5 bg-surface border border-red-200 rounded-DEFAULT space-y-3">
            <p className="text-xs text-negative font-medium">{error}</p>
            <Button variant="secondary" size="sm" onClick={() => handleAsk()}>
              Retry
            </Button>
          </div>
        )}

        {/* Result Area */}
        {!loading && result && (
          <div className="space-y-4">
            <Card className="p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-secondary">
                  Answer
                </span>
                {result.confidence === 'insufficient_evidence' && (
                  <span className="text-xs text-secondary italic">
                    Insufficient evidence in workspace
                  </span>
                )}
              </div>

              {/* Explanatory sentence for insufficient evidence or answer text */}
              <div className="text-sm text-primary leading-relaxed whitespace-pre-wrap">
                {result.answer}
              </div>

              {/* Citation Sources Section */}
              {result.citations && result.citations.length > 0 && (
                <div className="pt-4 border-t border-border space-y-2">
                  <span className="text-xs font-semibold text-secondary uppercase tracking-wider block">
                    Sources ({result.citations.length})
                  </span>
                  <div className="space-y-2">
                    {result.citations.map((cite, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 bg-gray-50 border border-border rounded-badge text-xs space-y-1"
                      >
                        <p className="text-primary italic">&ldquo;{cite.snippet}&rdquo;</p>
                        <Link
                          href={`/feedback/${cite.feedbackId}`}
                          className="inline-block text-[11px] text-accent hover:underline font-medium"
                        >
                          View feedback item →
                        </Link>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          </div>
        )}
      </div>
    </AppShell>
  );
}
