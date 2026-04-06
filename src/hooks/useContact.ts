import useSWR from 'swr';

export function useContact(id: string | null) {
  const { data, error, isLoading, mutate } = useSWR(
    id ? `/api/contacts/${id}` : null
  );

  return {
    contact: data?.contact ?? null,
    activities: (data?.activities ?? []) as Array<Record<string, unknown>>,
    transactions: (data?.transactions ?? []) as Array<Record<string, unknown>>,
    isLoading,
    error,
    mutate,
  };
}
