import useSWR from 'swr';

export function useDashboard() {
  const { data, error, isLoading, mutate } = useSWR('/api/dashboard');

  return {
    data: data ?? null,
    isLoading,
    error,
    mutate,
  };
}
