'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { AppShell } from '../../components/layout/AppShell';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Skeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { Dialog } from '../../components/ui/Dialog';
import { Input } from '../../components/ui/Input';

interface ReportSummary {
  id: string;
  title: string;
  period: { from: string; to: string };
  createdAt: string;
}

export default function ReportsListPage() {
  const { data: session } = useSession();
  const userRole = (session?.user as any)?.role || 'VIEWER';
  const canGenerate = userRole === 'ADMIN' || userRole === 'ANALYST';

  const [reports, setReports] = useState<ReportSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Generate modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [title, setTitle] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/reports');
      if (!res.ok) {
        throw new Error('Failed to retrieve stored reports.');
      }
      const json = await res.json();
      setReports(json.data || []);
    } catch (err: any) {
      setError(err.message || 'Error loading reports.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  // Set default dates for generation (past 30 days)
  useEffect(() => {
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    setToDate(today.toISOString().split('T')[0]);
    setFromDate(thirtyDaysAgo.toISOString().split('T')[0]);
  }, []);

  const handleGenerate = async () => {
    if (!fromDate || !toDate) {
      setGenerateError('Please select both start and end dates.');
      return;
    }
    setGenerateError(null);
    setGenerating(true);

    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          period: { from: fromDate, to: toDate },
          title: title.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.error?.message || 'Report generation failed.');
      }

      setModalOpen(false);
      setTitle('');
      fetchReports();
    } catch (err: any) {
      setGenerateError(err.message || 'An error occurred during report generation.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <AppShell>
      <div className="space-y-4">
        {/* Header and Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-primary">Voice of Customer Reports</h1>
            <p className="text-xs text-secondary mt-0.5">
              Factual statistical summaries synthesized with AI narrative interpretation
            </p>
          </div>

          <div className="relative group">
            <Button
              variant="primary"
              size="sm"
              disabled={!canGenerate}
              onClick={() => setModalOpen(true)}
            >
              Generate Report
            </Button>
            {!canGenerate && (
              <div className="hidden group-hover:block absolute bottom-full mb-1 right-0 px-2 py-1 bg-primary text-white text-[10px] rounded shadow whitespace-nowrap z-20">
                Viewer role cannot generate reports
              </div>
            )}
          </div>
        </div>

        {loading && <Skeleton variant="card" count={4} />}

        {error && !loading && (
          <ErrorState message={error} onRetry={fetchReports} />
        )}

        {!loading && !error && reports.length === 0 && (
          <EmptyState
            title="No reports generated yet"
            description="Generate a Voice-of-Customer report to synthesize deterministic statistics and AI insights over any time period."
            action={
              canGenerate ? (
                <Button variant="primary" size="sm" onClick={() => setModalOpen(true)}>
                  Generate First Report
                </Button>
              ) : undefined
            }
          />
        )}

        {!loading && !error && reports.length > 0 && (
          <div className="space-y-3">
            {reports.map((report) => (
              <Link
                key={report.id}
                href={`/reports/${report.id}`}
                className="block group"
              >
                <Card className="hover:border-gray-400/80 transition-colors p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-primary group-hover:text-accent transition-colors">
                      {report.title}
                    </h3>
                    <div className="flex items-center gap-3 text-xs text-secondary mt-1">
                      <span>Period: {report.period.from} to {report.period.to}</span>
                    </div>
                  </div>
                  <div className="text-xs text-secondary sm:text-right shrink-0">
                    <span>Generated on {new Date(report.createdAt).toLocaleDateString()}</span>
                    <span className="block text-accent font-medium text-[11px] group-hover:underline mt-0.5">
                      View report →
                    </span>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}

        {/* Generate Report Dialog */}
        <Dialog
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          title="Generate Voice of Customer Report"
          description="LOOP will compute deterministic statistics over the selected period and request a grounded executive narrative from Claude."
          confirmLabel={generating ? 'Generating report…' : 'Generate Report'}
          onConfirm={handleGenerate}
          loading={generating}
        >
          <div className="space-y-3 pt-1">
            {generateError && (
              <p className="text-xs text-negative font-medium" role="alert">
                {generateError}
              </p>
            )}

            <Input
              label="Report Title (Optional)"
              type="text"
              placeholder="e.g. Q3 2026 Customer Experience Review"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Start Date"
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                required
              />
              <Input
                label="End Date"
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                required
              />
            </div>

            {generating && (
              <div className="p-3 bg-gray-50 border border-border rounded-badge text-xs text-secondary space-y-1">
                <p className="font-medium text-primary">Calculating facts and synthesizing narrative…</p>
                <p className="text-[11px]">This may take a few seconds as Claude evaluates customer feedback evidence.</p>
              </div>
            )}
          </div>
        </Dialog>
      </div>
    </AppShell>
  );
}
