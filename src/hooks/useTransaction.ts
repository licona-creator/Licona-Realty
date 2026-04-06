import useSWR from 'swr';

export function useTransaction(id: string | null) {
  const { data, error, isLoading, mutate } = useSWR(
    id ? `/api/transactions/${id}` : null
  );

  return {
    transaction: data?.transaction ?? null,
    isLoading,
    error,
    mutate,
  };
}
