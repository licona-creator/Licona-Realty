import useSWR from 'swr';

export function useTransactions() {
  const { data, error, isLoading, mutate } = useSWR('/api/transactions');

  return {
    transactions: (data?.transactions ?? []) as Array<Record<string, unknown>>,
    pipelineValue: (data?.pipelineValue ?? 0) as number,
    closedValue: (data?.closedValue ?? 0) as number,
    isLoading,
    error,
    mutate,
  };
}
