/**
 * SMS and phone deep link utilities for iOS/Android native integration.
 */

export function createSMSLink(phone: string, message?: string): string {
  const clean = phone.replace(/\D/g, '');
  if (!message) return `sms:${clean}`;
  return `sms:${clean}&body=${encodeURIComponent(message)}`;
}

export function createCallLink(phone: string): string {
  return `tel:${phone.replace(/\D/g, '')}`;
}
