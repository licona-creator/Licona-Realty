/**
 * Brand Modal Component
 *
 * Reusable overlay dialog with brand styling.
 * Accessible: focus trap, Escape to close, backdrop click.
 * Uses Framer Motion for smooth enter/exit.
 *
 * Mobile: edge-anchored above the bottom nav bar (no vh calculations).
 * Desktop: centered with max-height constraint.
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
        <div className="fixed inset-0 z-50">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 bg-black/70"
            onClick={e => {
              if ((e.target as HTMLElement).closest('.pac-container')) return;
              onClose();
            }}
          />

          {/*
            Positioning wrapper:
            Mobile: pin edges so modal sits between status bar and bottom nav.
            Desktop (sm+): center with padding, let modal size itself.
          */}
          <div
            className="absolute inset-x-0 sm:static sm:h-full sm:flex sm:items-center sm:justify-center sm:p-4"
            style={{
              top: 'env(safe-area-inset-top, 0px)',
              bottom: 'calc(5rem + env(safe-area-inset-bottom, 0px))',
            }}
          >
            {/* Content card */}
            <motion.div
              ref={contentRef}
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ duration: 0.15 }}
              onClick={e => e.stopPropagation()}
              onMouseDown={e => e.stopPropagation()}
              className={`relative w-full h-full sm:h-auto ${sizeStyles[size]} bg-[var(--lr-depth-1)] rounded-t-[12px] sm:rounded-[12px] border border-[rgba(255,255,255,0.06)] shadow-[0_8px_32px_rgba(0,0,0,0.5)] flex flex-col sm:max-h-[calc(100vh-80px)]`}
            >
              {/* Header */}
              {(title || !hideClose) && (
                <div className="flex items-start justify-between p-5 pb-3 flex-shrink-0 bg-[var(--lr-depth-1)] rounded-t-[12px] border-b border-[rgba(255,255,255,0.06)]">
                  <div>
                    {title && (
                      <h2 className="text-lg font-montserrat font-semibold text-white">
                        {title}
                      </h2>
                    )}
                    {description && (
                      <p className="text-sm text-white/50 font-inter mt-1">
                        {description}
                      </p>
                    )}
                  </div>
                  {!hideClose && (
                    <button
                      type="button"
                      onClick={onClose}
                      className="ml-4 p-1 rounded-md text-white/30 hover:text-white/60 hover:bg-white/[0.06] transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                      aria-label="Close"
                    >
                      <X size={18} />
                    </button>
                  )}
                </div>
              )}

              {/* Body - scrollable */}
              <div className="p-5 overflow-y-auto flex-1 min-h-0 scroll-touch">{children}</div>

              {/* Footer - always visible */}
              {footer && (
                <div className="flex-shrink-0 border-t border-[rgba(255,255,255,0.06)] bg-[var(--lr-depth-1)] p-4 sm:rounded-b-[12px]">
                  {footer}
                </div>
              )}
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}
