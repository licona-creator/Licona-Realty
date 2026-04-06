import useSWR from 'swr';

interface PowerMove {
  label: string;
  action: string;
  button_type: 'call' | 'text' | 'open';
  button_label: string;
  href: string;
}

interface CommissionData {
  ytd_earned: number;
  pending: number;
  goal: number;
  deals_closed: number;
  deals_active: number;
  deals_goal: number;
  deal_dots: Array<'closed' | 'active' | 'empty'>;
}

interface MoneyMove {
  transaction_id: string;
  contact_id: string | null;
  address: string;
  contact_name: string;
  days_to_close: number;
  doc_completion_pct: number;
  doc_done: number;
  doc_total: number;
  party_name: string | null;
  party_phone: string | null;
  party_role: string | null;
}

interface NurtureCard {
  contact_id: string;
  name: string;
  first_name: string;
  reason: string;
  reason_type: 'overdue' | 'birthday' | 'quiet';
  days: number;
  disc_type: string | null;
  language: string | null;
  track_type: string;
  suggested_message: string;
  phone: string;
}

interface AnaInsight {
  ana_name: string;
  ana_deals: number;
  total_deals: number;
  ana_phone: string | null;
  ana_last_contact: string | null;
  days_since_contact: number | null;
}

export interface TodayData {
  greeting: string;
  date: string;
  commission: CommissionData;
  power_move: PowerMove | null;
  streak: number;
  money_moves: MoneyMove[];
  nurture: NurtureCard[];
  ana_insight: AnaInsight | null;
  overdue_count: number;
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
