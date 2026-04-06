/**
 * Mortgage and Affordability Calculator
 *
 * PUBLIC PAGE - accessible without authentication.
 * Collects sensitive financial PII (income, debts).
 * All data encrypted in transit (HTTPS) and at rest.
 * Lead capture: name, email, phone required for full results.
 * Client-side calculation with server-side lead capture.
 */

'use client';

import { useState, type FormEvent } from 'react';
import { LRMonogram } from '@/components/ui/LRMonogram';
import { Button } from '@/components/ui/Button';
import { BRAND } from '@/lib/brand';
import { Calculator, DollarSign, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';

interface MortgageResult {
  affordability_estimate: number;
  monthly_payment_estimate: number;
  recommended_down_payment: number;
  readiness_label: string;
  readiness_color: string;
}

function calculateClientSide(
  annualIncome: number,
  monthlyDebts: number,
  downPayment: number,
  creditScore: string,
): MortgageResult {
  const monthlyIncome = annualIncome / 12;
  const maxMonthlyPayment = (monthlyIncome - monthlyDebts) * 0.43;

  // Interest rate estimate based on credit score
  const rates: Record<string, number> = {
    excellent: 0.065,
    good: 0.07,
    fair: 0.075,
    poor: 0.085,
  };
  const annualRate = rates[creditScore] || 0.07;
  const monthlyRate = annualRate / 12;
  const termMonths = 360;

  // Max loan using payment formula
  const factor = Math.pow(1 + monthlyRate, termMonths);
  const maxLoanAmount = maxMonthlyPayment > 0
    ? maxMonthlyPayment * (factor - 1) / (monthlyRate * factor)
    : 0;

  const affordabilityEstimate = Math.round(maxLoanAmount + (downPayment || 0));

  // Recommended down payment
  let recommendedDown: number;
  if (annualIncome < 60000) {
    recommendedDown = Math.round(affordabilityEstimate * 0.05);
  } else {
    recommendedDown = Math.round(affordabilityEstimate * 0.20);
  }

  // Readiness
  const debtRatio = monthlyIncome > 0 ? monthlyDebts / monthlyIncome : 1;
  let readinessLabel: string;
  let readinessColor: string;
  if (annualIncome >= 60000 && debtRatio < 0.20) {
    readinessLabel = 'Strong';
    readinessColor = '#22C55E';
  } else if (annualIncome >= 40000) {
    readinessLabel = 'Moderate';
    readinessColor = BRAND.colors.accent;
  } else {
    readinessLabel = 'Needs Preparation';
    readinessColor = '#F59E0B';
  }

  return {
    affordability_estimate: affordabilityEstimate,
    monthly_payment_estimate: Math.round(Math.max(0, maxMonthlyPayment)),
    recommended_down_payment: recommendedDown,
    readiness_label: readinessLabel,
    readiness_color: readinessColor,
  };
}

export default function MortgageCalculatorPage() {
  const [step, setStep] = useState<'calculate' | 'capture' | 'results'>('calculate');
  const [income, setIncome] = useState('');
  const [debts, setDebts] = useState('');
  const [downPayment, setDownPayment] = useState('');
  const [creditScore, setCreditScore] = useState<string>('good');
  const [location, setLocation] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [language, setLanguage] = useState<'en' | 'es'>('en');
  const [result, setResult] = useState<MortgageResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [quickLeadName, setQuickLeadName] = useState('');
  const [quickLeadPhone, setQuickLeadPhone] = useState('');
  const [quickLeadEmail, setQuickLeadEmail] = useState('');
  const [quickLeadSubmitted, setQuickLeadSubmitted] = useState(false);

  const isEnglish = language === 'en';

  function handleCalculate(e: FormEvent) {
    e.preventDefault();
    // Calculate client-side immediately
    const calc = calculateClientSide(
      parseFloat(income) || 0,
      parseFloat(debts) || 0,
      parseFloat(downPayment) || 0,
      creditScore,
    );
    setResult(calc);
    setStep('capture');
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Submit lead capture to server
      await fetch('/api/mortgage/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          annual_income: parseFloat(income),
          monthly_debts: parseFloat(debts) || 0,
          down_payment: parseFloat(downPayment) || 0,
          credit_score_range: creditScore,
          desired_location: location,
          visitor_name: name,
          visitor_email: email,
          visitor_phone: phone,
          language,
        }),
      });
    } catch {
      // Continue to results even on network failure
    } finally {
      setLoading(false);
      setStep('results');
    }
  }

  async function handleQuickLead(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await fetch('/api/mortgage/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          visitor_name: quickLeadName,
          visitor_phone: quickLeadPhone,
          visitor_email: quickLeadEmail || null,
          calculator_inputs: {
            annual_income: parseFloat(income),
            monthly_debts: parseFloat(debts) || 0,
            down_payment: parseFloat(downPayment) || 0,
            credit_score_range: creditScore,
            desired_location: location,
          },
        }),
      });
      setQuickLeadSubmitted(true);
    } catch {
      // Silent fail
    } finally {
      setLoading(false);
    }
  }

  const labelStyle = { color: '#ffffff' };
  const inputClasses = "w-full px-4 py-2.5 rounded-[8px] text-sm font-inter outline-none transition-all duration-200 placeholder:text-white/50";
  const inputStyle = {
    backgroundColor: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.3)',
    color: '#ffffff',
  };

  return (
    <div
      className="min-h-screen"
      style={{ background: BRAND.colors.heroGradient }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <LRMonogram size="md" />
          <span className="text-sm font-montserrat font-semibold text-gold tracking-wider">
            LICONA REALTY
          </span>
        </div>
        <button
          onClick={() => setLanguage(language === 'en' ? 'es' : 'en')}
          className="text-xs font-montserrat font-medium text-white/50 hover:text-gold transition-colors"
        >
          {isEnglish ? 'Espanol' : 'English'}
        </button>
      </div>

      <div className="max-w-lg mx-auto px-6 py-8">
        <div className="text-center mb-8">
          <Calculator size={40} className="text-gold mx-auto mb-4" />
          <h1
            className="text-3xl font-semibold text-white mb-2"
            style={{ fontFamily: BRAND.fonts.playfair }}
          >
            {isEnglish
              ? 'How Much House Can You Afford?'
              : 'Cuanta Casa Puedes Comprar?'}
          </h1>
          <p className="text-sm text-white/50 font-inter">
            {isEnglish
              ? 'Get your personalized DFW home affordability estimate'
              : 'Obten tu estimacion personalizada de vivienda en DFW'}
          </p>
        </div>

        {step === 'calculate' && (
          <form onSubmit={handleCalculate} className="space-y-4">
            <div className="relative">
              <label
                className="block text-sm font-montserrat font-medium mb-1.5"
                style={labelStyle}
              >
                {isEnglish ? 'Annual Household Income' : 'Ingreso Anual del Hogar'}
              </label>
              <div className="relative">
                <DollarSign size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                <input
                  type="number"
                  value={income}
                  onChange={(e) => setIncome(e.target.value)}
                  placeholder="85000"
                  required
                  min={0}
                  className={`${inputClasses} !pl-10`}
                  style={inputStyle}
                />
              </div>
            </div>
            <div>
              <label
                className="block text-sm font-montserrat font-medium mb-1.5"
                style={labelStyle}
              >
                {isEnglish ? 'Monthly Debts' : 'Deudas Mensuales'}
              </label>
              <input
                type="number"
                value={debts}
                onChange={(e) => setDebts(e.target.value)}
                placeholder="500"
                required
                min={0}
                className={inputClasses}
                style={inputStyle}
              />
            </div>
            <div>
              <label
                className="block text-sm font-montserrat font-medium mb-1.5"
                style={labelStyle}
              >
                {isEnglish ? 'Available Down Payment' : 'Pago Inicial Disponible'}
              </label>
              <input
                type="number"
                value={downPayment}
                onChange={(e) => setDownPayment(e.target.value)}
                placeholder="20000"
                required
                min={0}
                className={inputClasses}
                style={inputStyle}
              />
            </div>
            <div>
              <label
                className="block text-sm font-montserrat font-medium mb-1.5"
                style={labelStyle}
              >
                {isEnglish ? 'Credit Score Range' : 'Rango de Puntaje de Credito'}
              </label>
              <select
                value={creditScore}
                onChange={(e) => setCreditScore(e.target.value)}
                className="w-full px-3 py-2.5 rounded-[8px] border text-sm font-inter outline-none focus:border-gold"
                style={{
                  backgroundColor: 'rgba(255,255,255,0.08)',
                  borderColor: 'rgba(255,255,255,0.3)',
                  color: '#ffffff',
                }}
              >
                <option value="excellent" className="bg-[#132236] text-white">{isEnglish ? 'Excellent (740+)' : 'Excelente (740+)'}</option>
                <option value="good" className="bg-[#132236] text-white">{isEnglish ? 'Good (670-739)' : 'Bueno (670-739)'}</option>
                <option value="fair" className="bg-[#132236] text-white">{isEnglish ? 'Fair (580-669)' : 'Regular (580-669)'}</option>
                <option value="poor" className="bg-[#132236] text-white">{isEnglish ? 'Below 580' : 'Debajo de 580'}</option>
              </select>
            </div>
            <div>
              <label
                className="block text-sm font-montserrat font-medium mb-1.5"
                style={labelStyle}
              >
                {isEnglish ? 'Desired DFW Location' : 'Ubicacion Deseada en DFW'}
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Frisco, McKinney, Plano..."
                className={inputClasses}
                style={inputStyle}
              />
            </div>
            <Button type="submit" variant="accent" size="lg" className="w-full">
              {isEnglish ? 'Calculate My Affordability' : 'Calcular Mi Capacidad'}
            </Button>
          </form>
        )}

        {step === 'capture' && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-white/80 text-sm font-inter mb-2 text-center">
              {isEnglish
                ? 'Enter your contact info to see your full results'
                : 'Ingresa tu informacion para ver tus resultados completos'}
            </p>
            <div>
              <label
                className="block text-sm font-montserrat font-medium mb-1.5"
                style={labelStyle}
              >
                {isEnglish ? 'Full Name' : 'Nombre Completo'}
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder={isEnglish ? 'Your full name' : 'Tu nombre completo'}
                className={inputClasses}
                style={inputStyle}
              />
            </div>
            <div>
              <label
                className="block text-sm font-montserrat font-medium mb-1.5"
                style={labelStyle}
              >
                {isEnglish ? 'Email' : 'Correo Electronico'}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="your@email.com"
                className={inputClasses}
                style={inputStyle}
              />
            </div>
            <div>
              <label
                className="block text-sm font-montserrat font-medium mb-1.5"
                style={labelStyle}
              >
                {isEnglish ? 'Phone' : 'Telefono'}
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(555) 123-4567"
                className={inputClasses}
                style={inputStyle}
              />
            </div>
            {error && (
              <p className="text-red-400 text-xs font-inter text-center">{error}</p>
            )}
            <Button
              type="submit"
              variant="accent"
              size="lg"
              className="w-full"
              disabled={loading}
            >
              {loading ? (
                <Loader2 size={16} className="animate-spin mr-2" />
              ) : null}
              {isEnglish ? 'See My Results' : 'Ver Mis Resultados'}
            </Button>
          </form>
        )}

        {step === 'results' && result && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center"
          >
            <p className="text-white/50 text-sm font-inter mb-2">
              {isEnglish ? 'Estimated Home Budget' : 'Presupuesto Estimado de Vivienda'}
            </p>
            <p
              className="text-5xl font-bold mb-2"
              style={{ fontFamily: BRAND.fonts.dmSerif, color: BRAND.colors.accent }}
            >
              ${result.affordability_estimate.toLocaleString()}
            </p>
            <p className="text-white/40 text-xs font-inter mb-8">
              {isEnglish ? 'Estimated based on your inputs' : 'Estimacion basada en tu informacion'}
            </p>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white/5 rounded-[12px] p-4"
              >
                <p className="text-xs text-white/40 font-montserrat mb-1">
                  {isEnglish ? 'Est. Monthly Payment' : 'Pago Mensual Est.'}
                </p>
                <p className="text-xl font-bold text-white" style={{ fontFamily: BRAND.fonts.dmSerif }}>
                  ${result.monthly_payment_estimate.toLocaleString()}
                </p>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-white/5 rounded-[12px] p-4"
              >
                <p className="text-xs text-white/40 font-montserrat mb-1">
                  {isEnglish ? 'Recommended Down Payment' : 'Pago Inicial Recomendado'}
                </p>
                <p className="text-xl font-bold text-white" style={{ fontFamily: BRAND.fonts.dmSerif }}>
                  ${result.recommended_down_payment.toLocaleString()}
                </p>
              </motion.div>
            </div>

            {/* Pre-approval readiness */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-white/5 rounded-[12px] p-4 mb-6"
            >
              <p className="text-xs text-white/40 font-inter mb-2">
                {isEnglish ? 'Pre-Approval Readiness' : 'Preparacion para Pre-Aprobacion'}
              </p>
              <div className="flex items-center justify-center gap-3">
                <span
                  className="inline-block w-3 h-3 rounded-full"
                  style={{ backgroundColor: result.readiness_color }}
                />
                <span
                  className="text-lg font-montserrat font-bold"
                  style={{ color: result.readiness_color }}
                >
                  {result.readiness_label}
                </span>
              </div>
            </motion.div>

            {/* Quick Lead Capture */}
            {!quickLeadSubmitted ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="bg-white/5 rounded-[12px] p-5 mb-6"
              >
                <p className="text-sm font-montserrat font-semibold text-white mb-1">
                  {isEnglish ? 'Want to discuss your options with a local expert?' : 'Quieres hablar con un experto local?'}
                </p>
                <p className="text-xs text-white/50 font-inter mb-4">
                  {isEnglish ? 'Leave your info and Anthony will reach out.' : 'Deja tu informacion y Anthony te contactara.'}
                </p>
                <form onSubmit={handleQuickLead} className="space-y-3">
                  <input
                    type="text"
                    value={quickLeadName}
                    onChange={e => setQuickLeadName(e.target.value)}
                    placeholder={isEnglish ? 'Your Name' : 'Tu Nombre'}
                    required
                    className={inputClasses}
                    style={inputStyle}
                  />
                  <input
                    type="tel"
                    value={quickLeadPhone}
                    onChange={e => setQuickLeadPhone(e.target.value)}
                    placeholder={isEnglish ? 'Phone Number' : 'Numero de Telefono'}
                    required
                    className={inputClasses}
                    style={inputStyle}
                  />
                  <input
                    type="email"
                    value={quickLeadEmail}
                    onChange={e => setQuickLeadEmail(e.target.value)}
                    placeholder={isEnglish ? 'Email (optional)' : 'Correo (opcional)'}
                    className={inputClasses}
                    style={inputStyle}
                  />
                  <Button type="submit" variant="accent" size="lg" className="w-full" disabled={loading}>
                    {isEnglish ? 'Get in Touch' : 'Contactame'}
                  </Button>
                </form>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white/5 rounded-[12px] p-5 mb-6 text-center"
              >
                <p className="text-sm font-montserrat font-semibold text-gold">
                  {isEnglish ? 'Thanks! Anthony will be in touch soon.' : 'Gracias! Anthony te contactara pronto.'}
                </p>
              </motion.div>
            )}

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              <Link
                href="/booking"
                className="inline-flex items-center justify-center gap-2 w-full py-3 rounded-[8px] font-montserrat font-semibold text-base transition-all duration-200"
                style={{
                  backgroundColor: BRAND.colors.accent,
                  color: BRAND.colors.navy,
                }}
              >
                {isEnglish ? 'Schedule a Free Consultation' : 'Agenda una Consulta Gratis'}
              </Link>
            </motion.div>

            <p className="text-sm text-white/80 font-inter mt-6">
              {isEnglish
                ? "Anthony will reach out with personalized next steps for your DFW home search."
                : 'Anthony se comunicara contigo con los proximos pasos personalizados.'}
            </p>
          </motion.div>
        )}

        {/* Footer */}
        <footer className="mt-12 py-8 text-center" style={{ backgroundColor: BRAND.colors.primary }}>
          <p className="text-xs text-white font-inter">
            {BRAND.agent.name} &middot; Realtor® &middot; {BRAND.agent.phone} &middot; {BRAND.agent.email}
          </p>
          <p className="text-xs font-inter mt-1" style={{ color: 'rgba(244,244,244,0.8)' }}>
            {BRAND.agent.brokerage} &middot; {BRAND.agent.license}
          </p>
          <p
            className="text-xs mt-2 italic"
            style={{ fontFamily: BRAND.fonts.playfair, color: BRAND.colors.accent }}
          >
            {BRAND.tagline}
          </p>
        </footer>
      </div>

      {/* SEO JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebApplication',
            name: 'Licona Realty Mortgage Calculator',
            description: 'Free DFW mortgage affordability calculator. Bilingual English/Spanish.',
            url: 'https://liconarealty.com/mortgage',
            applicationCategory: 'FinanceApplication',
            offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
          }),
        }}
      />
    </div>
  );
}
