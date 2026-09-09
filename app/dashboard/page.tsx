'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { AppShell } from '../../components/layout/AppShell';
import { Card, CardHeader } from '../../components/ui/Card';
import { Skeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';

interface AnalyticsSummary {
  totalFeedback: number;
  positivePercentage: number;
  negativePercentage: number;
  neutralPercentage: number;
  mixedPercentage: number;
  actionableFeedback?: number;
  volumeOverTime: Array<{ date: string; count: number }>;
  sentimentOverTime: Array<{
    date: string;
    positive: number;
    negative: number;
    neutral: number;
    mixed: number;
  }>;
  topThemes: Array<{ id: string; name: string; count: number }>;
}

interface RecentFeedbackItem {
  id: string;
  text: string;
  channel: string;
  sentiment: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL' | 'MIXED' | null;
  status: 'NEW' | 'REVIEWED' | 'ACTIONED';
  createdAt: string;
}

export default function DashboardPage() {
  const [data, setData] = useState<AnalyticsSummary | null>(null);
  const [recentFeedback, setRecentFeedback] = useState<RecentFeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [analyticsRes, feedbackRes] = await Promise.all([
        fetch('/api/analytics/summary'),
        fetch('/api/feedback?page=1&pageSize=5'),
      ]);

      if (!analyticsRes.ok) {
        throw new Error('Failed to load analytics summary.');
      }

      const analyticsJson = await analyticsRes.json();
      setData(analyticsJson.data);

      if (feedbackRes.ok) {
        const feedbackJson = await feedbackRes.json();
        setRecentFeedback(feedbackJson.data || []);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while loading dashboard metrics.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-primary">Dashboard</h1>
          <p className="text-xs text-secondary mt-0.5">Overview of customer feedback and sentiment trends</p>
        </div>

        {loading && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Skeleton variant="card" count={4} />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Skeleton variant="chart" />
              <Skeleton variant="chart" />
            </div>
          </div>
        )}

        {error && !loading && (
          <ErrorState message={error} onRetry={fetchDashboardData} />
        )}

        {!loading && !error && data && data.totalFeedback === 0 && (
          <EmptyState
            title="No feedback yet"
            description="Your workspace has not received any feedback. Start by adding items or importing a CSV file."
            action={
              <Link href="/feedback">
                <Button variant="primary" size="sm">
                  Go to Feedback Inbox
                </Button>
              </Link>
            }
          />
        )}

        {!loading && !error && data && data.totalFeedback > 0 && (
          <>
            {/* 4 KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <span className="text-xs font-semibold uppercase tracking-wider text-secondary">
                  Total Feedback
                </span>
                <p className="text-2xl font-semibold text-primary mt-1">
                  {data.totalFeedback.toLocaleString()}
                </p>
                <span className="text-[11px] text-secondary mt-0.5 block">All ingested records</span>
              </Card>

              <Card>
                <span className="text-xs font-semibold uppercase tracking-wider text-secondary">
                  Positive Sentiment
                </span>
                <p className="text-2xl font-semibold text-positive mt-1">
                  {data.positivePercentage.toFixed(1)}%
                </p>
                <span className="text-[11px] text-secondary mt-0.5 block">Favorable customer signal</span>
              </Card>

              <Card>
                <span className="text-xs font-semibold uppercase tracking-wider text-secondary">
                  Negative Sentiment
                </span>
                <p className="text-2xl font-semibold text-negative mt-1">
                  {data.negativePercentage.toFixed(1)}%
                </p>
                <span className="text-[11px] text-secondary mt-0.5 block">Friction and complaints</span>
              </Card>

              <Card>
                <span className="text-xs font-semibold uppercase tracking-wider text-secondary">
                  Actionable Count
                </span>
                <p className="text-2xl font-semibold text-secondary mt-1">
                  —
                </p>
                <span className="text-[11px] text-secondary mt-0.5 block">Not calculated</span>
              </Card>
            </div>

            {/* Visualizations: Volume over time and Sentiment breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Feedback Volume Over Time */}
              <Card>
                <CardHeader
                  title="Feedback Volume Over Time"
                  subtitle="Daily customer feedback counts (last 30 days)"
                />
                <div className="h-44 flex flex-col justify-end pt-4">
                  {data.volumeOverTime && data.volumeOverTime.length > 0 ? (
                    <div className="h-36 flex items-end gap-1.5 w-full">
                      {(() => {
                        const maxCount = Math.max(...data.volumeOverTime.map((v) => v.count), 1);
                        return data.volumeOverTime.slice(-20).map((item, idx) => {
                          const heightPct = Math.max((item.count / maxCount) * 100, 8);
                          return (
                            <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end group relative">
                              <div
                                style={{ height: `${heightPct}%` }}
                                className="w-full bg-accent/80 hover:bg-accent rounded-t transition-colors"
                              />
                              <div className="opacity-0 group-hover:opacity-100 pointer-events-none absolute -top-8 bg-primary text-white text-[10px] px-1.5 py-0.5 rounded shadow z-10 whitespace-nowrap">
                                {item.date}: {item.count}
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  ) : (
                    <p className="text-xs text-secondary text-center my-auto">No volume timeline available.</p>
                  )}
                  <div className="flex justify-between text-[10px] text-secondary border-t border-border pt-1.5 mt-2">
                    <span>Older</span>
                    <span>Recent</span>
                  </div>
                </div>
              </Card>

              {/* Sentiment Breakdown */}
              <Card>
                <CardHeader
                  title="Sentiment Distribution"
                  subtitle="Overall customer feeling across all items"
                />
                <div className="h-44 flex flex-col justify-center space-y-4 pt-2">
                  {/* Horizontal Stacked Bar */}
                  <div className="h-6 w-full flex rounded-badge overflow-hidden border border-border">
                    {data.positivePercentage > 0 && (
                      <div
                        style={{ width: `${data.positivePercentage}%` }}
                        className="bg-positive hover:opacity-90 transition-opacity"
                        title={`Positive: ${data.positivePercentage.toFixed(1)}%`}
                      />
                    )}
                    {data.neutralPercentage > 0 && (
                      <div
                        style={{ width: `${data.neutralPercentage}%` }}
                        className="bg-neutralSentiment hover:opacity-90 transition-opacity"
                        title={`Neutral: ${data.neutralPercentage.toFixed(1)}%`}
                      />
                    )}
                    {data.mixedPercentage > 0 && (
                      <div
                        style={{ width: `${data.mixedPercentage}%` }}
                        className="bg-warning hover:opacity-90 transition-opacity"
                        title={`Mixed: ${data.mixedPercentage.toFixed(1)}%`}
                      />
                    )}
                    {data.negativePercentage > 0 && (
                      <div
                        style={{ width: `${data.negativePercentage}%` }}
                        className="bg-negative hover:opacity-90 transition-opacity"
                        title={`Negative: ${data.negativePercentage.toFixed(1)}%`}
                      />
                    )}
                  </div>

                  {/* Legend Grid */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-positive" />
                      <span className="text-secondary">Positive:</span>
                      <strong className="text-primary font-semibold">{data.positivePercentage.toFixed(1)}%</strong>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-negative" />
                      <span className="text-secondary">Negative:</span>
                      <strong className="text-primary font-semibold">{data.negativePercentage.toFixed(1)}%</strong>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-neutralSentiment" />
                      <span className="text-secondary">Neutral:</span>
                      <strong className="text-primary font-semibold">{data.neutralPercentage.toFixed(1)}%</strong>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-warning" />
                      <span className="text-secondary">Mixed:</span>
                      <strong className="text-primary font-semibold">{data.mixedPercentage.toFixed(1)}%</strong>
                    </div>
                  </div>
                </div>
              </Card>
            </div>

            {/* Top Themes & Recent Feedback */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Top Themes */}
              <Card>
                <CardHeader
                  title="Top Themes"
                  subtitle="Most recurring feedback topics"
                  action={
                    <Link href="/themes" className="text-xs text-accent hover:underline font-medium">
                      View all
                    </Link>
                  }
                />
                <div className="divide-y divide-border">
                  {data.topThemes && data.topThemes.length > 0 ? (
                    data.topThemes.map((theme) => (
                      <div key={theme.id || theme.name} className="py-2.5 flex items-center justify-between">
                        <Link
                          href={`/feedback?theme=${encodeURIComponent(theme.name)}`}
                          className="text-sm font-medium text-primary hover:text-accent transition-colors"
                        >
                          {theme.name}
                        </Link>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-badge bg-gray-100 text-secondary border border-border">
                          {theme.count} items
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-secondary py-4 text-center">No themes detected yet.</p>
                  )}
                </div>
              </Card>

              {/* Recent Feedback */}
              <Card>
                <CardHeader
                  title="Recent Feedback"
                  subtitle="Latest customer submissions"
                  action={
                    <Link href="/feedback" className="text-xs text-accent hover:underline font-medium">
                      View inbox
                    </Link>
                  }
                />
                <div className="divide-y divide-border">
                  {recentFeedback.length > 0 ? (
                    recentFeedback.map((fb) => (
                      <Link
                        key={fb.id}
                        href={`/feedback/${fb.id}`}
                        className="block py-2.5 hover:bg-gray-50/70 -mx-4 px-4 transition-colors"
                      >
                        <p className="text-xs font-normal text-primary line-clamp-2">{fb.text}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          {fb.sentiment && <Badge type="sentiment" value={fb.sentiment} />}
                          <Badge type="status" value={fb.status} />
                          <span className="text-[11px] text-secondary ml-auto">
                            {new Date(fb.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </Link>
                    ))
                  ) : (
                    <p className="text-xs text-secondary py-4 text-center">No feedback submissions found.</p>
                  )}
                </div>
              </Card>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
