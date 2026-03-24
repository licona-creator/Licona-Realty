/**
 * Toast Provider Client Wrapper
 *
 * Wraps the app with ToastProvider since root layout is a Server Component.
 */

'use client';

import { ToastProvider } from '@/components/ui/Toast';

export function ToastProviderWrapper({ children }: { children: React.ReactNode }) {
  return <ToastProvider>{children}</ToastProvider>;
}
