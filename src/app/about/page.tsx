import type { Metadata } from 'next';
import { BRAND } from '@/lib/brand';
import { LRMonogram } from '@/components/ui/LRMonogram';
import {
  Home,
  DollarSign,
  TrendingUp,
  Phone,
  Mail,
  Instagram,
  Calendar,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Anthony Licona - North Texas Realtor - Licona Realty',
  description:
    'Anthony Licona is a bilingual North Texas Realtor serving the Dallas-Fort Worth metroplex. Specializing in buyers, sellers, landlords, and investors. Hablo Espanol.',
};

const services = [
  {
    icon: Home,
    title: 'Buyers',
    description:
      'Find your dream home in the DFW metroplex with personalized search and expert negotiation.',
  },
  {
    icon: DollarSign,
    title: 'Sellers',
    description:
      'Sell your property for top dollar with professional marketing and strategic pricing.',
  },
  {
    icon: TrendingUp,
    title: 'Investors',
    description:
      'Build and grow your real estate portfolio with data-driven investment strategies.',
  },
];

export default function AboutPage() {
  return (
    <main>
      {/* ── Hero ── */}
      <section
        className="flex flex-col items-center justify-center text-center px-6"
        style={{
          backgroundColor: BRAND.colors.navy,
          minHeight: '400px',
        }}
      >
        <LRMonogram size="xl" className="mb-6" />

        <h1
          style={{
            fontFamily: BRAND.fonts.playfair,
            fontSize: '48px',
            color: BRAND.colors.white,
            margin: 0,
          }}
        >
          {BRAND.agent.name}
        </h1>

        <p
          style={{
            fontFamily: BRAND.fonts.montserrat,
            textTransform: 'uppercase',
            color: BRAND.colors.gold,
            letterSpacing: '3px',
            marginTop: '12px',
            fontSize: '14px',
          }}
        >
          {BRAND.agent.title}
        </p>

        <p
          style={{
            fontFamily: BRAND.fonts.playfair,
            fontStyle: 'italic',
            color: BRAND.colors.gold,
            fontSize: '24px',
            marginTop: '16px',
          }}
        >
          {BRAND.tagline}
        </p>

        {/* Agent photo / LR monogram fallback */}
        <div className="flex flex-col items-center mt-8">
          <div
            className="flex items-center justify-center"
            style={{
              width: '160px',
              height: '160px',
              borderRadius: '50%',
              backgroundColor: BRAND.colors.darkCard,
              border: `3px solid ${BRAND.colors.gold}`,
            }}
          >
            <LRMonogram size="xl" />
          </div>
        </div>
      </section>

      {/* ── About ── */}
      <section
        className="py-20 px-6"
        style={{ backgroundColor: BRAND.colors.surface }}
      >
        <div className="max-w-3xl mx-auto">
          <h2
            className="text-center mb-10"
            style={{
              fontFamily: BRAND.fonts.playfair,
              fontSize: '36px',
              color: BRAND.colors.text,
            }}
          >
            Your DFW Real Estate Expert
          </h2>

          <p
            className="leading-relaxed"
            style={{
              fontFamily: BRAND.fonts.inter,
              fontSize: '16px',
              color: BRAND.colors.text,
              lineHeight: 1.8,
            }}
          >
            Anthony Licona is a licensed North Texas Realtor serving the
            Dallas-Fort Worth metroplex. Specializing in helping buyers,
            sellers, landlords, and investors make smart moves in the DFW
            market. Bilingual in English and Spanish - Hablo Espanol.
          </p>

          {/* Gold divider */}
          <div
            className="mx-auto my-8"
            style={{
              width: '80px',
              height: '2px',
              backgroundColor: BRAND.colors.gold,
            }}
          />

          <p
            className="leading-relaxed"
            style={{
              fontFamily: BRAND.fonts.inter,
              fontSize: '16px',
              color: BRAND.colors.text,
              lineHeight: 1.8,
            }}
          >
            Based at {BRAND.agent.brokerage}, Anthony brings a dedicated,
            client-first approach to every transaction. Whether you are buying
            your first home, selling an investment, or building a portfolio -
            let&apos;s make it happen.
          </p>
        </div>
      </section>

      {/* ── Services ── */}
      <section className="py-20 px-6" style={{ backgroundColor: BRAND.colors.white }}>
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {services.map((service) => {
              const Icon = service.icon;
              return (
                <div
                  key={service.title}
                  className="flex flex-col items-center text-center p-8"
                  style={{
                    backgroundColor: BRAND.colors.navy,
                    borderRadius: BRAND.design.borderRadius.card,
                    border: BRAND.design.cardBorder,
                  }}
                >
                  <Icon
                    size={40}
                    color={BRAND.colors.gold}
                    strokeWidth={1.5}
                    className="mb-4"
                  />
                  <h3
                    className="mb-3"
                    style={{
                      fontFamily: BRAND.fonts.montserrat,
                      fontSize: '20px',
                      fontWeight: 600,
                      color: BRAND.colors.white,
                    }}
                  >
                    {service.title}
                  </h3>
                  <p
                    style={{
                      fontFamily: BRAND.fonts.inter,
                      fontSize: '14px',
                      color: 'rgba(255,255,255,0.8)',
                      lineHeight: 1.7,
                    }}
                  >
                    {service.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Contact ── */}
      <section
        className="py-20 px-6 text-center"
        style={{ backgroundColor: BRAND.colors.navy }}
      >
        <div className="max-w-2xl mx-auto">
          <div className="flex flex-col items-center gap-5 mb-10">
            <a
              href={`tel:${BRAND.agent.phoneE164}`}
              className="flex items-center gap-3 transition-opacity hover:opacity-80"
              style={{
                fontFamily: BRAND.fonts.inter,
                fontSize: '18px',
                color: BRAND.colors.white,
                textDecoration: 'none',
              }}
            >
              <Phone size={20} color={BRAND.colors.gold} />
              {BRAND.agent.phone}
            </a>

            <a
              href={`mailto:${BRAND.agent.email}`}
              className="flex items-center gap-3 transition-opacity hover:opacity-80"
              style={{
                fontFamily: BRAND.fonts.inter,
                fontSize: '18px',
                color: BRAND.colors.white,
                textDecoration: 'none',
              }}
            >
              <Mail size={20} color={BRAND.colors.gold} />
              {BRAND.agent.email}
            </a>

            <a
              href={BRAND.agent.instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 transition-opacity hover:opacity-80"
              style={{
                fontFamily: BRAND.fonts.inter,
                fontSize: '18px',
                color: BRAND.colors.white,
                textDecoration: 'none',
              }}
            >
              <Instagram size={20} color={BRAND.colors.gold} />
              {BRAND.agent.instagram}
            </a>
          </div>

          <a
            href={`tel:${BRAND.agent.phoneE164}`}
            className="inline-flex items-center gap-2 transition-opacity hover:opacity-90"
            style={{
              fontFamily: BRAND.fonts.montserrat,
              fontWeight: 600,
              fontSize: '16px',
              color: BRAND.colors.navy,
              backgroundColor: BRAND.colors.gold,
              padding: '14px 32px',
              borderRadius: BRAND.design.borderRadius.button,
              textDecoration: 'none',
            }}
          >
            <Calendar size={18} />
            Book a Free Consultation
          </a>

          <p
            className="mt-10"
            style={{
              fontFamily: BRAND.fonts.inter,
              fontSize: '13px',
              color: 'rgba(255,255,255,0.6)',
            }}
          >
            {BRAND.agent.license}
          </p>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer
        className="py-10 px-6 text-center"
        style={{ backgroundColor: BRAND.colors.navy }}
      >
        <div
          className="mx-auto mb-6"
          style={{
            width: '100%',
            height: '1px',
            backgroundColor: 'rgba(211,169,113,0.2)',
          }}
        />

        <p
          style={{
            fontFamily: BRAND.fonts.inter,
            fontSize: '14px',
            color: BRAND.colors.white,
            marginBottom: '8px',
          }}
        >
          {BRAND.agent.name} &middot; Realtor &middot; {BRAND.agent.phone}{' '}
          &middot; {BRAND.agent.email}
        </p>

        <p
          style={{
            fontFamily: BRAND.fonts.inter,
            fontSize: '13px',
            color: BRAND.colors.white,
            opacity: 0.8,
            marginBottom: '8px',
          }}
        >
          {BRAND.agent.brokerage} &middot; {BRAND.agent.license}
        </p>

        <p
          style={{
            fontFamily: BRAND.fonts.playfair,
            fontStyle: 'italic',
            fontSize: '16px',
            color: BRAND.colors.gold,
          }}
        >
          {BRAND.tagline}
        </p>
      </footer>
    </main>
  );
}
