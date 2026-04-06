/**
 * Brand Modal Component
 *
 * Bulletproof modal that guarantees footer buttons are ALWAYS visible
 * above the iPhone bottom nav bar.
 *
 * Architecture:
 *   overlay (fixed inset-0)
 *     backdrop
 *     container (flex col, maxHeight with marginBottom for nav clearance)
 *       header (shrink-0)
 *       body (flex-1 overflow-y-auto min-h-0)
 *       footer (shrink-0) -- NEVER scrolls, ALWAYS visible
 *
 * Mobile: slides up from bottom, sits above 5rem nav + safe area
 * Desktop: centered with max-height constraint
 */

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
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={(e) => {
          if ((e.target as HTMLElement).closest('.pac-container')) return;
          onClose();
        }}
      />

      {/* Modal container */}
      <div
        className={`relative w-full ${sizeMap[size]} flex flex-col bg-[#132236] border border-[rgba(255,255,255,0.08)] rounded-t-2xl sm:rounded-2xl`}
        style={{
          maxHeight: 'calc(100dvh - 5rem - env(safe-area-inset-bottom, 0px) - env(safe-area-inset-top, 0px))',
          marginBottom: 'calc(5rem + env(safe-area-inset-bottom, 0px))',
        }}
      >
        {/* Header - never shrinks */}
        {(title || !hideClose) && (
          <div className="flex items-center justify-between px-5 py-4 border-b border-[rgba(255,255,255,0.06)] shrink-0">
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
                className="ml-4 w-10 h-10 flex items-center justify-center rounded-full text-white/30 hover:text-white/60 hover:bg-white/[0.06] transition-colors"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            )}
          </div>
        )}

        {/* Body - scrollable, takes remaining space */}
        <div className="flex-1 overflow-y-auto min-h-0 px-5 py-4 scroll-touch">
          {children}
        </div>

        {/* Footer - never shrinks, ALWAYS visible above bottom nav */}
        {footer && (
          <div className="shrink-0 px-5 py-4 border-t border-[rgba(255,255,255,0.06)] bg-[#132236] sm:rounded-b-2xl">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
