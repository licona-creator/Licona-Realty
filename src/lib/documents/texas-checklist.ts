/**
 * Texas Real Estate Document Checklist
 * Based on TREC requirements for residential transactions.
 */

export interface DocumentRequirement {
  type: string;
  label: string;
  required: boolean;
  category: 'contract' | 'financial' | 'disclosure' | 'inspection' | 'title' | 'closing' | 'compliance';
  description: string;
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
  created_at: string;
  updated_at: string;
}

export interface DocumentProgress {
  total: number;
  uploaded: number;
  signed: number;
  pending: number;
  missing: number;
  percentComplete: number;
}

export const TEXAS_BUYER_DOCUMENTS: DocumentRequirement[] = [
  { type: 'preapproval_letter', label: 'Pre-Approval Letter', required: true, category: 'financial', description: 'Mortgage pre-approval from lender' },
  { type: 'trec_contract', label: 'TREC 1-4 Contract', required: true, category: 'contract', description: 'Texas Real Estate Commission residential contract' },
  { type: 'third_party_financing', label: 'Third Party Financing Addendum', required: true, category: 'contract', description: 'Required for financed purchases' },
  { type: 'earnest_money_receipt', label: 'Earnest Money Receipt', required: true, category: 'financial', description: 'Proof of earnest money deposit' },
  { type: 'option_fee_receipt', label: 'Option Fee Receipt', required: true, category: 'financial', description: 'Proof of option fee payment' },
  { type: 'sellers_disclosure', label: 'Sellers Disclosure Notice', required: true, category: 'disclosure', description: 'Seller provided property disclosure' },
  { type: 'hoa_addendum', label: 'HOA Addendum', required: false, category: 'contract', description: 'Required if property is in an HOA' },
  { type: 'hoa_docs', label: 'HOA Documents / Resale Certificate', required: false, category: 'disclosure', description: 'HOA rules, fees, and financial statements' },
  { type: 'inspection_report', label: 'Property Inspection Report', required: true, category: 'inspection', description: 'Professional home inspection results' },
  { type: 'repair_amendment', label: 'Repair Amendment', required: false, category: 'inspection', description: 'Negotiated repairs after inspection' },
  { type: 'appraisal', label: 'Appraisal Report', required: true, category: 'financial', description: 'Bank-ordered property appraisal' },
  { type: 'title_commitment', label: 'Title Commitment', required: true, category: 'title', description: 'Title company commitment to insure' },
  { type: 'survey', label: 'Property Survey', required: true, category: 'title', description: 'Land survey showing boundaries and structures' },
  { type: 'insurance_binder', label: 'Homeowner Insurance Binder', required: true, category: 'financial', description: 'Proof of homeowner insurance policy' },
  { type: 'closing_disclosure', label: 'Closing Disclosure (CD)', required: true, category: 'closing', description: 'Final loan terms and closing costs breakdown' },
  { type: 'wire_instructions', label: 'Wire Transfer Instructions', required: true, category: 'closing', description: 'Title company wire details for closing funds' },
  { type: 'final_walkthrough', label: 'Final Walkthrough Confirmation', required: true, category: 'closing', description: 'Signed confirmation of pre-closing walkthrough' },
  { type: 'id_verification', label: 'Government ID Copy', required: true, category: 'compliance', description: 'Valid photo ID for identity verification' },
];

export const TEXAS_SELLER_DOCUMENTS: DocumentRequirement[] = [
  { type: 'listing_agreement', label: 'Listing Agreement', required: true, category: 'contract', description: 'Signed listing contract with brokerage' },
  { type: 'sellers_disclosure', label: 'Sellers Disclosure Notice', required: true, category: 'disclosure', description: 'Required property condition disclosure' },
  { type: 'lead_paint', label: 'Lead-Based Paint Disclosure', required: false, category: 'disclosure', description: 'Required for homes built before 1978' },
  { type: 'trec_contract', label: 'TREC 1-4 Contract (Executed)', required: true, category: 'contract', description: 'Fully executed purchase contract' },
  { type: 'title_commitment', label: 'Title Commitment', required: true, category: 'title', description: 'Title company commitment to insure' },
  { type: 'survey', label: 'Existing Survey', required: false, category: 'title', description: 'Existing property survey if available' },
  { type: 'repair_amendment', label: 'Repair Amendment', required: false, category: 'inspection', description: 'Agreed repairs from buyer inspection' },
  { type: 'hoa_docs', label: 'HOA Documents', required: false, category: 'disclosure', description: 'HOA information packet' },
  { type: 'closing_disclosure', label: 'Closing Disclosure', required: true, category: 'closing', description: 'Final settlement statement' },
  { type: 'deed', label: 'Warranty Deed', required: true, category: 'closing', description: 'Deed transferring property ownership' },
  { type: 'id_verification', label: 'Government ID Copy', required: true, category: 'compliance', description: 'Valid photo ID for identity verification' },
];

export const DOCUMENT_CATEGORIES: Record<string, { label: string; icon: string }> = {
  contract: { label: 'Contract', icon: 'FileText' },
  financial: { label: 'Financial', icon: 'DollarSign' },
  disclosure: { label: 'Disclosure', icon: 'AlertCircle' },
  inspection: { label: 'Inspection', icon: 'Search' },
  title: { label: 'Title', icon: 'Shield' },
  closing: { label: 'Closing', icon: 'CheckSquare' },
  compliance: { label: 'Compliance', icon: 'UserCheck' },
};

export function getDocumentChecklist(trackType: string): DocumentRequirement[] {
  if (trackType === 'seller' || trackType === 'landlord') {
    return TEXAS_SELLER_DOCUMENTS;
  }
  return TEXAS_BUYER_DOCUMENTS;
}

export function calculateDocumentProgress(
  documents: TransactionDocument[],
  checklist: DocumentRequirement[]
): DocumentProgress {
  const total = checklist.length;
  let uploaded = 0;
  let signed = 0;
  let pending = 0;
  let missing = 0;

  for (const item of checklist) {
    const doc = documents.find(d => d.document_type === item.type);
    if (!doc) {
      missing++;
    } else if (doc.status === 'pending') {
      pending++;
    } else if (doc.status === 'signed' || doc.status === 'complete') {
      uploaded++;
      signed++;
    } else {
      // received or reviewed
      uploaded++;
    }
  }

  return {
    total,
    uploaded,
    signed,
    pending,
    missing,
    percentComplete: total > 0 ? Math.round((uploaded / total) * 100) : 0,
  };
}
