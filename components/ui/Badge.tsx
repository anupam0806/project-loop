import React from 'react';
import { CheckCircleIcon } from '@heroicons/react/20/solid';

type SentimentType = 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL' | 'MIXED';
type StatusType = 'NEW' | 'REVIEWED' | 'ACTIONED' | 'RESOLVED';
type RoleType = 'ADMIN' | 'ANALYST' | 'VIEWER';

interface BadgeProps {
  type: 'sentiment' | 'status' | 'role' | 'generic';
  value: SentimentType | StatusType | RoleType | string;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ type, value, className = '' }) => {
  if (type === 'sentiment') {
    const val = value as SentimentType;
    const config = {
      POSITIVE: {
        bg: 'bg-green-50 text-positive border-green-200 dark:bg-green-950/30 dark:border-green-900/50 dark:text-green-400',
        icon: '▲',
        label: 'Positive',
      },
      NEGATIVE: {
        bg: 'bg-red-50 text-negative border-red-200 dark:bg-red-950/30 dark:border-red-900/50 dark:text-red-400',
        icon: '▼',
        label: 'Negative',
      },
      NEUTRAL: {
        bg: 'bg-surface-muted text-secondary border-border',
        icon: '●',
        label: 'Neutral',
      },
      MIXED: {
        bg: 'bg-amber-50 text-warning border-amber-200 dark:bg-amber-950/30 dark:border-amber-900/50 dark:text-amber-400',
        icon: '◆',
        label: 'Mixed',
      },
    }[val] || {
      bg: 'bg-surface-muted text-secondary border-border',
      icon: '—',
      label: val || 'Unknown',
    };

    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium border rounded-badge ${config.bg} ${className}`}
      >
        <span className="text-[9px] leading-none" aria-hidden="true">
          {config.icon}
        </span>
        <span>{config.label}</span>
      </span>
    );
  }

  if (type === 'status') {
    const val = value as StatusType;
    const styles = {
      NEW: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900/60',
      REVIEWED: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-900/60',
      ACTIONED: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/60',
      RESOLVED: 'bg-teal-50 text-teal-800 border-teal-300 font-medium dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-900/60',
    }[val] || 'bg-surface-muted text-secondary border-border';

    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium border rounded-badge ${styles} ${className}`}
      >
        {val === 'RESOLVED' && (
          <CheckCircleIcon className="w-3 h-3 text-teal-700 dark:text-teal-400 shrink-0" aria-hidden="true" />
        )}
        <span>{val}</span>
      </span>
    );
  }

  if (type === 'role') {
    const val = value as RoleType;
    const styles = {
      ADMIN: 'bg-indigo-50 text-accent border-indigo-200 font-semibold dark:bg-indigo-950/40 dark:border-indigo-900/60 dark:text-indigo-300',
      ANALYST: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:border-sky-900/60 dark:text-sky-300',
      VIEWER: 'bg-surface-muted text-secondary border-border',
    }[val] || 'bg-surface-muted text-secondary border-border';

    return (
      <span
        className={`inline-flex items-center px-2 py-0.5 text-xs uppercase tracking-wider border rounded-badge ${styles} ${className}`}
      >
        {val}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-xs font-medium bg-surface-muted text-secondary border border-border rounded-badge ${className}`}
    >
      {value}
    </span>
  );
};
