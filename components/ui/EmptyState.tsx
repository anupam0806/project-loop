import React from 'react';
import { InboxIcon } from '@heroicons/react/24/outline';

interface EmptyStateProps {
  title: string;
  description: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ title, description, action, icon }) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center bg-surface border border-dashed border-border rounded-DEFAULT">
      {icon ? (
        <div className="mb-3 text-secondary">{icon}</div>
      ) : (
        <div className="w-10 h-10 mb-3 rounded-full bg-gray-100 flex items-center justify-center text-secondary">
          <InboxIcon className="w-5 h-5" aria-hidden="true" />
        </div>
      )}
      <h4 className="text-sm font-semibold text-primary">{title}</h4>
      <p className="mt-1 text-xs text-secondary max-w-sm">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
};
