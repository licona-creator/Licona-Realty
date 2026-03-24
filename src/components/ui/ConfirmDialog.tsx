/**
 * Confirm Dialog Component
 *
 * Replaces native confirm() with brand-styled modal.
 * Supports danger variant for destructive actions.
 */

'use client';

import { Modal } from './Modal';
import { Button } from './Button';
import { AlertTriangle } from 'lucide-react';

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'default' | 'danger';
  loading?: boolean;
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
  loading = false,
}: ConfirmDialogProps) {
  return (
    <Modal open={open} onClose={onClose} size="sm" hideClose>
      <div className="text-center">
        {variant === 'danger' && (
          <div className="w-12 h-12 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle size={24} className="text-red-500" />
          </div>
        )}
        <h3 className="text-lg font-montserrat font-semibold text-navy dark:text-white mb-2">
          {title}
        </h3>
        <p className="text-sm text-navy/60 dark:text-white/60 font-inter mb-6">
          {message}
        </p>
        <div className="flex items-center gap-3 justify-center">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            variant={variant === 'danger' ? 'danger' : 'accent'}
            size="sm"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            loading={loading}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
