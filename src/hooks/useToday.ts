import useSWR from 'swr';

interface MoneyMove {
  type: 'closing_soon' | 'document_gap' | 'follow_up_hot';
  title: string;
  subtitle: string;
  action: string;
  contact_id?: string;
  transaction_id?: string;
  urgency: 'high' | 'medium' | 'low';
}

interface NurtureItem {
  contact_id: string;
  name: string;
  reason: string;
  disc_type?: string | null;
  language?: string | null;
  suggested_message: string;
  phone: string;
  action_type: 'text' | 'call';
}

interface GrowItem {
  type: 'content_idea' | 'milestone';
  title: string;
  description: string;
}

interface TodayStats {
  active_deals: number;
  pipeline_value: number;
  days_to_next_closing: number | null;
  contacts_touched_this_week: number;
  overdue_followups: number;
}

export interface TodayData {
  greeting: string;
  date: string;
  money_moves: MoneyMove[];
  nurture: NurtureItem[];
  grow: GrowItem[];
  stats: TodayStats;
}

export function useToday() {
  const { data, error, isLoading, mutate } = useSWR<TodayData>('/api/today');

  return {
    data: data ?? null,
    isLoading,
    error,
    mutate,
  };
}
