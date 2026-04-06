/**
 * Display Name Formatter
 *
 * Single source of truth for combining first_name + last_name.
 * Handles empty last names without trailing spaces.
 */

export function getDisplayName(contact: { first_name?: string | null; last_name?: string | null }): string {
  const first = (contact.first_name || '').trim();
  const last = (contact.last_name || '').trim();

  if (first && last) return `${first} ${last}`;
  if (first) return first;
  if (last) return last;
  return 'Unknown Contact';
}

export function getInitials(contact: { first_name?: string | null; last_name?: string | null }): string {
  const first = (contact.first_name || '').trim();
  const last = (contact.last_name || '').trim();

  const f = first ? first[0].toUpperCase() : '';
  const l = last ? last[0].toUpperCase() : '';

  if (f && l) return `${f}${l}`;
  if (f) return f;
  if (l) return l;
  return '?';
}

export function formatMoney(amount: number): string {
  if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`;
  if (amount >= 1000) return `$${(amount / 1000).toFixed(0)}K`;
  return `$${amount.toLocaleString()}`;
}
