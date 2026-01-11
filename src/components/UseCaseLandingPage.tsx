import { useEffect } from 'react';
import { useNavigate, Link } from '@/lib/router-compat';
import './LandingPage.css';
import { Footer } from './Footer';
import { trackCTAClick, trackAppEntryConversion, trackFunnelStep } from '../utils/analytics';
import { captureUtmParams } from '../utils/utm';

export interface UseCaseConfig {
  // Page identity
  slug: string;
  title: string;
  metaDescription: string;

  // Hero section
  tagline: string;
  description: string;
  ctaText: string;

  // Features - can override defaults or use standard ones
  features?: {
    icon: 'heart' | 'grid' | 'mobile' | 'export' | 'users' | 'calendar';
    title: string;
    description: string;
  }[];

  // Social proof / specifics for this use case
  specificBenefits?: string[];

  // FAQ items specific to this use case (will be merged with general FAQs)
  faqItems?: { question: string; answer: string }[];
}

// Default features that apply to all use cases
const defaultFeatures = [
  {
    icon: 'heart' as const,
    title: 'Smart Seating Optimizer',
    description: 'Our algorithm considers guest relationships to create harmonious seating. Keep groups together, separate those who should be apart.',
  },
  {
    icon: 'grid' as const,
    title: 'Visual Floor Plans',
    description: 'Drag-and-drop tables in any shape. Add venue elements like stages, bars, and dance floors to match your venue.',
  },
  {
    icon: 'mobile' as const,
    title: 'Works Everywhere',
    description: 'Phone, tablet, or desktop. Your data stays in your browser — 100% private and always available.',
  },
];

// Icon components
const FeatureIcon = ({ type }: { type: string }) => {
  switch (type) {
    case 'heart':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
      );
    case 'grid':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="7" height="7" />
          <rect x="14" y="3" width="7" height="7" />
          <rect x="3" y="14" width="7" height="7" />
          <rect x="14" y="14" width="7" height="7" />
        </svg>
      );
    case 'mobile':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="5" y="2" width="14" height="20" rx="2" />
          <path d="M12 18h.01" />
        </svg>
      );
    case 'export':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
      );
    case 'users':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );
    case 'calendar':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      );
    default:
      return null;
  }
};

interface UseCaseLandingPageProps {
  config: UseCaseConfig;
}

export function UseCaseLandingPage({ config }: UseCaseLandingPageProps) {
  const navigate = useNavigate();
  const features = config.features || defaultFeatures;

  // Capture UTM parameters and track landing view on page load
  useEffect(() => {
    captureUtmParams();
    trackFunnelStep('landing_view');

    // Update page title and meta description
    document.title = `${config.title} | Seatify`;
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', config.metaDescription);
    }
  }, [config.slug, config.title, config.metaDescription]);

  const handleEnterApp = () => {
    trackCTAClick(`hero_${config.slug}`);
    trackAppEntryConversion();
    trackFunnelStep('cta_click');
    trackFunnelStep('app_entry');
    navigate('/events');
  };

  return (
    <div className="landing-page">
      {/* Floating Decorative Shapes */}
      <div className="floating-shapes" aria-hidden="true">
        <svg className="floating-shape shape-table-round" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r="32" fill="var(--color-bg)" stroke="currentColor" strokeWidth="3" opacity="0.8" />
          <text x="60" y="56" textAnchor="middle" fontSize="10" fill="currentColor" opacity="0.9" fontWeight="600">Table 1</text>
          <text x="60" y="70" textAnchor="middle" fontSize="8" fill="currentColor" opacity="0.7">4/6</text>
          <circle cx="60" cy="18" r="12" fill="var(--color-bg)" stroke="currentColor" strokeWidth="2" opacity="0.9" />
          <text x="60" y="22" textAnchor="middle" fontSize="8" fill="currentColor" opacity="0.8" fontWeight="500">JD</text>
          <circle cx="102" cy="60" r="12" fill="var(--color-bg)" stroke="currentColor" strokeWidth="2" opacity="0.9" />
          <text x="102" y="64" textAnchor="middle" fontSize="8" fill="currentColor" opacity="0.8" fontWeight="500">AS</text>
          <circle cx="60" cy="102" r="12" fill="var(--color-bg)" stroke="currentColor" strokeWidth="2" opacity="0.9" />
          <text x="60" y="106" textAnchor="middle" fontSize="8" fill="currentColor" opacity="0.8" fontWeight="500">MK</text>
          <circle cx="18" cy="60" r="12" fill="var(--color-bg)" stroke="currentColor" strokeWidth="2" opacity="0.9" />
          <text x="18" y="64" textAnchor="middle" fontSize="8" fill="currentColor" opacity="0.8" fontWeight="500">RW</text>
        </svg>

        <svg className="floating-shape shape-guest-1" viewBox="0 0 50 50">
          <circle cx="25" cy="25" r="20" fill="var(--color-bg)" stroke="currentColor" strokeWidth="3" opacity="0.9" />
          <text x="25" y="30" textAnchor="middle" fontSize="14" fill="currentColor" opacity="0.8" fontWeight="600">EB</text>
        </svg>

        <svg className="floating-shape shape-heart" viewBox="0 0 40 40">
          <path
            d="M20 35 C10 25 2 18 2 12 C2 6 7 2 12 2 C15 2 18 4 20 7 C22 4 25 2 28 2 C33 2 38 6 38 12 C38 18 30 25 20 35Z"
            fill="currentColor"
            opacity="0.6"
          />
        </svg>

        <svg className="floating-shape shape-guest-2" viewBox="0 0 50 50">
          <circle cx="25" cy="25" r="20" fill="var(--color-bg)" stroke="currentColor" strokeWidth="3" opacity="0.85" />
          <text x="25" y="30" textAnchor="middle" fontSize="14" fill="currentColor" opacity="0.75" fontWeight="600">LM</text>
        </svg>
      </div>

      <div className="landing-content">
        {/* Hero Section */}
        <section className="hero-section">
          <div className="logo-wrapper">
            <h1 className="landing-logo">
              <span className="logo-seat">Seat</span>
              <span className="logo-ify">ify</span>
            </h1>
          </div>
          <p className="landing-tagline">{config.tagline}</p>
          <p className="landing-description">{config.description}</p>
          <button className="cta-button" onClick={handleEnterApp}>
            {config.ctaText}
          </button>

          {/* Trust Badges */}
          <div className="trust-badges">
            <div className="trust-badge">
              <svg className="trust-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              <span>100% Private</span>
            </div>
            <div className="trust-badge">
              <svg className="trust-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 6v6l4 2" />
              </svg>
              <span>No Signup</span>
            </div>
            <div className="trust-badge">
              <svg className="trust-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 6L9 17l-5-5" />
              </svg>
              <span>No Credit Card</span>
            </div>
          </div>
        </section>

        {/* Wave Divider */}
        <div className="wave-divider">
          <svg viewBox="0 0 900 60" preserveAspectRatio="none">
            <path
              d="M0 30 Q225 0, 450 30 T900 30"
              stroke="var(--color-border)"
              strokeWidth="1"
              fill="none"
            />
          </svg>
        </div>

        {/* Use Case Specific Benefits */}
        {config.specificBenefits && config.specificBenefits.length > 0 && (
          <section className="use-case-benefits">
            <div className="benefits-list">
              {config.specificBenefits.map((benefit, index) => (
                <div key={index} className="benefit-item">
                  <svg className="benefit-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                  <span>{benefit}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Features Section */}
        <section className="features-section">
          <div className="features-stack">
            {features.map((feature, index) => (
              <div key={index} className="feature-card">
                <div className="feature-icon-wrap">
                  <FeatureIcon type={feature.icon} />
                </div>
                <div className="feature-content">
                  <h3>{feature.title}</h3>
                  <p>{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Secondary CTA */}
        <section className="secondary-cta-section">
          <p className="secondary-cta-text">Ready to create your seating chart?</p>
          <button className="secondary-cta-button" onClick={handleEnterApp}>
            Start Planning Free
          </button>
        </section>

        {/* FAQ Section */}
        {config.faqItems && config.faqItems.length > 0 && (
          <section className="faq-section">
            <h2 className="faq-header">Frequently Asked Questions</h2>
            <div className="faq-list">
              {config.faqItems.map((item, index) => (
                <div key={index} className="faq-item">
                  <details className="faq-details">
                    <summary className="faq-question">
                      <span>{item.question}</span>
                      <svg
                        className="faq-chevron"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M6 9l6 6 6-6" />
                      </svg>
                    </summary>
                    <div className="faq-answer">
                      <p>{item.answer}</p>
                    </div>
                  </details>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Back to Main Site Link */}
        <section className="back-link-section">
          <Link href="/" className="back-link">
            &larr; Back to Seatify Home
          </Link>
        </section>
      </div>

      {/* Footer */}
      <Footer variant="landing" />
    </div>
  );
}
