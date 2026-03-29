/**
 * Central Metro Realty (CMR) Document Checklist
 * Two-tier system: CMR Required + Good to Save
 *
 * Run in Supabase SQL Editor:
 * ALTER TABLE transactions ADD COLUMN IF NOT EXISTS transaction_type text NOT NULL DEFAULT 'buyers_agent_sale';
 */

// Transaction types that determine which documents are needed
export type TransactionType =
  | 'buyers_agent_sale'
  | 'listing_agent_sale'
  | 'tenants_agent_house'
  | 'landlords_agent_house'
  | 'tenants_agent_apartment';

export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  buyers_agent_sale: "Buyer's Agent (Sale)",
  listing_agent_sale: "Listing Agent (Sale)",
  tenants_agent_house: "Tenant's Agent (House Lease)",
  landlords_agent_house: "Landlord's Agent (House Listing)",
  tenants_agent_apartment: "Tenant's Agent (Apartment Lease)",
};

// Two tiers of documents
export type DocumentTier = 'cmr_required' | 'good_to_save';

export interface DocumentRequirement {
  type: string;
  label: string;
  required: boolean;
  tier: DocumentTier;
  category: 'broker' | 'contract' | 'financial' | 'disclosure' | 'inspection' | 'title' | 'closing' | 'compliance';
  description: string;
  formNumber?: string;
  conditional?: string;
}

export interface TransactionDocument {
  id: string;
  transaction_id: string;
  user_id: string;
  document_type: string;
  document_name: string;
  file_url: string | null;
  file_path: string;
  file_size: number;
  mime_type: string;
  status: 'pending' | 'received' | 'reviewed' | 'signed' | 'complete';
  notes: string | null;
  signed_at: string | null;
  uploaded_at: string;
  metadata: Record<string, unknown>;
}

export interface DocumentProgress {
  total: number;
  uploaded: number;
  signed: number;
  pending: number;
  missing: number;
  percentComplete: number;
}

// ============================================
// TIER 1: CMR REQUIRED
// These documents MUST be emailed to da@centralmetro.com
// Without these, the agent does NOT get paid
// ============================================

// Required for ALL transaction types
const CMR_ALL_TRANSACTIONS: DocumentRequirement[] = [
  {
    type: 'iabs',
    label: 'Information About Brokerage Services',
    required: true,
    tier: 'cmr_required',
    category: 'broker',
    description: 'Required disclosure for all Texas real estate transactions',
  },
  {
    type: 'da_form',
    label: 'DA Form',
    required: true,
    tier: 'cmr_required',
    category: 'broker',
    description: 'Disbursement Authorization form for CMR to process payment',
  },
  {
    type: 'mls_printout',
    label: 'MLS Printout',
    required: false,
    tier: 'cmr_required',
    category: 'broker',
    description: 'MLS listing printout if transaction is on MLS',
    conditional: 'if applicable',
  },
  {
    type: 'w9_form',
    label: 'W9 Form',
    required: true,
    tier: 'cmr_required',
    category: 'broker',
    description: 'W9 for all parties receiving payment from Central Metro Realty',
  },
];

// Conditional: if one party is unrepresented
const CMR_UNREPRESENTED_PARTY: DocumentRequirement[] = [
  {
    type: 'intermediary_notice',
    label: 'Intermediary Relationship Notice',
    required: false,
    tier: 'cmr_required',
    category: 'broker',
    description: 'Required when one party in the transaction is unrepresented',
    formNumber: 'TXR-1409',
    conditional: 'if one party is unrepresented',
  },
  {
    type: 'cmr_non_intermediary',
    label: 'CMR Non-Intermediary Notice to Prospective Client',
    required: false,
    tier: 'cmr_required',
    category: 'broker',
    description: 'CMR-specific notice when one party is unrepresented',
    conditional: 'if one party is unrepresented',
  },
];

// Conditional: off-market or non-member board
const CMR_OFF_MARKET: DocumentRequirement[] = [
  {
    type: 'registration_brokers',
    label: 'Registration Between Brokers',
    required: false,
    tier: 'cmr_required',
    category: 'broker',
    description: 'Required for off-market transactions or when you are not a member of the listing board',
    conditional: 'if off-market or non-member board',
  },
  {
    type: 'registration_broker_owner',
    label: 'Registration Between Broker and Owner',
    required: false,
    tier: 'cmr_required',
    category: 'broker',
    description: 'Required for off-market transactions or when you are not a member of the listing board',
    conditional: 'if off-market or non-member board',
  },
];

// Buyer's Agent (Sale) specific
const CMR_BUYERS_AGENT: DocumentRequirement[] = [
  {
    type: 'buyers_rep_agreement',
    label: "Buyer's Rep Agreement",
    required: true,
    tier: 'cmr_required',
    category: 'contract',
    description: 'Signed buyer representation agreement',
    formNumber: 'TXR-1501',
  },
  {
    type: 'sellers_disclosure_buyer_signed',
    label: "Seller's Disclosure (Buyer Signed)",
    required: true,
    tier: 'cmr_required',
    category: 'disclosure',
    description: "Seller's disclosure notice signed by the buyer",
    formNumber: 'TXR-1406',
  },
  {
    type: 'contract_with_addenda',
    label: 'Contract Including All Addenda',
    required: true,
    tier: 'cmr_required',
    category: 'contract',
    description: 'Fully executed TREC contract with all addenda',
    formNumber: 'TXR-1601',
  },
  {
    type: 'preliminary_hud',
    label: 'Preliminary HUD Statement',
    required: false,
    tier: 'cmr_required',
    category: 'closing',
    description: 'Preliminary settlement statement from title company',
    conditional: 'if applicable',
  },
  {
    type: 'lead_based_paint',
    label: 'Lead-Based Paint Addendum',
    required: false,
    tier: 'cmr_required',
    category: 'disclosure',
    description: 'Required for homes built before 1978',
    conditional: 'if home built before 1978',
  },
];

// Listing Agent (Sale) specific
const CMR_LISTING_AGENT: DocumentRequirement[] = [
  {
    type: 'listing_agreement',
    label: 'Listing Agreement',
    required: true,
    tier: 'cmr_required',
    category: 'contract',
    description: 'Signed listing contract with brokerage',
    formNumber: 'TXR-1101',
  },
  {
    type: 'sellers_disclosure_buyer_signed',
    label: "Seller's Disclosure (Buyer Signed)",
    required: true,
    tier: 'cmr_required',
    category: 'disclosure',
    description: "Seller's disclosure notice signed by the buyer",
    formNumber: 'TXR-1406',
  },
  {
    type: 'contract_with_addenda',
    label: 'Contract Including All Addenda',
    required: true,
    tier: 'cmr_required',
    category: 'contract',
    description: 'Fully executed TREC contract with all addenda',
    formNumber: 'TXR-1601',
  },
  {
    type: 'preliminary_hud',
    label: 'Preliminary HUD Statement',
    required: false,
    tier: 'cmr_required',
    category: 'closing',
    description: 'Preliminary settlement statement from title company',
    conditional: 'if applicable',
  },
  {
    type: 'lead_based_paint',
    label: 'Lead-Based Paint Addendum',
    required: false,
    tier: 'cmr_required',
    category: 'disclosure',
    description: 'Required for homes built before 1978',
    conditional: 'if home built before 1978',
  },
];

// Tenant's Agent (House Lease)
const CMR_TENANTS_AGENT_HOUSE: DocumentRequirement[] = [
  {
    type: 'tenant_rep_agreement',
    label: 'Tenant Rep Agreement',
    required: true,
    tier: 'cmr_required',
    category: 'contract',
    description: 'Signed tenant representation agreement',
    formNumber: 'TXR-1501',
  },
  {
    type: 'lease_with_addenda',
    label: 'Lease Including All Addenda',
    required: true,
    tier: 'cmr_required',
    category: 'contract',
    description: 'Fully executed lease agreement with all addenda',
    formNumber: 'TXR-2001',
  },
  {
    type: 'lease_invoice',
    label: 'Lease Invoice',
    required: true,
    tier: 'cmr_required',
    category: 'broker',
    description: 'Invoice generated via CMR Invoice Generator',
  },
];

// Landlord's Agent (House Listing)
const CMR_LANDLORDS_AGENT: DocumentRequirement[] = [
  {
    type: 'lease_listing_agreement',
    label: 'Lease Listing Agreement',
    required: true,
    tier: 'cmr_required',
    category: 'contract',
    description: 'Signed lease listing agreement with brokerage',
    formNumber: 'TXR-1102',
  },
  {
    type: 'lease_with_addenda',
    label: 'Lease Including All Addenda',
    required: true,
    tier: 'cmr_required',
    category: 'contract',
    description: 'Fully executed lease agreement with all addenda',
    formNumber: 'TXR-2001',
  },
  {
    type: 'lease_invoice',
    label: 'Lease Invoice',
    required: true,
    tier: 'cmr_required',
    category: 'broker',
    description: 'Invoice generated via CMR Invoice Generator',
  },
];

// Tenant's Agent (Apartment Lease)
const CMR_TENANTS_AGENT_APT: DocumentRequirement[] = [
  {
    type: 'tenant_rep_agreement',
    label: 'Tenant Rep Agreement',
    required: true,
    tier: 'cmr_required',
    category: 'contract',
    description: 'Signed tenant representation agreement',
    formNumber: 'TXR-1501',
  },
  {
    type: 'lease_invoice',
    label: 'Lease Invoice',
    required: true,
    tier: 'cmr_required',
    category: 'broker',
    description: 'Invoice generated via CMR Invoice Generator',
  },
];

// ============================================
// TIER 2: GOOD TO SAVE
// Not required by CMR, but important
// for protecting the agent and managing the deal
// Only applies to sale transactions
// ============================================

const GOOD_TO_SAVE_SALE: DocumentRequirement[] = [
  {
    type: 'preapproval_letter',
    label: 'Pre-Approval Letter',
    required: false,
    tier: 'good_to_save',
    category: 'financial',
    description: 'Mortgage pre-approval from lender',
  },
  {
    type: 'earnest_money_receipt',
    label: 'Earnest Money Receipt',
    required: false,
    tier: 'good_to_save',
    category: 'financial',
    description: 'Proof of earnest money deposit to title company',
  },
  {
    type: 'option_fee_receipt',
    label: 'Option Fee Receipt',
    required: false,
    tier: 'good_to_save',
    category: 'financial',
    description: 'Proof of option fee payment',
  },
  {
    type: 'inspection_report',
    label: 'Property Inspection Report',
    required: false,
    tier: 'good_to_save',
    category: 'inspection',
    description: 'Professional home inspection results',
  },
  {
    type: 'repair_amendment',
    label: 'Repair Amendment',
    required: false,
    tier: 'good_to_save',
    category: 'inspection',
    description: 'Negotiated repairs after inspection',
  },
  {
    type: 'appraisal_report',
    label: 'Appraisal Report',
    required: false,
    tier: 'good_to_save',
    category: 'financial',
    description: 'Bank-ordered property appraisal',
  },
  {
    type: 'title_commitment',
    label: 'Title Commitment',
    required: false,
    tier: 'good_to_save',
    category: 'title',
    description: 'Title company commitment to insure',
  },
  {
    type: 'survey',
    label: 'Property Survey',
    required: false,
    tier: 'good_to_save',
    category: 'title',
    description: 'Land survey showing boundaries and structures',
  },
  {
    type: 'insurance_binder',
    label: 'Homeowner Insurance Binder',
    required: false,
    tier: 'good_to_save',
    category: 'financial',
    description: 'Proof of homeowner insurance policy',
  },
  {
    type: 'closing_disclosure',
    label: 'Closing Disclosure (CD)',
    required: false,
    tier: 'good_to_save',
    category: 'closing',
    description: 'Final loan terms and closing costs breakdown',
  },
  {
    type: 'wire_instructions',
    label: 'Wire Transfer Instructions',
    required: false,
    tier: 'good_to_save',
    category: 'closing',
    description: 'Title company wire details for closing funds',
  },
  {
    type: 'final_walkthrough',
    label: 'Final Walkthrough Confirmation',
    required: false,
    tier: 'good_to_save',
    category: 'closing',
    description: 'Signed confirmation of pre-closing walkthrough',
  },
  {
    type: 'government_id',
    label: 'Government ID Copy',
    required: false,
    tier: 'good_to_save',
    category: 'compliance',
    description: 'Valid photo ID for identity verification',
  },
];

// ============================================
// CATEGORY METADATA
// ============================================

export const DOCUMENT_CATEGORIES: Record<string, { label: string; icon: string }> = {
  broker: { label: 'Broker', icon: 'Briefcase' },
  contract: { label: 'Contract', icon: 'FileText' },
  financial: { label: 'Financial', icon: 'DollarSign' },
  disclosure: { label: 'Disclosure', icon: 'AlertCircle' },
  inspection: { label: 'Inspection', icon: 'Search' },
  title: { label: 'Title', icon: 'Shield' },
  closing: { label: 'Closing', icon: 'CheckSquare' },
  compliance: { label: 'Compliance', icon: 'UserCheck' },
};

// ============================================
// MAIN FUNCTION: Get checklist by transaction type
// ============================================

export function getDocumentChecklist(transactionType: string): DocumentRequirement[] {
  const baseDocuments = [...CMR_ALL_TRANSACTIONS, ...CMR_UNREPRESENTED_PARTY, ...CMR_OFF_MARKET];

  switch (transactionType) {
    case 'buyers_agent_sale':
      return [...baseDocuments, ...CMR_BUYERS_AGENT, ...GOOD_TO_SAVE_SALE];
    case 'listing_agent_sale':
      return [...baseDocuments, ...CMR_LISTING_AGENT, ...GOOD_TO_SAVE_SALE];
    case 'tenants_agent_house':
      return [...baseDocuments, ...CMR_TENANTS_AGENT_HOUSE];
    case 'landlords_agent_house':
      return [...baseDocuments, ...CMR_LANDLORDS_AGENT];
    case 'tenants_agent_apartment':
      return [...baseDocuments, ...CMR_TENANTS_AGENT_APT];
    default:
      // Legacy track_type mapping for backward compatibility
      if (transactionType === 'seller' || transactionType === 'landlord') {
        return [...baseDocuments, ...CMR_LISTING_AGENT, ...GOOD_TO_SAVE_SALE];
      }
      return [...baseDocuments, ...CMR_BUYERS_AGENT, ...GOOD_TO_SAVE_SALE];
  }
}

// Progress calculation separated by tier
export function calculateProgress(checklist: DocumentRequirement[], uploadedTypes: string[]) {
  const cmrRequired = checklist.filter(d => d.tier === 'cmr_required' && d.required);
  const cmrUploaded = cmrRequired.filter(d => uploadedTypes.includes(d.type));
  const goodToSave = checklist.filter(d => d.tier === 'good_to_save');
  const goodUploaded = goodToSave.filter(d => uploadedTypes.includes(d.type));

  return {
    cmr: { total: cmrRequired.length, uploaded: cmrUploaded.length, percent: cmrRequired.length > 0 ? Math.round((cmrUploaded.length / cmrRequired.length) * 100) : 100 },
    good: { total: goodToSave.length, uploaded: goodUploaded.length, percent: goodToSave.length > 0 ? Math.round((goodUploaded.length / goodToSave.length) * 100) : 100 },
    overall: {
      total: cmrRequired.length + goodToSave.length,
      uploaded: cmrUploaded.length + goodUploaded.length,
      percent: (cmrRequired.length + goodToSave.length) > 0
        ? Math.round(((cmrUploaded.length + goodUploaded.length) / (cmrRequired.length + goodToSave.length)) * 100)
        : 100,
    },
  };
}

// Legacy compatibility wrapper
export function calculateDocumentProgress(
  documents: TransactionDocument[],
  checklist: DocumentRequirement[]
): DocumentProgress {
  const uploadedTypes = documents.map(d => d.document_type);
  const progress = calculateProgress(checklist, uploadedTypes);

  return {
    total: checklist.length,
    uploaded: documents.filter(d => checklist.some(c => c.type === d.document_type)).length,
    signed: documents.filter(d => d.status === 'signed' || d.status === 'complete').length,
    pending: documents.filter(d => d.status === 'pending').length,
    missing: checklist.filter(c => c.required && !documents.some(d => d.document_type === c.type)).length,
    percentComplete: progress.cmr.percent,
  };
}
