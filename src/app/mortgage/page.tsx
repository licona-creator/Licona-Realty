/**
 * Mortgage and Affordability Calculator
 *
 * PUBLIC PAGE - accessible without authentication.
 * Collects sensitive financial PII (income, debts).
 * All data encrypted in transit (HTTPS) and at rest.
 * Lead capture: name, email, phone required for full results.
 * Connected to /api/mortgage/calculate backend.
 */

'use client';

import { useState, type FormEvent } from 'react';
import { LRMonogram } from '@/components/ui/LRMonogram';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { BRAND } from '@/lib/brand';
import { Calculator, DollarSign, Loader2 } from 'lucide-react';

interface MortgageResult {
  affordability_estimate: number;
  monthly_payment_estimate: number;
  cash_to_close_estimate: number;
  preapproval_readiness_score: number;
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

  const isEnglish = language === 'en';

  function handleCalculate(e: FormEvent) {
    e.preventDefault();
    setStep('capture');
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/mortgage/calculate', {
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

      if (res.ok) {
        const data = await res.json();
        setResult(data.result);
        setStep('results');
      } else {
        const data = await res.json();
        setError(data.error || (isEnglish ? 'Something went wrong' : 'Algo salió mal'));
      }
    } catch {
      setError(isEnglish ? 'Connection error. Please try again.' : 'Error de conexión. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  }

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
          {isEnglish ? 'Español' : 'English'}
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
              : '¿Cuánta Casa Puedes Comprar?'}
          </h1>
          <p className="text-sm text-white/50 font-inter">
            {isEnglish
              ? 'Get your personalized DFW home affordability estimate'
              : 'Obtén tu estimación personalizada de vivienda en DFW'}
          </p>
        </div>

        {step === 'calculate' && (
          <form onSubmit={handleCalculate} className="space-y-4">
            <div className="relative">
              <DollarSign size={16} className="absolute left-3 top-9 text-white/30" />
              <Input
                label={isEnglish ? 'Annual Household Income' : 'Ingreso Anual del Hogar'}
                type="number"
                value={income}
                onChange={(e) => setIncome(e.target.value)}
                placeholder="85000"
                required
                min={0}
                className="!bg-white/10 !border-white/20 !text-white !pl-10 !placeholder:text-white/30"
              />
            </div>
            <Input
              label={isEnglish ? 'Monthly Debts' : 'Deudas Mensuales'}
              type="number"
              value={debts}
              onChange={(e) => setDebts(e.target.value)}
              placeholder="500"
              required
              min={0}
              className="!bg-white/10 !border-white/20 !text-white !placeholder:text-white/30"
            />
            <Input
              label={isEnglish ? 'Available Down Payment' : 'Pago Inicial Disponible'}
              type="number"
              value={downPayment}
              onChange={(e) => setDownPayment(e.target.value)}
              placeholder="20000"
              required
              min={0}
              className="!bg-white/10 !border-white/20 !text-white !placeholder:text-white/30"
            />
            <div>
              <label className="block text-xs font-montserrat font-medium text-white/80 mb-1.5">
                {isEnglish ? 'Credit Score Range' : 'Rango de Puntaje de Crédito'}
              </label>
              <select
                value={creditScore}
                onChange={(e) => setCreditScore(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border bg-white/10 border-white/20 text-white text-sm font-inter outline-none focus:border-gold"
              >
                <option value="excellent" className="bg-navy">{isEnglish ? 'Excellent (740+)' : 'Excelente (740+)'}</option>
                <option value="good" className="bg-navy">{isEnglish ? 'Good (670-739)' : 'Bueno (670-739)'}</option>
                <option value="fair" className="bg-navy">{isEnglish ? 'Fair (580-669)' : 'Regular (580-669)'}</option>
                <option value="poor" className="bg-navy">{isEnglish ? 'Below 580' : 'Debajo de 580'}</option>
              </select>
            </div>
            <Input
              label={isEnglish ? 'Desired DFW Location' : 'Ubicación Deseada en DFW'}
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Frisco, McKinney, Plano..."
              className="!bg-white/10 !border-white/20 !text-white !placeholder:text-white/30"
            />
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
                : 'Ingresa tu información para ver tus resultados completos'}
            </p>
            <Input
              label={isEnglish ? 'Full Name' : 'Nombre Completo'}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="!bg-white/10 !border-white/20 !text-white !placeholder:text-white/30"
            />
            <Input
              label={isEnglish ? 'Email' : 'Correo Electrónico'}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="!bg-white/10 !border-white/20 !text-white !placeholder:text-white/30"
            />
            <Input
              label={isEnglish ? 'Phone' : 'Teléfono'}
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="!bg-white/10 !border-white/20 !text-white !placeholder:text-white/30"
            />
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
          <div className="text-center">
            <p className="text-white/50 text-sm font-inter mb-4">
              {isEnglish ? 'Your Estimated Affordability' : 'Tu Capacidad Estimada'}
            </p>
            <p
              className="text-5xl font-bold text-gold mb-2"
              style={{ fontFamily: BRAND.fonts.dmSerif }}
            >
              ${result.affordability_estimate.toLocaleString()}
            </p>
            <p className="text-white/40 text-xs font-inter mb-8">
              {isEnglish ? 'Estimated based on your inputs' : 'Estimación basada en tu información'}
            </p>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-white/5 rounded-[12px] p-4">
                <p className="text-xs text-white/40 font-inter mb-1">
                  {isEnglish ? 'Est. Monthly Payment' : 'Pago Mensual Est.'}
                </p>
                <p className="text-xl font-bold text-white" style={{ fontFamily: BRAND.fonts.dmSerif }}>
                  ${result.monthly_payment_estimate.toLocaleString()}
                </p>
              </div>
              <div className="bg-white/5 rounded-[12px] p-4">
                <p className="text-xs text-white/40 font-inter mb-1">
                  {isEnglish ? 'Cash to Close' : 'Efectivo para Cierre'}
                </p>
                <p className="text-xl font-bold text-white" style={{ fontFamily: BRAND.fonts.dmSerif }}>
                  ${result.cash_to_close_estimate.toLocaleString()}
                </p>
              </div>
            </div>

            {/* Pre-approval readiness */}
            <div className="bg-white/5 rounded-[12px] p-4 mb-6">
              <p className="text-xs text-white/40 font-inter mb-2">
                {isEnglish ? 'Pre-Approval Readiness' : 'Preparación para Pre-Aprobación'}
              </p>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gold transition-all duration-1000"
                    style={{ width: `${result.preapproval_readiness_score}%` }}
                  />
                </div>
                <span className="text-sm font-montserrat font-bold text-gold">
                  {result.preapproval_readiness_score}/100
                </span>
              </div>
            </div>

            <p className="text-sm text-white/80 font-inter">
              {isEnglish
                ? "Anthony will reach out with personalized next steps for your DFW home search."
                : 'Anthony se comunicará contigo con los próximos pasos personalizados.'}
            </p>
          </div>
        )}

        {/* Footer */}
        <footer className="mt-12 py-8 text-center" style={{ backgroundColor: BRAND.colors.primary }}>
          <p className="text-xs text-white font-inter">
            {BRAND.agent.name} &middot; Realtor &middot; {BRAND.agent.phone} &middot; {BRAND.agent.email}
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
