'use client';

import React, { useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { Button } from './Button';

interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: React.ReactNode;
  confirmLabel?: string;
  confirmVariant?: 'primary' | 'destructive';
  onConfirm?: () => void;
  loading?: boolean;
}

export const Dialog: React.FC<DialogProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  confirmLabel,
  confirmVariant = 'primary',
  onConfirm,
  loading = false,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-none"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dialog-title"
    >
      <div
        className="w-full max-w-md bg-surface border border-border rounded-DEFAULT shadow-dialog p-5 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 id="dialog-title" className="text-base font-semibold text-primary">
              {title}
            </h3>
            {description && (
              <p className="mt-1 text-xs text-secondary leading-relaxed">
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-secondary hover:text-primary p-1 -mr-1 rounded-DEFAULT focus:outline-none focus:ring-2 focus:ring-accent"
            aria-label="Close dialog"
          >
            <XMarkIcon className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        {children && <div>{children}</div>}

        <div className="flex items-center justify-end gap-2.5 pt-2">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          {confirmLabel && onConfirm && (
            <Button
              variant={confirmVariant}
              size="sm"
              onClick={onConfirm}
              loading={loading}
            >
              {confirmLabel}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
