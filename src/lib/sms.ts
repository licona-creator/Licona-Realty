/**
 * SMS deep link utility for iOS native Messages integration.
 */
export function createSMSLink(phone: string, message: string): string {
  const cleanPhone = phone.replace(/\D/g, '');
  const encoded = encodeURIComponent(message);
  return `sms:${cleanPhone}&body=${encoded}`;
}
