import { useEffect } from 'react';
import { useNavigate, Link } from '@/lib/router-compat';
import '../LandingPage.css';
import { Footer } from '../Footer';
import { trackCTAClick, trackAppEntryConversion, trackFunnelStep } from '../../utils/analytics';
import { captureUtmParams } from '../../utils/utm';

const steps = [
  {
    number: '1',
    title: 'Add Your Guests',
    description: 'Enter your guest list manually, or import from a spreadsheet. Add names, plus-ones, and any dietary notes.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="8.5" cy="7" r="4" />
        <line x1="20" y1="8" x2="20" y2="14" />
        <line x1="23" y1="11" x2="17" y2="11" />
      </svg>
    ),
  },
  {
    number: '2',
    title: 'Set Relationships',
    description: 'Mark couples, partners, and groups who should sit together. Flag anyone who should be kept apart.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    ),
  },
  {
    number: '3',
    title: 'Design Your Layout',
    description: 'Drag and drop tables onto your floor plan. Choose round, rectangular, or custom shapes. Add venue elements.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" />
      </svg>
    ),
  },
  {
    number: '4',
    title: 'Optimize Automatically',
    description: 'Click "Optimize" and our algorithm assigns everyone to tables, respecting all your relationship rules.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
  },
  {
    number: '5',
    title: 'Fine-Tune & Export',
    description: 'Drag guests between tables to perfect your plan. Export to PDF, print place cards, or share via QR code.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
    ),
  },
];

export function HowItWorksPage() {
  const navigate = useNavigate();

  useEffect(() => {
    captureUtmParams();
    trackFunnelStep('landing_view');

    document.title = 'How It Works | Seatify';
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', 'Learn how Seatify works in 5 simple steps. Create your seating chart, set guest relationships, optimize automatically, and export. Free and no signup required.');
    }
  }, []);

  const handleEnterApp = () => {
    trackCTAClick('hero_how-it-works');
    trackAppEntryConversion();
    trackFunnelStep('cta_click');
    trackFunnelStep('app_entry');
    navigate('/events');
  };

  return (
    <div className="landing-page">
      <div className="landing-content">
        {/* Hero Section */}
        <section className="hero-section">
          <div className="logo-wrapper">
            <h1 className="landing-logo">
              <span className="logo-seat">Seat</span>
              <span className="logo-ify">ify</span>
            </h1>
          </div>
          <p className="landing-tagline">How It Works</p>
          <p className="landing-description">
            Create your perfect seating arrangement in 5 simple steps. No signup required — start planning in seconds.
          </p>
        </section>

        {/* Steps Section */}
        <section className="how-it-works-steps">
          {steps.map((step, index) => (
            <div key={index} className="step-card">
              <div className="step-number">{step.number}</div>
              <div className="step-icon-wrap">{step.icon}</div>
              <div className="step-content">
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </div>
            </div>
          ))}
        </section>

        {/* CTA Section */}
        <section className="secondary-cta-section">
          <p className="secondary-cta-text">Ready to try it yourself?</p>
          <button className="cta-button" onClick={handleEnterApp}>
            Start Planning Free
          </button>
          <div className="trust-badges" style={{ marginTop: '1.5rem' }}>
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
