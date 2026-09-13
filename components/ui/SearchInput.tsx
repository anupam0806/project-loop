import React, { forwardRef } from 'react';
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface SearchInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onClear?: () => void;
}

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  ({ value, onClear, className = '', ...props }, ref) => {
    return (
      <div className="relative w-full">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-secondary">
          <MagnifyingGlassIcon className="w-4 h-4" aria-hidden="true" />
        </div>
        <input
          ref={ref}
          type="search"
          value={value}
          className={`w-full pl-9 pr-8 py-2 text-sm bg-surface border border-border rounded-DEFAULT text-primary placeholder-secondary/60 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent ${className}`}
          placeholder="Search feedback..."
          {...props}
        />
        {value && onClear && (
          <button
            type="button"
            onClick={onClear}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-secondary hover:text-primary focus:outline-none"
            aria-label="Clear search"
          >
            <XMarkIcon className="w-4 h-4" aria-hidden="true" />
          </button>
        )}
      </div>
    );
  }
);

SearchInput.displayName = 'SearchInput';
