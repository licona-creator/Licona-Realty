/**
 * Self-Optimizing Intelligence Layer
 *
 * Monitors platform health, surfaces smart suggestions,
 * detects stale contacts, analyzes campaign performance,
 * and learns from agent behavior patterns.
 */

import { BRAND } from '@/lib/brand';

export type AlertSeverity = 'info' | 'warning' | 'urgent';

export interface IntelligenceAlert {
  category: string;
  message: string;
  severity: AlertSeverity;
  actionPath: string | null;
  metadata?: Record<string, unknown>;
}

// Contact staleness thresholds (days)
const STALE_THRESHOLDS = {
  buyer: 7,
  seller: 5,
  investor: 14,
  tenant: 10,
  landlord: 14,
};

// Check for stale contacts that need outreach
export function detectStaleContacts(
  contacts: Array<{
    id: string;
    firstName: string;
    lastName: string;
    trackType: string;
    pipelineStage: string;
    lastContactedAt: string | null;
  }>
): IntelligenceAlert[] {
  const alerts: IntelligenceAlert[] = [];
  const now = new Date();

  for (const contact of contacts) {
    if (!contact.lastContactedAt) {
      if (['new', 'contacted', 'qualifying'].includes(contact.pipelineStage)) {
        alerts.push({
          category: 'stale_contact',
          message: `${contact.firstName} ${contact.lastName} has never been contacted`,
          severity: 'warning',
          actionPath: `/contacts?id=${contact.id}`,
        });
      }
      continue;
    }

    const daysSinceContact = Math.floor(
      (now.getTime() - new Date(contact.lastContactedAt).getTime()) / (1000 * 60 * 60 * 24)
    );

    const threshold = STALE_THRESHOLDS[contact.trackType as keyof typeof STALE_THRESHOLDS] || 14;

    if (daysSinceContact > threshold && !['closed', 'lost'].includes(contact.pipelineStage)) {
      alerts.push({
        category: 'stale_contact',
        message: `${contact.firstName} ${contact.lastName} (${contact.trackType}) — ${daysSinceContact} days since last contact`,
        severity: daysSinceContact > threshold * 2 ? 'urgent' : 'warning',
        actionPath: `/contacts?id=${contact.id}`,
        metadata: { daysSinceContact, threshold },
      });
    }
  }

  return alerts;
}

// Analyze approval queue patterns
export function analyzeApprovalPatterns(
  recentActions: Array<{
    itemType: string;
    action: string; // approved, edited_approved, discarded
    editSeverity?: string;
  }>
): IntelligenceAlert[] {
  const alerts: IntelligenceAlert[] = [];

  if (recentActions.length < 10) return alerts;

  const discardRate = recentActions.filter(a => a.action === 'discarded').length / recentActions.length;
  const heavyEditRate = recentActions.filter(a =>
    a.editSeverity === 'heavy' || a.editSeverity === 'full_rewrite'
  ).length / recentActions.length;

  if (discardRate > 0.3) {
    alerts.push({
      category: 'voice_quality',
      message: `High discard rate (${(discardRate * 100).toFixed(0)}%) — voice engine may need tone adjustment`,
      severity: 'warning',
      actionPath: '/approval-queue',
    });
  }

  if (heavyEditRate > 0.4) {
    alerts.push({
      category: 'voice_quality',
      message: `${(heavyEditRate * 100).toFixed(0)}% of approved content needed heavy edits — reviewing voice patterns`,
      severity: 'info',
      actionPath: '/approval-queue',
    });
  }

  return alerts;
}

// Check transaction timeline urgency
export function checkTransactionTimelines(
  transactions: Array<{
    id: string;
    propertyAddress: string;
    closingDate: string | null;
    status: string;
    checklist: Array<{ label: string; isCompleted: boolean; dueDate: string | null }>;
  }>
): IntelligenceAlert[] {
  const alerts: IntelligenceAlert[] = [];
  const now = new Date();

  for (const tx of transactions) {
    if (['closed', 'lost'].includes(tx.status)) continue;

    if (tx.closingDate) {
      const daysUntilClose = Math.floor(
        (new Date(tx.closingDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysUntilClose < 0) {
        alerts.push({
          category: 'transaction_timeline',
          message: `${tx.propertyAddress} — closing date was ${Math.abs(daysUntilClose)} days ago`,
          severity: 'urgent',
          actionPath: `/transactions?id=${tx.id}`,
        });
      } else if (daysUntilClose <= 7) {
        const incomplete = tx.checklist.filter(c => !c.isCompleted).length;
        if (incomplete > 0) {
          alerts.push({
            category: 'transaction_timeline',
            message: `${tx.propertyAddress} — ${daysUntilClose} days to close, ${incomplete} items incomplete`,
            severity: 'urgent',
            actionPath: `/transactions?id=${tx.id}`,
          });
        }
      } else if (daysUntilClose <= 14) {
        alerts.push({
          category: 'transaction_timeline',
          message: `${tx.propertyAddress} — ${daysUntilClose} days to close`,
          severity: 'warning',
          actionPath: `/transactions?id=${tx.id}`,
        });
      }
    }

    // Check overdue checklist items
    for (const item of tx.checklist) {
      if (!item.isCompleted && item.dueDate) {
        const daysOverdue = Math.floor(
          (now.getTime() - new Date(item.dueDate).getTime()) / (1000 * 60 * 60 * 24)
        );
        if (daysOverdue > 0) {
          alerts.push({
            category: 'checklist_overdue',
            message: `"${item.label}" overdue by ${daysOverdue} days — ${tx.propertyAddress}`,
            severity: daysOverdue > 3 ? 'urgent' : 'warning',
            actionPath: `/transactions?id=${tx.id}`,
          });
        }
      }
    }
  }

  return alerts;
}

// Generate smart suggestions based on platform data
export function generateSmartSuggestions(context: {
  totalContacts: number;
  pendingApprovals: number;
  activeTransactions: number;
  recentLeads: number;
  campaignEnrollments: number;
}): IntelligenceAlert[] {
  const suggestions: IntelligenceAlert[] = [];

  if (context.pendingApprovals > 5) {
    suggestions.push({
      category: 'productivity',
      message: `${context.pendingApprovals} items awaiting approval — clear your queue to keep campaigns on schedule`,
      severity: context.pendingApprovals > 10 ? 'urgent' : 'warning',
      actionPath: '/approval-queue',
    });
  }

  if (context.recentLeads > 0 && context.campaignEnrollments === 0) {
    suggestions.push({
      category: 'opportunity',
      message: `${context.recentLeads} new leads not enrolled in any campaign`,
      severity: 'info',
      actionPath: '/campaigns',
    });
  }

  if (context.totalContacts > 0 && context.totalContacts < 50) {
    suggestions.push({
      category: 'growth',
      message: 'Import your existing contacts via CSV to build your pipeline faster',
      severity: 'info',
      actionPath: '/contacts',
    });
  }

  return suggestions;
}
