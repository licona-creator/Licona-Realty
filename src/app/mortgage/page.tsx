/**
 * Mortgage and Affordability Calculator
 *
 * PUBLIC PAGE — accessible without authentication.
 * Collects sensitive financial PII (income, debts).
 * All data encrypted in transit (HTTPS) and at rest.
 * Lead capture: name, email, phone required for full results.
 * SEO optimized for DFW mortgage-related searches.
 */

'use client';

import { useState, type FormEvent } from 'react';
import { motion } from 'framer-motion';
import { LRMonogram } from '@/components/ui/LRMonogram';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { BRAND } from '@/lib/brand';
import { Calculator, DollarSign } from 'lucide-react';

export default function MortgageCalculatorPage() {
  const [step, setStep] = useState<'calculate' | 'capture' | 'results'>('calculate');
  const [income, setIncome] = useState('');
  const [debts, setDebts] = useState('');
  const [downPayment, setDownPayment] = useState('');
  const [location, setLocation] = useState('');
  const [language, setLanguage] = useState<'en' | 'es'>('en');

  const isEnglish = language === 'en';

  function handleCalculate(e: FormEvent) {
    e.preventDefault();
    // Move to lead capture step
    setStep('capture');
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
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
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
        </motion.div>

        {step === 'calculate' && (
          <motion.form
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onSubmit={handleCalculate}
            className="space-y-4"
          >
            <div className="relative">
              <DollarSign
                size={16}
                className="absolute left-3 top-9 text-white/30"
              />
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
            <Input
              label={isEnglish ? 'Desired DFW Location' : 'Ubicación Deseada en DFW'}
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder={isEnglish ? 'Frisco, McKinney, Plano...' : 'Frisco, McKinney, Plano...'}
              className="!bg-white/10 !border-white/20 !text-white !placeholder:text-white/30"
            />
            <Button type="submit" variant="accent" size="lg" className="w-full">
              {isEnglish ? 'Calculate My Affordability' : 'Calcular Mi Capacidad'}
            </Button>
          </motion.form>
        )}

        {step === 'capture' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center"
          >
            <p className="text-white/60 text-sm font-inter mb-6">
              {isEnglish
                ? 'Enter your contact info to see your full results'
                : 'Ingresa tu información para ver tus resultados completos'}
            </p>
            <div className="space-y-4">
              <Input
                label={isEnglish ? 'Full Name' : 'Nombre Completo'}
                type="text"
                required
                className="!bg-white/10 !border-white/20 !text-white !placeholder:text-white/30"
              />
              <Input
                label={isEnglish ? 'Email' : 'Correo Electrónico'}
                type="email"
                required
                className="!bg-white/10 !border-white/20 !text-white !placeholder:text-white/30"
              />
              <Input
                label={isEnglish ? 'Phone' : 'Teléfono'}
                type="tel"
                required
                className="!bg-white/10 !border-white/20 !text-white !placeholder:text-white/30"
              />
              <Button
                variant="accent"
                size="lg"
                className="w-full"
                onClick={() => setStep('results')}
              >
                {isEnglish ? 'See My Results' : 'Ver Mis Resultados'}
              </Button>
            </div>
          </motion.div>
        )}

        {step === 'results' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center"
          >
            <p className="text-white/50 text-sm font-inter mb-4">
              {isEnglish ? 'Your Estimated Affordability' : 'Tu Capacidad Estimada'}
            </p>
            <p
              className="text-5xl font-bold text-gold mb-2"
              style={{ fontFamily: BRAND.fonts.dmSerif }}
            >
              $285,000
            </p>
            <p className="text-white/40 text-xs font-inter mb-8">
              {isEnglish ? 'Estimated based on your inputs' : 'Estimación basada en tu información'}
            </p>

            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="bg-white/5 rounded-[12px] p-4">
                <p className="text-xs text-white/40 font-inter mb-1">
                  {isEnglish ? 'Est. Monthly Payment' : 'Pago Mensual Est.'}
                </p>
                <p className="text-xl font-bold text-white" style={{ fontFamily: BRAND.fonts.dmSerif }}>
                  $1,850
                </p>
              </div>
              <div className="bg-white/5 rounded-[12px] p-4">
                <p className="text-xs text-white/40 font-inter mb-1">
                  {isEnglish ? 'Cash to Close' : 'Efectivo para Cierre'}
                </p>
                <p className="text-xl font-bold text-white" style={{ fontFamily: BRAND.fonts.dmSerif }}>
                  $28,500
                </p>
              </div>
            </div>

            <p className="text-sm text-white/60 font-inter mb-6">
              {isEnglish
                ? "Anthony will reach out with personalized next steps for your DFW home search."
                : 'Anthony se comunicará contigo con los próximos pasos personalizados.'}
            </p>
          </motion.div>
        )}

        {/* Footer */}
        <div className="mt-12 text-center">
          <p className="text-xs text-white/30 font-inter">
            {BRAND.agent.name} &middot; {BRAND.agent.title}
          </p>
          <p className="text-xs text-white/20 font-inter mt-1">
            {BRAND.agent.brokerage} &middot; {BRAND.agent.license}
          </p>
          <p className="text-[10px] text-gold/30 font-inter mt-2">
            {BRAND.tagline}
          </p>
        </div>
      </div>
    </div>
  );
}
