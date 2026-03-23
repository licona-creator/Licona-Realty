/**
 * Canva Connect API Client
 *
 * Manages Canva design creation from templates, auto-fill with
 * contact/transaction data, and export to social media pipeline.
 */

import { BRAND } from '@/lib/brand';

const CANVA_API_BASE = 'https://api.canva.com/rest/v1';

interface CanvaTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

// Template types for auto-generation
export const CANVA_TEMPLATE_TYPES = {
  just_listed: 'Just Listed',
  just_sold: 'Just Sold',
  open_house: 'Open House',
  price_reduction: 'Price Reduction',
  market_update: 'Market Update',
  client_testimonial: 'Client Testimonial',
  holiday_greeting: 'Holiday Greeting',
  home_anniversary: 'Home Anniversary',
  birthday: 'Birthday',
  investor_report: 'Investor Report',
  neighborhood_spotlight: 'Neighborhood Spotlight',
} as const;

export type CanvaTemplateType = keyof typeof CANVA_TEMPLATE_TYPES;

// Data fields that can auto-fill into Canva templates
export interface CanvaAutofillData {
  clientName?: string;
  propertyAddress?: string;
  price?: string;
  beds?: string;
  baths?: string;
  sqft?: string;
  neighborhood?: string;
  agentName: string;
  agentPhone: string;
  agentEmail: string;
  brokerage: string;
  license: string;
  customText?: string;
  date?: string;
}

// Default autofill with agent branding
export function getDefaultAutofillData(): CanvaAutofillData {
  return {
    agentName: BRAND.agent.name,
    agentPhone: BRAND.agent.phone,
    agentEmail: BRAND.agent.email,
    brokerage: BRAND.agent.brokerage,
    license: BRAND.agent.license,
  };
}

// Canva API helpers
export async function canvaFetch(
  endpoint: string,
  tokens: CanvaTokens,
  options: RequestInit = {}
): Promise<Response> {
  return fetch(`${CANVA_API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${tokens.accessToken}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
}

// List user's Canva designs
export async function listDesigns(tokens: CanvaTokens, query?: string) {
  const params = new URLSearchParams();
  if (query) params.set('query', query);
  const response = await canvaFetch(`/designs?${params}`, tokens);
  return response.json();
}

// Get design details
export async function getDesign(tokens: CanvaTokens, designId: string) {
  const response = await canvaFetch(`/designs/${designId}`, tokens);
  return response.json();
}

// Create design from template with autofill
export async function createFromTemplate(
  tokens: CanvaTokens,
  templateId: string,
  autofillData: CanvaAutofillData,
  title: string
) {
  const response = await canvaFetch('/autofills', tokens, {
    method: 'POST',
    body: JSON.stringify({
      brand_template_id: templateId,
      title,
      data: autofillData,
    }),
  });
  return response.json();
}

// Export design as image
export async function exportDesign(
  tokens: CanvaTokens,
  designId: string,
  format: 'png' | 'jpg' | 'pdf' = 'png'
) {
  const response = await canvaFetch('/exports', tokens, {
    method: 'POST',
    body: JSON.stringify({
      design_id: designId,
      format: { type: format },
    }),
  });
  return response.json();
}

// Get export result
export async function getExportResult(tokens: CanvaTokens, exportId: string) {
  const response = await canvaFetch(`/exports/${exportId}`, tokens);
  return response.json();
}

// OAuth URL for Canva Connect
export function getCanvaOAuthUrl(redirectUri: string): string {
  const clientId = process.env.CANVA_CLIENT_ID;
  if (!clientId) throw new Error('CANVA_CLIENT_ID not configured');

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'design:content:read design:content:write design:meta:read asset:read asset:write brandtemplate:content:read brandtemplate:meta:read',
  });

  return `https://www.canva.com/api/oauth/authorize?${params}`;
}

// Exchange auth code for tokens
export async function exchangeCanvaCode(
  code: string,
  redirectUri: string
): Promise<CanvaTokens> {
  const response = await fetch('https://api.canva.com/rest/v1/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: process.env.CANVA_CLIENT_ID!,
      client_secret: process.env.CANVA_CLIENT_SECRET!,
      code,
      redirect_uri: redirectUri,
    }),
  });

  const data = await response.json();
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
}
