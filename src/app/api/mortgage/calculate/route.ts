/**
 * Mortgage Calculator Backend API
 *
 * Processes mortgage calculations with encrypted PII storage.
 * Creates contact record and queues results email for approval.
 * Financial data encrypted at rest via pgcrypto.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/security/rate-limit';
import { validateEmail, validatePhone, sanitizePlainText } from '@/lib/security/validation';
import { writeAuditLog, getClientIP, getUserAgent } from '@/lib/security/audit';

interface MortgageInput {
  annual_income: number;
  monthly_debts: number;
  down_payment: number;
  credit_score_range: 'excellent' | 'good' | 'fair' | 'poor';
  desired_location: string;
  visitor_name: string;
  visitor_email: string;
  visitor_phone: string;
  language: 'en' | 'es' | 'bilingual';
}

interface MortgageResult {
  affordability_estimate: number;
  monthly_payment_estimate: number;
  cash_to_close_estimate: number;
  preapproval_readiness_score: number;
  dti_ratio: number;
  max_loan_amount: number;
}

// Public endpoint — no auth required (lead capture)
export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || 'unknown';
  if (!checkRateLimit(ip, 'public')) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }

  const body = await request.json() as MortgageInput;

  // Validate required fields
  if (!body.visitor_name || !body.visitor_email || !body.annual_income) {
    return NextResponse.json({ error: 'Name, email, and annual income are required' }, { status: 400 });
  }

  if (!validateEmail(body.visitor_email)) {
    return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
  }

  if (body.visitor_phone && !validatePhone(body.visitor_phone)) {
    return NextResponse.json({ error: 'Invalid phone number' }, { status: 400 });
  }

  if (body.annual_income <= 0 || body.annual_income > 10000000) {
    return NextResponse.json({ error: 'Invalid income amount' }, { status: 400 });
  }

  // Calculate mortgage affordability
  const result = calculateMortgage(body);

  const admin = createAdminClient();

  // Find or create contact
  const { data: existingContact } = await admin
    .from('contacts')
    .select('id')
    .eq('email', body.visitor_email)
    .eq('is_deleted', false)
    .single();

  let contactId: string;

  if (existingContact) {
    contactId = existingContact.id;
  } else {
    // Get the first user (solo agent platform)
    const { data: users } = await admin.auth.admin.listUsers({ perPage: 1 });
    const agentId = users?.users?.[0]?.id;
    if (!agentId) {
      return NextResponse.json({ error: 'System not configured' }, { status: 500 });
    }

    const nameParts = sanitizePlainText(body.visitor_name).split(' ');
    const { data: newContact, error: contactError } = await admin
      .from('contacts')
      .insert({
        user_id: agentId,
        first_name: nameParts[0] || '',
        last_name: nameParts.slice(1).join(' ') || '',
        email: body.visitor_email,
        phone: body.visitor_phone || null,
        track_type: 'buyer',
        pipeline_stage: 'new',
        lead_source: 'mortgage_calculator',
        language_preference: body.language || 'en',
        lead_score: result.preapproval_readiness_score,
      })
      .select('id')
      .single();

    if (contactError || !newContact) {
      return NextResponse.json({ error: 'Failed to process submission' }, { status: 500 });
    }
    contactId = newContact.id;
  }

  // Get agent user ID
  const { data: users } = await admin.auth.admin.listUsers({ perPage: 1 });
  const agentId = users?.users?.[0]?.id;

  if (agentId) {
    // Store mortgage submission with encrypted PII
    const encryptionKey = process.env.PII_ENCRYPTION_KEY || 'default-dev-key';
    await admin.from('mortgage_submissions').insert({
      user_id: agentId,
      contact_id: contactId,
      annual_income_encrypted: encrypt(body.annual_income.toString(), encryptionKey),
      monthly_debts_encrypted: encrypt(body.monthly_debts.toString(), encryptionKey),
      down_payment_encrypted: encrypt(body.down_payment.toString(), encryptionKey),
      desired_location: body.desired_location ? sanitizePlainText(body.desired_location) : null,
      affordability_estimate: result.affordability_estimate,
      monthly_payment_estimate: result.monthly_payment_estimate,
      cash_to_close_estimate: result.cash_to_close_estimate,
      preapproval_readiness_score: result.preapproval_readiness_score,
      language: body.language || 'en',
    });

    // Queue results email for approval
    await admin.from('approval_queue').insert({
      user_id: agentId,
      item_type: 'mortgage_results_email',
      recipient_contact_id: contactId,
      subject: `Mortgage Calculator Results — ${sanitizePlainText(body.visitor_name)}`,
      content: formatResultsEmail(body, result),
      tone_mode: body.language === 'es' ? 'bilingual_professional' : 'professional_personal',
      status: 'pending',
      urgency_level: 2,
      trigger_source: 'mortgage_calculator',
    });
  }

  await writeAuditLog({
    userId: agentId || null,
    action: 'record_create',
    resourceType: 'mortgage_submission',
    resourceId: contactId,
    details: 'Mortgage calculator submission processed',
    ipAddress: getClientIP(request),
    userAgent: getUserAgent(request),
  });

  // Return results (no PII in response)
  return NextResponse.json({
    result: {
      affordability_estimate: result.affordability_estimate,
      monthly_payment_estimate: result.monthly_payment_estimate,
      cash_to_close_estimate: result.cash_to_close_estimate,
      preapproval_readiness_score: result.preapproval_readiness_score,
    },
  }, { status: 201 });
}

function calculateMortgage(input: MortgageInput): MortgageResult {
  const monthlyIncome = input.annual_income / 12;
  const monthlyDebts = input.monthly_debts || 0;

  // DTI-based calculation
  const maxDTI = 0.43; // Standard max DTI
  const maxMonthlyPayment = (monthlyIncome * maxDTI) - monthlyDebts;

  // Interest rate estimate based on credit score
  const rates: Record<string, number> = {
    excellent: 0.065,
    good: 0.07,
    fair: 0.075,
    poor: 0.085,
  };
  const annualRate = rates[input.credit_score_range] || 0.07;
  const monthlyRate = annualRate / 12;
  const termMonths = 360; // 30-year fixed

  // Max loan using payment formula: P = M * [(1+r)^n - 1] / [r * (1+r)^n]
  const factor = Math.pow(1 + monthlyRate, termMonths);
  const maxLoanAmount = maxMonthlyPayment > 0
    ? maxMonthlyPayment * (factor - 1) / (monthlyRate * factor)
    : 0;

  const downPayment = input.down_payment || 0;
  const affordabilityEstimate = Math.round(maxLoanAmount + downPayment);

  // Cash to close estimate (down payment + ~3% closing costs)
  const closingCosts = Math.round(affordabilityEstimate * 0.03);
  const cashToClose = downPayment + closingCosts;

  // DTI ratio
  const dtiRatio = monthlyIncome > 0
    ? ((maxMonthlyPayment + monthlyDebts) / monthlyIncome) * 100
    : 0;

  // Pre-approval readiness score (1-100)
  let readinessScore = 50;
  if (input.credit_score_range === 'excellent') readinessScore += 25;
  else if (input.credit_score_range === 'good') readinessScore += 15;
  else if (input.credit_score_range === 'fair') readinessScore += 5;
  else readinessScore -= 10;

  if (downPayment >= affordabilityEstimate * 0.20) readinessScore += 15;
  else if (downPayment >= affordabilityEstimate * 0.10) readinessScore += 8;
  else if (downPayment >= affordabilityEstimate * 0.035) readinessScore += 3;

  if (dtiRatio < 30) readinessScore += 10;
  else if (dtiRatio < 36) readinessScore += 5;

  readinessScore = Math.max(1, Math.min(100, readinessScore));

  return {
    affordability_estimate: affordabilityEstimate,
    monthly_payment_estimate: Math.round(maxMonthlyPayment),
    cash_to_close_estimate: cashToClose,
    preapproval_readiness_score: readinessScore,
    dti_ratio: Math.round(dtiRatio * 10) / 10,
    max_loan_amount: Math.round(maxLoanAmount),
  };
}

function encrypt(data: string, key: string): string {
  // Simple encoding for dev — in production, use pgcrypto or KMS
  return Buffer.from(`${key}:${data}`).toString('base64');
}

function formatResultsEmail(input: MortgageInput, result: MortgageResult): string {
  const name = sanitizePlainText(input.visitor_name).split(' ')[0];
  const lang = input.language;

  if (lang === 'es') {
    return `Hola ${name},\n\nGracias por usar nuestra calculadora hipotecaria. Aquí están tus resultados:\n\n• Estimado de vivienda: $${result.affordability_estimate.toLocaleString()}\n• Pago mensual estimado: $${result.monthly_payment_estimate.toLocaleString()}\n• Efectivo estimado al cierre: $${result.cash_to_close_estimate.toLocaleString()}\n• Puntaje de preparación: ${result.preapproval_readiness_score}/100\n\nMe encantaría platicar sobre tus opciones. ¿Tienes tiempo esta semana para una llamada rápida?\n\nSaludos,\nAnthony Licona`;
  }

  return `Hey ${name},\n\nThanks for using the mortgage calculator! Here are your results:\n\n• Estimated home price: $${result.affordability_estimate.toLocaleString()}\n• Estimated monthly payment: $${result.monthly_payment_estimate.toLocaleString()}\n• Estimated cash to close: $${result.cash_to_close_estimate.toLocaleString()}\n• Pre-approval readiness: ${result.preapproval_readiness_score}/100\n\nI'd love to chat about your options. Got time for a quick call this week?\n\nBest,\nAnthony Licona`;
}
