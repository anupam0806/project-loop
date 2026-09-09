import React from 'react';

interface SkeletonProps {
  variant?: 'row' | 'card' | 'text' | 'chart';
  count?: number;
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ variant = 'text', count = 1, className = '' }) => {
  const items = Array.from({ length: count }, (_, i) => i);

  if (variant === 'card') {
    return (
      <div className={`space-y-3 ${className}`}>
        {items.map((i) => (
          <div
            key={i}
            className="p-4 bg-surface border border-border rounded-DEFAULT animate-pulse space-y-2.5"
          >
            <div className="h-3.5 bg-gray-200 rounded w-1/3"></div>
            <div className="h-5 bg-gray-200 rounded w-2/3"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
          </div>
        ))}
      </div>
    );
  }

  if (variant === 'row') {
    return (
      <div className={`space-y-2 ${className}`}>
        {items.map((i) => (
          <div
            key={i}
            className="h-10 bg-gray-200/70 rounded-DEFAULT animate-pulse w-full"
          ></div>
        ))}
      </div>
    );
  }

  if (variant === 'chart') {
    return (
      <div className={`h-48 bg-gray-100 border border-border rounded-DEFAULT animate-pulse p-4 flex items-end gap-3 ${className}`}>
        <div className="h-24 bg-gray-200 rounded-t w-full"></div>
        <div className="h-36 bg-gray-200 rounded-t w-full"></div>
        <div className="h-28 bg-gray-200 rounded-t w-full"></div>
        <div className="h-40 bg-gray-200 rounded-t w-full"></div>
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {items.map((i) => (
        <div key={i} className="h-4 bg-gray-200 rounded animate-pulse w-full"></div>
      ))}
    </div>
  );
};
