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
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Skeleton variant="chart" />
              <Skeleton variant="row" count={4} />
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
                  {typeof data.actionableFeedback === 'number' && data.actionableFeedback > 0
                    ? data.actionableFeedback.toLocaleString()
                    : '—'}
                </p>
                <span className="text-[11px] text-secondary mt-0.5 block">
                  {typeof data.actionableFeedback === 'number' && data.actionableFeedback > 0
                    ? 'Items needing review'
                    : 'Not calculated'}
                </span>
              </Card>
            </div>

            {/* Visualizations: Row 1 - Chart 1: Volume Timeline & Chart 2: Sentiment Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Chart 1: Feedback Volume Over Time (SVG Timeline) */}
              <Card>
                <CardHeader
                  title="Feedback Volume Over Time"
                  subtitle="Daily customer feedback counts (last 30 days)"
                />
                <div className="h-48 flex flex-col justify-between pt-2">
                  {data.volumeOverTime && data.volumeOverTime.length > 0 ? (
                    (() => {
                      const timeline = data.volumeOverTime;
                      const maxVal = Math.max(...timeline.map((v) => v.count), 1);
                      const width = 460;
                      const height = 120;
                      const paddingX = 16;
                      const paddingY = 16;
                      const usableW = width - paddingX * 2;
                      const usableH = height - paddingY * 2;

                      const points = timeline.map((item, idx) => {
                        const x =
                          timeline.length > 1
                            ? paddingX + (idx / (timeline.length - 1)) * usableW
                            : width / 2;
                        const y = height - paddingY - (item.count / maxVal) * usableH;
                        return { x, y, ...item };
                      });

                      const pathData = points
                        .map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`)
                        .join(' ');
                      const areaData = `${pathData} L ${points[points.length - 1].x.toFixed(1)} ${height - paddingY} L ${points[0].x.toFixed(1)} ${height - paddingY} Z`;

                      return (
                        <div className="w-full">
                          <svg
                            viewBox={`0 0 ${width} ${height}`}
                            className="w-full h-32 overflow-visible"
                            preserveAspectRatio="none"
                            aria-label="Feedback volume timeline chart"
                          >
                            <defs>
                              <linearGradient id="volGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.25" />
                                <stop offset="100%" stopColor="#4f46e5" stopOpacity="0.0" />
                              </linearGradient>
                            </defs>
                            {/* Horizontal Grid lines */}
                            <line
                              x1={paddingX}
                              y1={paddingY}
                              x2={width - paddingX}
                              y2={paddingY}
                              stroke="#e5e7eb"
                              strokeDasharray="3 3"
                            />
                            <line
                              x1={paddingX}
                              y1={height / 2}
                              x2={width - paddingX}
                              y2={height / 2}
                              stroke="#e5e7eb"
                              strokeDasharray="3 3"
                            />
                            <line
                              x1={paddingX}
                              y1={height - paddingY}
                              x2={width - paddingX}
                              y2={height - paddingY}
                              stroke="#e5e7eb"
                            />

                            {/* Filled Area */}
                            <path d={areaData} fill="url(#volGrad)" />

                            {/* Trend Line */}
                            <path
                              d={pathData}
                              fill="none"
                              stroke="#4f46e5"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />

                            {/* Data Points */}
                            {points.map((pt, idx) => (
                              <circle
                                key={idx}
                                cx={pt.x}
                                cy={pt.y}
                                r="3"
                                fill="#4f46e5"
                                className="hover:r-5 transition-all cursor-pointer"
                              >
                                <title>{`${pt.date}: ${pt.count} feedback items`}</title>
                              </circle>
                            ))}
                          </svg>

                          <div className="flex justify-between text-[10px] text-secondary border-t border-border pt-1.5 mt-1">
                            <span>{timeline[0]?.date || 'Older'}</span>
                            <span className="text-secondary font-medium">Peak: {maxVal} items/day</span>
                            <span>{timeline[timeline.length - 1]?.date || 'Recent'}</span>
                          </div>
                        </div>
                      );
                    })()
                  ) : (
                    <p className="text-xs text-secondary text-center my-auto">No volume timeline available.</p>
                  )}
                </div>
              </Card>

              {/* Chart 2: Sentiment Distribution (SVG Segmented Visual) */}
              <Card>
                <CardHeader
                  title="Sentiment Distribution"
                  subtitle="Overall customer feeling across all items"
                />
                <div className="h-48 flex flex-col justify-between pt-2">
                  {/* SVG Stacked Bar Visual */}
                  <div className="w-full">
                    <svg
                      viewBox="0 0 400 32"
                      className="w-full h-8 rounded overflow-hidden"
                      preserveAspectRatio="none"
                      aria-label="Sentiment distribution chart"
                    >
                      {(() => {
                        const total =
                          data.positivePercentage +
                          data.neutralPercentage +
                          data.mixedPercentage +
                          data.negativePercentage;
                        const scale = total > 0 ? 400 / total : 1;
                        let currentX = 0;

                        const segments = [
                          { key: 'pos', name: 'Positive', pct: data.positivePercentage, fill: '#16a34a' },
                          { key: 'neu', name: 'Neutral', pct: data.neutralPercentage, fill: '#9ca3af' },
                          { key: 'mix', name: 'Mixed', pct: data.mixedPercentage, fill: '#d97706' },
                          { key: 'neg', name: 'Negative', pct: data.negativePercentage, fill: '#dc2626' },
                        ];

                        return segments.map((seg) => {
                          const segWidth = seg.pct * scale;
                          const rect = (
                            <rect
                              key={seg.key}
                              x={currentX}
                              y={0}
                              width={segWidth}
                              height={32}
                              fill={seg.fill}
                            >
                              <title>{`${seg.name}: ${seg.pct.toFixed(1)}%`}</title>
                            </rect>
                          );
                          currentX += segWidth;
                          return rect;
                        });
                      })()}
                    </svg>
                  </div>

                  {/* Accessible Legend with Symbols (Never color alone) */}
                  <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-border mt-2">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-positive inline-block" />
                      <span className="font-bold text-positive">[+]</span>
                      <span className="text-secondary">Positive:</span>
                      <strong className="text-primary font-semibold">{data.positivePercentage.toFixed(1)}%</strong>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-negative inline-block" />
                      <span className="font-bold text-negative">[-]</span>
                      <span className="text-secondary">Negative:</span>
                      <strong className="text-primary font-semibold">{data.negativePercentage.toFixed(1)}%</strong>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-neutralSentiment inline-block" />
                      <span className="font-bold text-neutralSentiment">[○]</span>
                      <span className="text-secondary">Neutral:</span>
                      <strong className="text-primary font-semibold">{data.neutralPercentage.toFixed(1)}%</strong>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-warning inline-block" />
                      <span className="font-bold text-warning">[~]</span>
                      <span className="text-secondary">Mixed:</span>
                      <strong className="text-primary font-semibold">{data.mixedPercentage.toFixed(1)}%</strong>
                    </div>
                  </div>
                </div>
              </Card>
            </div>

            {/* Row 2: Chart 3: Top Themes Horizontal Bar Chart & Recent Feedback */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Chart 3: Top Themes Horizontal Bar Chart */}
              <Card>
                <CardHeader
                  title="Top Themes"
                  subtitle="Most recurring feedback topics (horizontal distribution)"
                  action={
                    <Link href="/themes" className="text-xs text-accent hover:underline font-medium">
                      View all
                    </Link>
                  }
                />
                <div className="space-y-3 pt-2">
                  {data.topThemes && data.topThemes.length > 0 ? (
                    (() => {
                      const maxThemeCount = Math.max(...data.topThemes.map((t) => t.count), 1);
                      return data.topThemes.map((theme) => {
                        const barWidthPercent = Math.max((theme.count / maxThemeCount) * 100, 4);
                        const pctOfTotal = data.totalFeedback > 0
                          ? ((theme.count / data.totalFeedback) * 100).toFixed(0)
                          : '0';

                        return (
                          <div key={theme.id || theme.name} className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <Link
                                href={`/feedback?theme=${encodeURIComponent(theme.name)}`}
                                className="font-medium text-primary hover:text-accent transition-colors truncate max-w-[200px]"
                              >
                                {theme.name}
                              </Link>
                              <div className="flex items-center gap-2">
                                <span className="text-secondary text-[11px]">{pctOfTotal}% of total</span>
                                <span className="font-semibold px-2 py-0.5 rounded-badge bg-gray-100 text-secondary border border-border text-[11px]">
                                  {theme.count} items
                                </span>
                              </div>
                            </div>
                            {/* Horizontal SVG Bar */}
                            <svg
                              viewBox="0 0 100 6"
                              className="w-full h-2 rounded overflow-hidden bg-gray-100"
                              preserveAspectRatio="none"
                              aria-label={`Theme ${theme.name}: ${theme.count} items`}
                            >
                              <rect
                                x="0"
                                y="0"
                                width={barWidthPercent}
                                height="6"
                                fill="#4f46e5"
                                rx="3"
                              />
                            </svg>
                          </div>
                        );
                      });
                    })()
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
