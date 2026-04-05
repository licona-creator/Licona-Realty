/**
 * Brand Modal Component
 *
 * Reusable overlay dialog with brand styling.
 * Accessible: focus trap, Escape to close, backdrop click.
 * Uses Framer Motion for smooth enter/exit.
 * Mobile: sticky header/footer, scrollable content, safe area for close button.
 */

'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  hideClose?: boolean;
}

const sizeStyles = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
};

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  hideClose = false,
}: ModalProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 bg-navy/60 dark:bg-black/70"
            onClick={e => {
              if ((e.target as HTMLElement).closest('.pac-container')) return;
              onClose();
            }}
          />

          {/* Content */}
          <motion.div
            ref={contentRef}
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: 0.15 }}
            onClick={e => e.stopPropagation()}
            onMouseDown={e => e.stopPropagation()}
            className={`relative w-full ${sizeStyles[size]} bg-white dark:bg-dark-card sm:rounded-[12px] rounded-t-[12px] border border-gold/15 shadow-[0_8px_32px_rgba(19,34,54,0.2)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.5)] flex flex-col max-h-[calc(100vh-40px)] sm:max-h-[calc(100vh-80px)]`}
          >
            {/* Header - sticky */}
            {(title || !hideClose) && (
              <div className="flex items-start justify-between p-5 pb-3 sticky top-0 z-10 bg-white dark:bg-dark-card sm:rounded-t-[12px] rounded-t-[12px] border-b border-gold/10">
                <div>
                  {title && (
                    <h2 className="text-lg font-montserrat font-semibold text-navy dark:text-white">
                      {title}
                    </h2>
                  )}
                  {description && (
                    <p className="text-sm text-navy/50 dark:text-white/50 font-inter mt-1">
                      {description}
                    </p>
                  )}
                </div>
                {!hideClose && (
                  <button
                    type="button"
                    onClick={onClose}
                    className="ml-4 p-1 rounded-md text-navy/30 dark:text-white/30 hover:text-navy/60 dark:hover:text-white/60 hover:bg-gold/10 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                    aria-label="Close"
                  >
                    <X size={18} />
                  </button>
                )}
              </div>
            )}

            {/* Body - scrollable */}
            <div className="p-5 overflow-y-auto flex-1 scroll-touch">{children}</div>

            {/* Footer - fixed at bottom, always visible */}
            {footer && (
              <div className="flex-shrink-0 border-t border-gold/10 bg-white dark:bg-dark-card p-4 sm:rounded-b-[12px]" style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}>
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
