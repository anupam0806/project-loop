'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { TagIcon } from '@heroicons/react/24/outline';
import { AppShell } from '../../components/layout/AppShell';
import { Card } from '../../components/ui/Card';
import { Skeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';

interface ThemeItem {
  id: string;
  name: string;
  description?: string | null;
  feedbackCount?: number;
  sentiments?: {
    positive: number;
    negative: number;
    neutral: number;
    mixed: number;
  };
}

export default function ThemesPage() {
  const [themes, setThemes] = useState<ThemeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchThemes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/themes');
      if (!res.ok) {
        throw new Error('Failed to load themes.');
      }
      const json = await res.json();
      setThemes(json.data || []);
    } catch (err: any) {
      setError(err.message || 'Error loading themes.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchThemes();
  }, [fetchThemes]);

  return (
    <AppShell>
      <div className="space-y-4">
        <div>
          <h1 className="page-title">Customer Feedback Themes</h1>
          <p className="page-description">
            Key topics extracted across customer feedback with sentiment breakdowns
          </p>
        </div>

        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Skeleton variant="card" count={6} />
          </div>
        )}

        {error && !loading && (
          <ErrorState message={error} onRetry={fetchThemes} />
        )}

        {!loading && !error && themes.length === 0 && (
          <EmptyState
            title="No themes found"
            description="Themes are automatically aggregated as customer feedback is ingested and classified."
            action={
              <Link href="/feedback">
                <span className="text-xs text-accent hover:underline font-medium">
                  Go to Feedback Inbox
                </span>
              </Link>
            }
          />
        )}

        {!loading && !error && themes.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {themes.map((theme) => {
              const count = theme.feedbackCount || 0;
              const sents = theme.sentiments || { positive: 0, negative: 0, neutral: 0, mixed: 0 };
              const totalSents = sents.positive + sents.negative + sents.neutral + sents.mixed || 1;

              const posPct = (sents.positive / totalSents) * 100;
              const negPct = (sents.negative / totalSents) * 100;
              const neuPct = (sents.neutral / totalSents) * 100;
              const mixPct = (sents.mixed / totalSents) * 100;

              return (
                <Link
                  key={theme.id}
                  href={`/feedback?featureArea=${encodeURIComponent(theme.name)}`}
                  className="block group"
                >
                  <Card className="h-full flex flex-col justify-between hover:border-gray-400/80 transition-colors p-4">
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <TagIcon className="w-4 h-4 text-secondary group-hover:text-accent transition-colors shrink-0" aria-hidden="true" />
                          <h3 className="text-sm font-semibold text-primary group-hover:text-accent transition-colors truncate">
                            {theme.name}
                          </h3>
                        </div>
                        <span className="text-xs font-semibold text-secondary px-2 py-0.5 bg-gray-100 rounded-badge border border-border shrink-0">
                          {count} {count === 1 ? 'item' : 'items'}
                        </span>
                      </div>
                      {theme.description && (
                        <p className="text-xs text-secondary line-clamp-2 mt-1">
                          {theme.description}
                        </p>
                      )}
                    </div>

                    {/* Sentiment Bar */}
                    <div className="mt-4 pt-3 border-t border-border">
                      <div className="flex justify-between items-center text-[10px] text-secondary mb-1">
                        <span>Sentiment distribution</span>
                        <span>{sents.positive} pos / {sents.negative} neg</span>
                      </div>
                      <div className="h-1.5 w-full flex rounded-full overflow-hidden bg-gray-100">
                        {posPct > 0 && <div style={{ width: `${posPct}%` }} className="bg-positive" />}
                        {neuPct > 0 && <div style={{ width: `${neuPct}%` }} className="bg-neutralSentiment" />}
                        {mixPct > 0 && <div style={{ width: `${mixPct}%` }} className="bg-warning" />}
                        {negPct > 0 && <div style={{ width: `${negPct}%` }} className="bg-negative" />}
                      </div>
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
