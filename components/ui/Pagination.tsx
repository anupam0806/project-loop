import React from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { Button } from './Button';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems?: number;
  pageSize?: number;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  pageSize,
}) => {
  if (totalPages <= 1 && !totalItems) return null;

  const start = totalItems ? Math.min((currentPage - 1) * (pageSize || 25) + 1, totalItems) : 0;
  const end = totalItems ? Math.min(currentPage * (pageSize || 25), totalItems) : 0;

  return (
    <div className="flex items-center justify-between border-t border-border pt-3 mt-4 text-xs text-secondary">
      <div>
        {totalItems !== undefined ? (
          <span>
            Showing <strong className="font-semibold text-primary">{start}</strong> to{' '}
            <strong className="font-semibold text-primary">{end}</strong> of{' '}
            <strong className="font-semibold text-primary">{totalItems}</strong> items
          </span>
        ) : (
          <span>
            Page <strong className="font-semibold text-primary">{currentPage}</strong> of{' '}
            <strong className="font-semibold text-primary">{totalPages}</strong>
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
          aria-label="Previous page"
        >
          <ChevronLeftIcon className="w-3.5 h-3.5 mr-1 inline" aria-hidden="true" />
          Previous
        </Button>
        <span className="px-2 font-medium text-primary">
          {currentPage} / {Math.max(1, totalPages)}
        </span>
        <Button
          variant="secondary"
          size="sm"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          aria-label="Next page"
        >
          Next
          <ChevronRightIcon className="w-3.5 h-3.5 ml-1 inline" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
};
