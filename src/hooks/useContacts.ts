import useSWR from 'swr';

export function useContacts(trackType?: string) {
  const params = trackType && trackType !== 'all' ? `?track_type=${trackType}` : '';
  const { data, error, isLoading, mutate } = useSWR(`/api/contacts${params}`);

  return {
    contacts: (data?.contacts ?? []) as Array<Record<string, unknown>>,
    isLoading,
    error,
    mutate,
  };
}
