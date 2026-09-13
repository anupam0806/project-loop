'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { ArrowLeftIcon, TrashIcon } from '@heroicons/react/24/outline';
import { AppShell } from '../../../components/layout/AppShell';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Select } from '../../../components/ui/Select';
import { Skeleton } from '../../../components/ui/Skeleton';
import { ErrorState } from '../../../components/ui/ErrorState';
import { Dialog } from '../../../components/ui/Dialog';

interface FeedbackDetail {
  id: string;
  text: string;
  channel: string;
  sentiment: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL' | 'MIXED' | null;
  sentimentScore: number | null;
  status: 'NEW' | 'REVIEWED' | 'ACTIONED';
  featureArea: string | null;
  urgency: string | null;
  category: string | null;
  createdAt: string;
  updatedAt: string;
  themes?: Array<{ theme: { id: string; name: string }; confidence?: number }>;
}

export default function FeedbackDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const userRole = (session?.user as any)?.role || 'VIEWER';
  const canEdit = userRole === 'ADMIN' || userRole === 'ANALYST';
  const canDelete = userRole === 'ADMIN';

  const [feedback, setFeedback] = useState<FeedbackDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [retryingAI, setRetryingAI] = useState(false);

  const fetchFeedback = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/feedback/${params.id}`);
      if (!res.ok) {
        if (res.status === 404) {
          throw new Error('Feedback record not found in this workspace.');
        }
        throw new Error('Failed to retrieve feedback record.');
      }
      const json = await res.json();
      setFeedback(json.data);
    } catch (err: any) {
      setError(err.message || 'Error loading feedback.');
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    fetchFeedback();
  }, [fetchFeedback]);

  const handleStatusChange = async (newStatus: string) => {
    if (!feedback || !canEdit) return;
    setUpdatingStatus(true);
    try {
      const res = await fetch(`/api/feedback/${feedback.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        throw new Error('Failed to update status.');
      }

      const json = await res.json();
      setFeedback((prev) => (prev ? { ...prev, status: json.data.status } : null));
    } catch (err: any) {
      alert(err.message || 'Update failed');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleDelete = async () => {
    if (!feedback || !canDelete) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/feedback/${feedback.id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        throw new Error('Failed to delete feedback item.');
      }

      router.push('/feedback');
    } catch (err: any) {
      alert(err.message || 'Deletion failed');
      setDeleting(false);
    }
  };

  const handleRetryAnalysis = async () => {
    if (!feedback || retryingAI) return;
    setRetryingAI(true);
    try {
      const res = await fetch(`/api/feedback/${feedback.id}/analyze`, {
        method: 'POST',
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        const msg = errorData?.error?.message || 'AI analysis failed. Please try again.';
        throw new Error(msg);
      }

      const json = await res.json();
      if (json.data) {
        setFeedback(json.data);
      }
      await fetchFeedback();
    } catch (err: any) {
      alert(err.message || 'AI analysis failed. Please try again.');
    } finally {
      setRetryingAI(false);
    }
  };

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto space-y-4">
        {/* Navigation Breadcrumb back */}
        <div>
          <Link
            href="/feedback"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-secondary hover:text-primary transition-colors"
          >
            <ArrowLeftIcon className="w-3.5 h-3.5" aria-hidden="true" />
            Back to Feedback Inbox
          </Link>
        </div>

        {loading && <Skeleton variant="card" count={2} />}

        {error && !loading && (
          <ErrorState message={error} onRetry={fetchFeedback} />
        )}

        {!loading && !error && feedback && (
          <div className="space-y-4">
            {/* Primary Content Card */}
            <Card className="p-6 space-y-5">
              {/* Feedback Content */}
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-secondary">
                  Customer Submission
                </span>
                <p className="mt-2 text-base text-primary leading-relaxed font-normal whitespace-pre-wrap">
                  {feedback.text}
                </p>
              </div>

              {/* Metadata Row */}
              <div className="pt-4 border-t border-border flex flex-wrap items-center justify-between gap-3 text-xs text-secondary">
                <div className="flex items-center gap-4">
                  <div>
                    <span className="font-semibold text-primary">Channel: </span>
                    <span>{feedback.channel}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-primary">Received: </span>
                    <span>{new Date(feedback.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="font-semibold text-primary">Status:</span>
                  {canEdit ? (
                    <select
                      value={feedback.status}
                      disabled={updatingStatus}
                      onChange={(e) => handleStatusChange(e.target.value)}
                      className="px-2 py-1 text-xs bg-surface border border-border rounded-badge text-primary focus:ring-1 focus:ring-accent"
                    >
                      <option value="NEW">NEW</option>
                      <option value="REVIEWED">REVIEWED</option>
                      <option value="ACTIONED">ACTIONED</option>
                    </select>
                  ) : (
                    <Badge type="status" value={feedback.status} />
                  )}
                </div>
              </div>
            </Card>

            {/* AI Classification & Themes Card */}
            <Card className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-primary">AI Analysis & Classification</h3>
                {feedback.sentiment ? (
                  <Badge type="sentiment" value={feedback.sentiment} />
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium bg-amber-50 text-warning border border-amber-200 rounded-badge">
                      <span className="w-1.5 h-1.5 rounded-full bg-warning animate-pulse" />
                      Analyzing…
                    </span>
                    <button
                      type="button"
                      onClick={handleRetryAnalysis}
                      disabled={retryingAI}
                      className="text-xs text-accent hover:underline"
                    >
                      {retryingAI ? 'Retrying…' : 'Retry analysis'}
                    </button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs pt-2">
                <div>
                  <span className="text-secondary block">Feature Area</span>
                  <span className="font-medium text-primary mt-0.5 block">
                    {feedback.featureArea || '—'}
                  </span>
                </div>
                <div>
                  <span className="text-secondary block">Urgency</span>
                  <span className="font-medium text-primary mt-0.5 block">
                    {feedback.urgency || 'Normal'}
                  </span>
                </div>
                <div>
                  <span className="text-secondary block">Category</span>
                  <span className="font-medium text-primary mt-0.5 block">
                    {feedback.category || 'General Feedback'}
                  </span>
                </div>
              </div>

              {/* Themes */}
              <div className="pt-3 border-t border-border">
                <span className="text-xs font-semibold text-secondary block mb-2">
                  Associated Themes
                </span>
                {feedback.themes && feedback.themes.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {feedback.themes.map((ft) => (
                      <Link
                        key={ft.theme.id}
                        href={`/feedback?theme=${encodeURIComponent(ft.theme.name)}`}
                        className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-badge bg-gray-100 text-primary hover:bg-accent-soft hover:text-accent border border-border transition-colors"
                      >
                        {ft.theme.name}
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-secondary">No themes tagged to this item.</p>
                )}
              </div>
            </Card>

            {/* Actions for Admin */}
            {canDelete && (
              <div className="flex justify-end pt-2">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setDeleteModalOpen(true)}
                >
                  <TrashIcon className="w-3.5 h-3.5 mr-1" aria-hidden="true" />
                  Delete Feedback
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Delete Confirmation Modal */}
        <Dialog
          isOpen={deleteModalOpen}
          onClose={() => setDeleteModalOpen(false)}
          title="Delete Customer Feedback"
          description="Are you sure you want to permanently delete this feedback record? This action cannot be undone."
          confirmLabel="Delete permanently"
          confirmVariant="destructive"
          onConfirm={handleDelete}
          loading={deleting}
        />
      </div>
    </AppShell>
  );
}
