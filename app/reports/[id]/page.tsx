'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { AppShell } from '../../../components/layout/AppShell';
import { Card, CardHeader } from '../../../components/ui/Card';
import { Skeleton } from '../../../components/ui/Skeleton';
import { ErrorState } from '../../../components/ui/ErrorState';

interface StoredReport {
  id: string;
  workspaceId: string;
  title: string;
  period: { from: string; to: string };
  createdAt: string;
  stats: {
    totalFeedback: number;
    positiveCount: number;
    negativeCount: number;
    neutralCount: number;
    mixedCount: number;
    positivePercentage: number;
    negativePercentage: number;
    channelCounts: Record<string, number>;
    statusCounts: Record<string, number>;
    topThemes: Array<{ id?: string; name: string; count: number }>;
    sentimentDelta?: {
      positiveChange: number;
      negativeChange: number;
    };
  };
  narrative: {
    summary: string;
    keyThemes: Array<{ name: string; observation: string }>;
    sentimentTrends: string;
    recommendations: string[];
    quotes: Array<{ feedbackId: string; quote: string }>;
  };
}

export default function ReportDetailPage() {
  const params = useParams();
  const [report, setReport] = useState<StoredReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/reports/${params.id}`);
      if (!res.ok) {
        if (res.status === 404) {
          throw new Error('Report not found in this workspace.');
        }
        throw new Error('Failed to retrieve persisted report.');
      }
      const json = await res.json();
      setReport(json.data);
    } catch (err: any) {
      setError(err.message || 'Error loading report.');
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Breadcrumb navigation */}
        <div>
          <Link
            href="/reports"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-secondary hover:text-primary transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
            Back to Reports
          </Link>
        </div>

        {loading && (
          <div className="space-y-4">
            <Skeleton variant="card" count={3} />
          </div>
        )}

        {error && !loading && (
          <ErrorState message={error} onRetry={fetchReport} />
        )}

        {!loading && !error && report && (
          <div className="space-y-6">
            {/* Report Header */}
            <div className="border-b border-border pb-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h1 className="text-xl font-semibold text-primary">{report.title}</h1>
                <span className="text-xs text-secondary">
                  Generated {new Date(report.createdAt).toLocaleDateString()}
                </span>
              </div>
              <p className="text-xs text-secondary mt-1">
                Reporting period: <strong className="text-primary">{report.period.from}</strong> to{' '}
                <strong className="text-primary">{report.period.to}</strong>
              </p>
            </div>

            {/* BLOCK 1: Application-Calculated Statistics */}
            <section className="space-y-3" aria-labelledby="stats-heading">
              <div className="flex items-center justify-between">
                <h2 id="stats-heading" className="text-sm font-semibold uppercase tracking-wider text-primary">
                  1. Factual Statistics
                </h2>
                <span className="text-[11px] text-secondary">
                  Computed by Project LOOP
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Card className="p-3">
                  <span className="text-[11px] font-semibold text-secondary uppercase">
                    Total Volume
                  </span>
                  <p className="text-xl font-semibold text-primary mt-1">
                    {report.stats.totalFeedback.toLocaleString()}
                  </p>
                </Card>

                <Card className="p-3">
                  <span className="text-[11px] font-semibold text-secondary uppercase">
                    Positive Signal
                  </span>
                  <p className="text-xl font-semibold text-positive mt-1">
                    {report.stats.positivePercentage}%
                  </p>
                  <span className="text-[10px] text-secondary">({report.stats.positiveCount} items)</span>
                </Card>

                <Card className="p-3">
                  <span className="text-[11px] font-semibold text-secondary uppercase">
                    Negative Signal
                  </span>
                  <p className="text-xl font-semibold text-negative mt-1">
                    {report.stats.negativePercentage}%
                  </p>
                  <span className="text-[10px] text-secondary">({report.stats.negativeCount} items)</span>
                </Card>

                <Card className="p-3">
                  <span className="text-[11px] font-semibold text-secondary uppercase">
                    Sentiment Delta
                  </span>
                  <p className="text-xl font-semibold text-primary mt-1">
                    {report.stats.sentimentDelta ? (
                      <span className={report.stats.sentimentDelta.positiveChange >= 0 ? 'text-positive' : 'text-negative'}>
                        {report.stats.sentimentDelta.positiveChange >= 0 ? '+' : ''}
                        {report.stats.sentimentDelta.positiveChange}%
                      </span>
                    ) : (
                      '—'
                    )}
                  </p>
                  <span className="text-[10px] text-secondary">vs previous window</span>
                </Card>
              </div>

              {/* Channels & Top Themes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Card className="p-4">
                  <CardHeader title="Channel Breakdown" />
                  <div className="space-y-1.5 text-xs">
                    {Object.entries(report.stats.channelCounts || {}).map(([chan, cnt]) => (
                      <div key={chan} className="flex justify-between py-1 border-b border-border/60">
                        <span className="text-secondary">{chan}</span>
                        <strong className="text-primary font-medium">{cnt} items</strong>
                      </div>
                    ))}
                  </div>
                </Card>

                <Card className="p-4">
                  <CardHeader title="Top Volume Themes" />
                  <div className="space-y-1.5 text-xs">
                    {report.stats.topThemes && report.stats.topThemes.length > 0 ? (
                      report.stats.topThemes.map((theme, i) => (
                        <div key={i} className="flex justify-between py-1 border-b border-border/60">
                          <span className="text-secondary">{theme.name}</span>
                          <strong className="text-primary font-medium">{theme.count} items</strong>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-secondary">No themes tagged.</p>
                    )}
                  </div>
                </Card>
              </div>
            </section>

            {/* BLOCK 2: Claude-Generated Narrative Summary */}
            <section className="space-y-3" aria-labelledby="narrative-heading">
              <div className="flex items-center justify-between">
                <h2 id="narrative-heading" className="text-sm font-semibold uppercase tracking-wider text-primary">
                  2. Executive Narrative
                </h2>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-accent bg-accent-soft px-2 py-0.5 rounded-badge">
                  AI-generated
                </span>
              </div>

              <Card className="p-6 space-y-6">
                {/* Executive Summary */}
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-secondary mb-2">
                    Summary Overview
                  </h3>
                  <p className="text-sm text-primary leading-relaxed whitespace-pre-wrap font-normal">
                    {report.narrative.summary}
                  </p>
                </div>

                {/* Key Theme Observations */}
                {report.narrative.keyThemes && report.narrative.keyThemes.length > 0 && (
                  <div className="pt-4 border-t border-border">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-secondary mb-3">
                      Theme Observations
                    </h3>
                    <div className="space-y-3">
                      {report.narrative.keyThemes.map((item, idx) => (
                        <div key={idx} className="p-3 bg-gray-50/70 border border-border rounded-badge">
                          <h4 className="text-xs font-semibold text-primary">{item.name}</h4>
                          <p className="text-xs text-secondary mt-1 leading-relaxed">
                            {item.observation}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Sentiment Trends */}
                {report.narrative.sentimentTrends && (
                  <div className="pt-4 border-t border-border">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-secondary mb-2">
                      Sentiment Analysis
                    </h3>
                    <p className="text-xs text-primary leading-relaxed">
                      {report.narrative.sentimentTrends}
                    </p>
                  </div>
                )}

                {/* Actionable Recommendations */}
                {report.narrative.recommendations && report.narrative.recommendations.length > 0 && (
                  <div className="pt-4 border-t border-border">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-secondary mb-2">
                      Actionable Recommendations
                    </h3>
                    <ul className="space-y-1.5 list-disc list-inside text-xs text-primary">
                      {report.narrative.recommendations.map((rec, idx) => (
                        <li key={idx} className="leading-relaxed">
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Customer Quotes & Evidence */}
                {report.narrative.quotes && report.narrative.quotes.length > 0 && (
                  <div className="pt-4 border-t border-border space-y-2">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-secondary mb-2">
                      Verified Customer Evidence ({report.narrative.quotes.length})
                    </h3>
                    <div className="space-y-2">
                      {report.narrative.quotes.map((q, idx) => (
                        <div
                          key={idx}
                          className="p-3 bg-gray-50 border border-border rounded-badge text-xs space-y-1"
                        >
                          <blockquote className="text-primary italic">
                            &ldquo;{q.quote}&rdquo;
                          </blockquote>
                          <Link
                            href={`/feedback/${q.feedbackId}`}
                            className="inline-block text-[11px] text-accent hover:underline font-medium pt-1"
                          >
                            View feedback record →
                          </Link>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            </section>
          </div>
        )}
      </div>
    </AppShell>
  );
}
