export interface LeadScoreBreakdown {
  score: number;
  factors: { label: string; points: number }[];
}

interface LeadScoreInput {
  phone?: string | null;
  email?: string | null;
  budget?: string | null;
  pre_approved?: boolean;
  pipeline_stage?: string | null;
  referral_partner_id?: string | null;
  last_contact_date?: string | null;
  inbound_activity_count?: number;
  has_active_transaction?: boolean;
}

const STAGE_SCORES: Record<string, number> = {
  new: 10,
  contacted: 20,
  qualifying: 30,
  responding: 40,
  nurturing: 15,
  showing: 50,
  offer: 60,
  under_contract: 70,
  closing: 80,
  closed: 100,
  cold: 5,
  on_hold: 5,
  lost: 0,
};

export function calculateLeadScore(input: LeadScoreInput): LeadScoreBreakdown {
  const factors: { label: string; points: number }[] = [];
  let score = 0;

  // Pipeline stage base score
  const stageScore = STAGE_SCORES[input.pipeline_stage || 'new'] ?? 10;
  factors.push({ label: `Pipeline: ${(input.pipeline_stage || 'new').replace(/_/g, ' ')}`, points: stageScore });
  score += stageScore;

  // Has phone number
  if (input.phone) {
    factors.push({ label: 'Has phone number', points: 5 });
    score += 5;
  }

  // Has email
  if (input.email) {
    factors.push({ label: 'Has email', points: 5 });
    score += 5;
  }

  // Budget specified
  if (input.budget) {
    factors.push({ label: 'Budget specified', points: 10 });
    score += 10;
  }

  // Pre-approved
  if (input.pre_approved) {
    factors.push({ label: 'Pre-approved', points: 15 });
    score += 15;
  }

  // Inbound activity (responded to outreach)
  const inboundCount = input.inbound_activity_count || 0;
  if (inboundCount > 0) {
    factors.push({ label: 'Responded to outreach', points: 20 });
    score += 20;

    // Multiple inbound activities bonus (max +15)
    if (inboundCount > 1) {
      const bonus = Math.min((inboundCount - 1) * 5, 15);
      factors.push({ label: `${inboundCount} inbound activities`, points: bonus });
      score += bonus;
    }
  }

  // Referred by partner
  if (input.referral_partner_id) {
    factors.push({ label: 'Referred by partner', points: 15 });
    score += 15;
  }

  // Active transaction linked
  if (input.has_active_transaction) {
    factors.push({ label: 'Active transaction linked', points: 25 });
    score += 25;
  }

  // Days since last contact penalty
  if (input.last_contact_date) {
    const daysSince = Math.floor(
      (Date.now() - new Date(input.last_contact_date + 'T00:00:00').getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysSince > 7) {
      const penalty = Math.min((daysSince - 7) * 2, 20);
      factors.push({ label: `No contact in ${daysSince} days`, points: -penalty });
      score -= penalty;
    }
  }

  return {
    score: Math.max(0, Math.min(100, score)),
    factors,
  };
}

export function getScoreColor(score: number): string {
  if (score <= 25) return 'red';
  if (score <= 50) return 'orange';
  if (score <= 75) return 'yellow';
  return 'green';
}

export function getScoreTailwind(score: number): { bg: string; text: string; ring: string } {
  if (score <= 25) return { bg: 'bg-red-500/10', text: 'text-red-600', ring: 'ring-red-500/30' };
  if (score <= 50) return { bg: 'bg-orange-500/10', text: 'text-orange-600', ring: 'ring-orange-500/30' };
  if (score <= 75) return { bg: 'bg-yellow-500/10', text: 'text-yellow-600', ring: 'ring-yellow-500/30' };
  return { bg: 'bg-green-500/10', text: 'text-green-600', ring: 'ring-green-500/30' };
}
