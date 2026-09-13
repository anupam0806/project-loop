import React from 'react';
import { ExclamationTriangleIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { Button } from './Button';

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
  title?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Something went wrong',
  message = 'We encountered an error loading this information. Please try again.',
  onRetry,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center bg-surface border border-red-200 rounded-DEFAULT">
      <div className="w-10 h-10 mb-3 rounded-full bg-red-50 flex items-center justify-center text-negative">
        <ExclamationTriangleIcon className="w-5 h-5" aria-hidden="true" />
      </div>
      <h4 className="text-sm font-semibold text-primary">{title}</h4>
      <p className="mt-1 text-xs text-secondary max-w-sm">{message}</p>
      {onRetry && (
        <div className="mt-4">
          <Button variant="secondary" size="sm" onClick={onRetry}>
            <ArrowPathIcon className="w-3.5 h-3.5 mr-1" aria-hidden="true" />
            Retry
          </Button>
        </div>
      )}
    </div>
  );
};
