import React from 'react';

type SentimentType = 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL' | 'MIXED';
type StatusType = 'NEW' | 'REVIEWED' | 'ACTIONED';
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
        bg: 'bg-green-50 text-positive border-green-200',
        icon: '▲',
        label: 'Positive',
      },
      NEGATIVE: {
        bg: 'bg-red-50 text-negative border-red-200',
        icon: '▼',
        label: 'Negative',
      },
      NEUTRAL: {
        bg: 'bg-gray-100 text-neutral-600 border-gray-200',
        icon: '●',
        label: 'Neutral',
      },
      MIXED: {
        bg: 'bg-amber-50 text-warning border-amber-200',
        icon: '◆',
        label: 'Mixed',
      },
    }[val] || {
      bg: 'bg-gray-100 text-secondary border-border',
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
      NEW: 'bg-blue-50 text-blue-700 border-blue-200',
      REVIEWED: 'bg-purple-50 text-purple-700 border-purple-200',
      ACTIONED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    }[val] || 'bg-gray-100 text-secondary border-border';

    return (
      <span
        className={`inline-flex items-center px-2 py-0.5 text-xs font-medium border rounded-badge ${styles} ${className}`}
      >
        {val}
      </span>
    );
  }

  if (type === 'role') {
    const val = value as RoleType;
    const styles = {
      ADMIN: 'bg-indigo-50 text-accent border-indigo-200 font-semibold',
      ANALYST: 'bg-sky-50 text-sky-700 border-sky-200',
      VIEWER: 'bg-gray-100 text-secondary border-gray-200',
    }[val] || 'bg-gray-100 text-secondary border-border';

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
      className={`inline-flex items-center px-2 py-0.5 text-xs font-medium bg-gray-100 text-secondary border border-border rounded-badge ${className}`}
    >
      {value}
    </span>
  );
};
