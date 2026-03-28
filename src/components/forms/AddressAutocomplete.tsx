/**
 * Re-export AddressAutocomplete from shared directory.
 *
 * The Google Places Autocomplete component lives in src/components/shared/AddressAutocomplete.tsx
 * and is already integrated into AddContactModal, NewTransactionModal, and edit forms.
 *
 * Requirements:
 * - NEXT_PUBLIC_GOOGLE_MAPS_API_KEY must be set in environment variables
 * - Google Places API must be enabled on the Google Cloud project
 * - Falls back to regular text input if no API key is found
 */
export { AddressAutocomplete } from '@/components/shared/AddressAutocomplete';
