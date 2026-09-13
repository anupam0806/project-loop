'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { PlusIcon, ArrowUpTrayIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { AppShell } from '../../components/layout/AppShell';
import { Button } from '../../components/ui/Button';
import { SearchInput } from '../../components/ui/SearchInput';
import { Select } from '../../components/ui/Select';
import { Badge } from '../../components/ui/Badge';
import { Skeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { Pagination } from '../../components/ui/Pagination';
import { Dialog } from '../../components/ui/Dialog';
import { Input } from '../../components/ui/Input';

interface FeedbackItem {
  id: string;
  text: string;
  channel: string;
  sentiment: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL' | 'MIXED' | null;
  status: 'NEW' | 'REVIEWED' | 'ACTIONED';
  featureArea?: string | null;
  createdAt: string;
  themes?: Array<{ theme: { id: string; name: string } }>;
}

function FeedbackInboxContent() {

  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const userRole = (session?.user as any)?.role || 'VIEWER';
  const isViewer = userRole === 'VIEWER';

  // Filters
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [sentiment, setSentiment] = useState(searchParams.get('sentiment') || '');
  const [status, setStatus] = useState(searchParams.get('status') || '');
  const [featureArea, setFeatureArea] = useState(searchParams.get('featureArea') || searchParams.get('theme') || '');
  const [page, setPage] = useState(1);

  // Data
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [meta, setMeta] = useState<{ total: number; totalPages: number; page: number }>({
    total: 0,
    totalPages: 1,
    page: 1,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newText, setNewText] = useState('');
  const [newChannel, setNewChannel] = useState('SUPPORT');
  const [newFeatureArea, setNewFeatureArea] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // CSV Import Modal
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);

  const fetchFeedback = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (query.trim()) params.set('q', query.trim());
      if (sentiment) params.set('sentiment', sentiment);
      if (status) params.set('status', status);
      if (featureArea) params.set('featureArea', featureArea);
      params.set('page', page.toString());
      params.set('pageSize', '15');

      const res = await fetch(`/api/feedback?${params.toString()}`);
      if (!res.ok) {
        throw new Error('Failed to load feedback records.');
      }
      const json = await res.json();
      setFeedbacks(json.data || []);
      if (json.meta) {
        setMeta({
          total: json.meta.total,
          totalPages: json.meta.totalPages,
          page: json.meta.page,
        });
      }
    } catch (err: any) {
      setError(err.message || 'Error loading feedback inbox.');
    } finally {
      setLoading(false);
    }
  }, [query, sentiment, status, featureArea, page]);

  useEffect(() => {
    fetchFeedback();
  }, [fetchFeedback]);

  const handleCreateFeedback = async () => {
    if (!newText.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: newText.trim(),
          channel: newChannel,
          featureArea: newFeatureArea.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json?.error?.message || 'Failed to create feedback item.');
      }

      setCreateModalOpen(false);
      setNewText('');
      setNewFeatureArea('');
      fetchFeedback();
    } catch (err: any) {
      alert(err.message || 'Creation failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleImportCsv = async () => {
    if (!csvFile) return;

    setImporting(true);
    try {
      const formData = new FormData();
      formData.append('file', csvFile);

      const res = await fetch('/api/feedback/import', {
        method: 'POST',
        body: formData,
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.error?.message || 'Import failed');
      }

      alert(`Successfully imported ${json.data?.importedCount || 0} feedback items.`);
      setImportModalOpen(false);
      setCsvFile(null);
      fetchFeedback();
    } catch (err: any) {
      alert(err.message || 'Import error');
    } finally {
      setImporting(false);
    }
  };

  const clearFilters = () => {
    setQuery('');
    setSentiment('');
    setStatus('');
    setFeatureArea('');
    setPage(1);
  };

  const hasActiveFilters = Boolean(query || sentiment || status || featureArea);

  return (
    <AppShell>
      <div className="space-y-4">
        {/* Header and Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="page-title">Feedback Inbox</h1>
            <p className="page-description">
              Browse, filter, and manage customer input
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* CSV Import Action */}
            <div className="relative group">
              <Button
                variant="secondary"
                size="sm"
                disabled={isViewer}
                onClick={() => setImportModalOpen(true)}
              >
                <ArrowUpTrayIcon className="w-4 h-4 mr-1.5" aria-hidden="true" />
                Import CSV
              </Button>
              {isViewer && (
                <div className="hidden group-hover:block absolute bottom-full mb-1 left-1/2 -translate-x-1/2 px-2 py-1 bg-primary text-white text-[10px] rounded shadow whitespace-nowrap z-20">
                  Viewer role cannot import feedback
                </div>
              )}
            </div>

            {/* New Feedback Action */}
            <div className="relative group">
              <Button
                variant="primary"
                size="sm"
                disabled={isViewer}
                onClick={() => setCreateModalOpen(true)}
              >
                <PlusIcon className="w-4 h-4 mr-1.5" aria-hidden="true" />
                Add Feedback
              </Button>
              {isViewer && (
                <div className="hidden group-hover:block absolute bottom-full mb-1 left-1/2 -translate-x-1/2 px-2 py-1 bg-primary text-white text-[10px] rounded shadow whitespace-nowrap z-20">
                  Viewer role cannot create feedback
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="bg-surface border border-border rounded-DEFAULT p-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            <SearchInput
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              onClear={() => {
                setQuery('');
                setPage(1);
              }}
              placeholder="Search feedback text..."
            />

            <Select
              value={sentiment}
              onChange={(e) => {
                setSentiment(e.target.value);
                setPage(1);
              }}
              options={[
                { value: '', label: 'All Sentiments' },
                { value: 'POSITIVE', label: 'Positive' },
                { value: 'NEGATIVE', label: 'Negative' },
                { value: 'NEUTRAL', label: 'Neutral' },
                { value: 'MIXED', label: 'Mixed' },
              ]}
              aria-label="Filter by sentiment"
            />

            <Select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              options={[
                { value: '', label: 'All Statuses' },
                { value: 'NEW', label: 'New' },
                { value: 'REVIEWED', label: 'Reviewed' },
                { value: 'ACTIONED', label: 'Actioned' },
              ]}
              aria-label="Filter by status"
            />

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={featureArea}
                onChange={(e) => {
                  setFeatureArea(e.target.value);
                  setPage(1);
                }}
                placeholder="Topic / Feature area..."
                className="w-full px-3 py-2 text-sm bg-surface border border-border rounded-DEFAULT text-primary focus:outline-none focus:ring-2 focus:ring-accent"
              />
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="text-xs text-secondary hover:text-primary whitespace-nowrap underline px-1"
                >
                  Reset
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Content States */}
        {loading && <Skeleton variant="row" count={8} />}

        {error && !loading && (
          <ErrorState message={error} onRetry={fetchFeedback} />
        )}

        {!loading && !error && feedbacks.length === 0 && (
          <EmptyState
            title="No feedback found"
            description={
              hasActiveFilters
                ? 'No items match your active search filters. Try clearing filters to see all records.'
                : 'No feedback items have been recorded in this workspace.'
            }
            action={
              hasActiveFilters ? (
                <Button variant="secondary" size="sm" onClick={clearFilters}>
                  Clear filters
                </Button>
              ) : undefined
            }
          />
        )}

        {!loading && !error && feedbacks.length > 0 && (
          <div>
            {/* Desktop Table View (>640px) */}
            <div className="hidden sm:block bg-surface border border-border rounded-DEFAULT overflow-hidden shadow-card">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/70 border-b border-border text-[11px] font-semibold text-secondary uppercase tracking-wider">
                    <th className="py-2.5 px-4 w-1/2">Feedback</th>
                    <th className="py-2.5 px-3">Channel</th>
                    <th className="py-2.5 px-3">Sentiment</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-4 text-right">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-sm">
                  {feedbacks.map((item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-gray-50/70 transition-colors group cursor-pointer"
                      onClick={() => {
                        window.location.href = `/feedback/${item.id}`;
                      }}
                    >
                      <td className="py-3 px-4">
                        <Link
                          href={`/feedback/${item.id}`}
                          className="font-normal text-primary hover:text-accent line-clamp-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {item.text}
                        </Link>
                        {item.featureArea && (
                          <span className="inline-block mt-1 text-[11px] text-secondary bg-gray-100 px-1.5 py-0.5 rounded">
                            {item.featureArea}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-xs text-secondary whitespace-nowrap">
                        {item.channel}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        {item.sentiment ? (
                          <Badge type="sentiment" value={item.sentiment} />
                        ) : (
                          <span className="text-xs text-secondary italic">Analyzing…</span>
                        )}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <Badge type="status" value={item.status} />
                      </td>
                      <td className="py-3 px-4 text-xs text-secondary text-right whitespace-nowrap">
                        {new Date(item.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Stacked Card View (<640px) */}
            <div className="sm:hidden space-y-3">
              {feedbacks.map((item) => (
                <Link
                  key={item.id}
                  href={`/feedback/${item.id}`}
                  className="block bg-surface border border-border rounded-DEFAULT p-3.5 shadow-card hover:border-gray-300 transition-colors"
                >
                  <p className="text-sm font-normal text-primary line-clamp-3 mb-2">{item.text}</p>
                  <div className="flex flex-wrap items-center gap-1.5 text-xs text-secondary">
                    {item.sentiment && <Badge type="sentiment" value={item.sentiment} />}
                    <Badge type="status" value={item.status} />
                    <span className="text-[11px] text-secondary">{item.channel}</span>
                    <span className="text-[11px] text-secondary ml-auto">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </Link>
              ))}
            </div>

            {/* Pagination */}
            <Pagination
              currentPage={page}
              totalPages={meta.totalPages}
              totalItems={meta.total}
              pageSize={15}
              onPageChange={(p) => setPage(p)}
            />
          </div>
        )}

        {/* Create Feedback Dialog */}
        <Dialog
          isOpen={createModalOpen}
          onClose={() => setCreateModalOpen(false)}
          title="Add Customer Feedback"
          description="Submit a new piece of customer feedback for classification and analysis."
          confirmLabel="Create Feedback"
          onConfirm={handleCreateFeedback}
          loading={submitting}
        >
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-secondary mb-1">
                Feedback Content
              </label>
              <textarea
                rows={4}
                className="w-full px-3 py-2 text-sm bg-surface border border-border rounded-DEFAULT text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                placeholder="What did the customer say?"
                value={newText}
                onChange={(e) => setNewText(e.target.value)}
                required
              />
            </div>

            <Select
              label="Source Channel"
              value={newChannel}
              onChange={(e) => setNewChannel(e.target.value)}
              options={[
                { value: 'SUPPORT', label: 'Support Ticket' },
                { value: 'APP_REVIEW', label: 'App Store Review' },
                { value: 'SURVEY', label: 'Customer Survey' },
                { value: 'SALES', label: 'Sales Conversation' },
                { value: 'SOCIAL', label: 'Social Media' },
                { value: 'SIMULATED', label: 'Simulated Ingestion' },
              ]}
            />

            <Input
              label="Feature Area (Optional)"
              type="text"
              placeholder="e.g. Checkout, Navigation, Onboarding"
              value={newFeatureArea}
              onChange={(e) => setNewFeatureArea(e.target.value)}
            />
          </div>
        </Dialog>

        {/* CSV Import Dialog */}
        <Dialog
          isOpen={importModalOpen}
          onClose={() => {
            setImportModalOpen(false);
            setCsvFile(null);
          }}
          title="Import Feedback from CSV"
          description="Upload a CSV file containing feedback items with text and channel columns."
          confirmLabel="Upload and Import"
          onConfirm={handleImportCsv}
          loading={importing}
        >
          <div className="space-y-3">
            <input
              type="file"
              accept=".csv"
              onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
              className="w-full text-xs text-secondary file:mr-3 file:py-1.5 file:px-3 file:rounded-badge file:border file:border-border file:text-xs file:font-medium file:bg-surface hover:file:bg-gray-50"
            />
            <p className="text-[11px] text-secondary">
              Expected CSV columns: <code>text</code>, <code>channel</code> (optional: <code>sentiment</code>, <code>featureArea</code>).
            </p>
          </div>
        </Dialog>
      </div>
    </AppShell>
  );
}

export default function FeedbackInboxPage() {
  return (
    <Suspense
      fallback={
        <AppShell>
          <div className="space-y-4">
            <Skeleton variant="card" count={1} />
            <Skeleton variant="row" count={8} />
          </div>
        </AppShell>
      }
    >
      <FeedbackInboxContent />
    </Suspense>
  );
}

