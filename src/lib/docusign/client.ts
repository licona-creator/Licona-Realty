/**
 * DocuSign API Client
 *
 * Envelope creation, template management, and status tracking.
 * All envelope sends require approval queue authorization.
 * Webhook events handled at /api/webhooks/docusign.
 */

const DOCUSIGN_BASE = process.env.DOCUSIGN_BASE_URL || 'https://demo.docusign.net/restapi/v2.1';

interface DocuSignTokens {
  accessToken: string;
  accountId: string;
}

// Common document types for real estate
export const DOCUSIGN_TEMPLATES = {
  residential_listing: 'Residential Listing Agreement',
  buyer_representation: 'Buyer Representation Agreement',
  purchase_contract: 'One to Four Family Residential Contract',
  amendment: 'Amendment to Contract',
  addendum: 'Addendum',
  disclosure: 'Seller\'s Disclosure Notice',
  option_agreement: 'Option Period Extension',
  commission_agreement: 'Commission Agreement',
} as const;

export type DocuSignTemplateType = keyof typeof DOCUSIGN_TEMPLATES;

interface EnvelopeRecipient {
  name: string;
  email: string;
  role: string;
  routingOrder?: number;
}

// DocuSign API helpers
async function docusignFetch(
  endpoint: string,
  tokens: DocuSignTokens,
  options: RequestInit = {}
): Promise<Response> {
  return fetch(`${DOCUSIGN_BASE}/accounts/${tokens.accountId}${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${tokens.accessToken}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
}

// List available templates
export async function listTemplates(tokens: DocuSignTokens) {
  const res = await docusignFetch('/templates', tokens);
  return res.json();
}

// Create envelope from template
export async function createEnvelope(
  tokens: DocuSignTokens,
  templateId: string,
  recipients: EnvelopeRecipient[],
  subject: string,
  customFields?: Record<string, string>
) {
  const templateRoles = recipients.map((r, i) => ({
    name: r.name,
    email: r.email,
    roleName: r.role,
    routingOrder: r.routingOrder || (i + 1).toString(),
    tabs: customFields ? {
      textTabs: Object.entries(customFields).map(([tabLabel, value]) => ({
        tabLabel,
        value,
      })),
    } : undefined,
  }));

  const res = await docusignFetch('/envelopes', tokens, {
    method: 'POST',
    body: JSON.stringify({
      templateId,
      templateRoles,
      emailSubject: subject,
      status: 'created', // Draft — needs approval before sending
    }),
  });

  return res.json();
}

// Send envelope (after approval)
export async function sendEnvelope(tokens: DocuSignTokens, envelopeId: string) {
  const res = await docusignFetch(`/envelopes/${envelopeId}`, tokens, {
    method: 'PUT',
    body: JSON.stringify({ status: 'sent' }),
  });
  return res.json();
}

// Get envelope status
export async function getEnvelopeStatus(tokens: DocuSignTokens, envelopeId: string) {
  const res = await docusignFetch(`/envelopes/${envelopeId}`, tokens);
  return res.json();
}

// List recent envelopes
export async function listEnvelopes(
  tokens: DocuSignTokens,
  fromDate?: string,
  status?: string
) {
  const params = new URLSearchParams();
  if (fromDate) params.set('from_date', fromDate);
  if (status) params.set('status', status);

  const res = await docusignFetch(`/envelopes?${params}`, tokens);
  return res.json();
}

// Download signed document
export async function downloadDocument(
  tokens: DocuSignTokens,
  envelopeId: string,
  documentId: string = 'combined'
) {
  const res = await docusignFetch(
    `/envelopes/${envelopeId}/documents/${documentId}`,
    tokens,
    { headers: { Accept: 'application/pdf' } }
  );
  return res;
}

// Get recipient status
export async function getRecipients(tokens: DocuSignTokens, envelopeId: string) {
  const res = await docusignFetch(`/envelopes/${envelopeId}/recipients`, tokens);
  return res.json();
}
