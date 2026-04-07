'use client';

import { useEffect, useRef, type ReactNode } from 'react';
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

const sizeMap = {
  sm: 'sm:max-w-sm',
  md: 'sm:max-w-md',
  lg: 'sm:max-w-lg',
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
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div
        ref={overlayRef}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={(e) => {
          if ((e.target as HTMLElement).closest('.pac-container')) return;
          if (e.target === overlayRef.current) onClose();
        }}
      />

      {/* Mobile: full-screen sheet. Desktop: centered card. */}
      <div className="relative z-10 flex flex-col h-full sm:items-center sm:justify-center sm:p-4">
        <div
          className={`flex flex-col flex-1 sm:flex-initial w-full ${sizeMap[size]} bg-[#132236] sm:border sm:border-[rgba(255,255,255,0.08)] sm:rounded-2xl sm:max-h-[80vh] overflow-hidden`}
        >
          {/* Header */}
          {(title || !hideClose) && (
            <div
              className="shrink-0 flex items-center justify-between px-5 border-b border-[rgba(255,255,255,0.06)]"
              style={{
                paddingTop: 'calc(1rem + env(safe-area-inset-top, 0px))',
                paddingBottom: '1rem',
              }}
            >
              <div className="min-w-0">
                {title && (
                  <h2 className="text-lg font-montserrat font-semibold text-white truncate">
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
                  className="ml-4 shrink-0 w-10 h-10 flex items-center justify-center rounded-full text-white/30 hover:text-white/60 hover:bg-white/[0.06] transition-colors"
                  aria-label="Close"
                >
                  <X size={18} />
                </button>
              )}
            </div>
          )}

          {/* Body - scrolls */}
          <div className="flex-1 overflow-y-auto min-h-0 overscroll-contain">
            <div className="px-5 py-4">
              {children}
            </div>
          </div>

          {/* Footer - NEVER scrolls, sits at bottom */}
          {footer && (
            <div
              className="shrink-0 px-5 pt-4 border-t border-[rgba(255,255,255,0.06)] bg-[#132236]"
              style={{
                paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))',
              }}
            >
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
