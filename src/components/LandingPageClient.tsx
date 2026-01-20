'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import './LandingPage.css';
import { EmailCaptureModal } from './EmailCaptureModal';
import { LandingChoiceModal } from './LandingChoiceModal';
import { Footer } from './Footer';
import { MobileSettingsHeader } from './MobileSettingsHeader';
import { trackCTAClick, trackAppEntryConversion, trackFunnelStep } from '../utils/analytics';
import { captureUtmParams } from '../utils/utm';
import { shouldShowEmailCapture } from '../utils/emailCaptureManager';
import type { TourId } from '../data/tourRegistry';
import { DEMO_EVENT_ID } from '../lib/constants';

// SVG Icons
const HeartIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </svg>
);

const GridIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" />
    <rect x="14" y="3" width="7" height="7" />
    <rect x="14" y="14" width="7" height="7" />
    <rect x="3" y="14" width="7" height="7" />
  </svg>
);

const PhoneIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
    <line x1="12" y1="18" x2="12.01" y2="18" />
  </svg>
);

const ChevronIcon = () => (
  <svg className="faq-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

const ShieldIcon = () => (
  <svg className="trust-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

const ClockIcon = () => (
  <svg className="trust-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const CheckIcon = () => (
  <svg className="trust-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const ArrowRightIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </svg>
);

// Floating Shape SVGs
const RoundTableShape = () => (
  <svg className="floating-shape shape-table-round" viewBox="0 0 140 140" fill="none">
    {/* Table */}
    <circle cx="70" cy="70" r="35" stroke="currentColor" strokeWidth="2" fill="none" />
    <text x="70" y="75" textAnchor="middle" fill="currentColor" fontSize="12" fontWeight="500">Table 1</text>
    {/* Guest circles around the table */}
    <circle cx="70" cy="25" r="12" stroke="currentColor" strokeWidth="1.5" fill="none" />
    <circle cx="110" cy="50" r="12" stroke="currentColor" strokeWidth="1.5" fill="none" />
    <circle cx="110" cy="90" r="12" stroke="currentColor" strokeWidth="1.5" fill="none" />
    <circle cx="70" cy="115" r="12" stroke="currentColor" strokeWidth="1.5" fill="none" />
    <circle cx="30" cy="90" r="12" stroke="currentColor" strokeWidth="1.5" fill="none" />
    <circle cx="30" cy="50" r="12" stroke="currentColor" strokeWidth="1.5" fill="none" />
  </svg>
);

const RectTableShape = () => (
  <svg className="floating-shape shape-table-rect" viewBox="0 0 160 95" fill="none">
    {/* Table */}
    <rect x="30" y="30" width="100" height="35" rx="4" stroke="currentColor" strokeWidth="2" fill="none" />
    <text x="80" y="52" textAnchor="middle" fill="currentColor" fontSize="10" fontWeight="500">Table 2</text>
    {/* Guest circles */}
    <circle cx="45" cy="15" r="10" stroke="currentColor" strokeWidth="1.5" fill="none" />
    <circle cx="80" cy="15" r="10" stroke="currentColor" strokeWidth="1.5" fill="none" />
    <circle cx="115" cy="15" r="10" stroke="currentColor" strokeWidth="1.5" fill="none" />
    <circle cx="45" cy="80" r="10" stroke="currentColor" strokeWidth="1.5" fill="none" />
    <circle cx="80" cy="80" r="10" stroke="currentColor" strokeWidth="1.5" fill="none" />
    <circle cx="115" cy="80" r="10" stroke="currentColor" strokeWidth="1.5" fill="none" />
  </svg>
);

const GuestCircle1 = () => (
  <svg className="floating-shape shape-guest-1" viewBox="0 0 60 60" fill="none">
    <circle cx="30" cy="30" r="25" stroke="currentColor" strokeWidth="2" fill="none" />
    <text x="30" y="35" textAnchor="middle" fill="currentColor" fontSize="12" fontWeight="500">EB</text>
  </svg>
);

const GuestCircle2 = () => (
  <svg className="floating-shape shape-guest-2" viewBox="0 0 55 55" fill="none">
    <circle cx="27.5" cy="27.5" r="22" stroke="currentColor" strokeWidth="2" fill="none" />
    <text x="27.5" y="32" textAnchor="middle" fill="currentColor" fontSize="11" fontWeight="500">LM</text>
  </svg>
);

const HeartShape = () => (
  <svg className="floating-shape shape-heart" viewBox="0 0 50 50" fill="currentColor">
    <path d="M25 44.5l-3.5-3.2C10 31.4 2 24.2 2 15.5 2 8.4 7.4 3 14.5 3c4 0 7.9 1.9 10.5 4.8C27.6 4.9 31.5 3 35.5 3 42.6 3 48 8.4 48 15.5c0 8.7-8 15.9-19.5 25.8L25 44.5z" />
  </svg>
);

const NamecardShape = () => (
  <svg className="floating-shape shape-namecard" viewBox="0 0 90 55" fill="none">
    <rect x="5" y="5" width="80" height="45" rx="4" stroke="currentColor" strokeWidth="1.5" fill="none" />
    <text x="45" y="22" textAnchor="middle" fill="currentColor" fontSize="8" opacity="0.7">Guest Name</text>
    <line x1="15" y1="32" x2="75" y2="32" stroke="currentColor" strokeWidth="1" opacity="0.5" />
    <line x1="15" y1="40" x2="55" y2="40" stroke="currentColor" strokeWidth="1" opacity="0.3" />
  </svg>
);

const faqItems = [
  {
    question: 'Is my data secure?',
    answer: 'Yes! All your event data is stored securely in the cloud. Your guest lists, seating arrangements, and relationship data are protected with enterprise-grade security.',
  },
  {
    question: 'Do I need to create an account?',
    answer: 'Creating a free account lets you save your work, access it from any device, and share seating charts with others. Sign up takes just 30 seconds!',
  },
  {
    question: 'Can I use this on my phone?',
    answer: 'Absolutely! Seatify is fully responsive and works great on phones, tablets, and desktops. Drag-and-drop works with touch gestures on mobile devices.',
  },
  {
    question: 'How does the seating optimizer work?',
    answer: 'Our optimizer uses a smart algorithm that considers guest relationships. It keeps couples and partners together, respects "keep apart" constraints, and distributes groups evenly across tables to create balanced, harmonious seating.',
  },
  {
    question: 'Is Seatify really free?',
    answer: 'Yes! The core seating chart tools are completely free to use. Create unlimited events and guests with your free account.',
  },
];

const useCases = ['Weddings', 'Corporate Dinners', 'Galas', 'Team Offsites', 'Private Parties'];

export function LandingPageClient() {
  const router = useRouter();
  const [showEmailCapture, setShowEmailCapture] = useState(false);
  const [showChoiceModal, setShowChoiceModal] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  // Check if user has already subscribed (don't show button if so)
  const canShowEmailButton = typeof window !== 'undefined' && (
    shouldShowEmailCapture('guestMilestone') ||
    shouldShowEmailCapture('optimizerSuccess') ||
    shouldShowEmailCapture('exportAttempt')
  );

  // Capture UTM parameters and track landing view on page load
  useEffect(() => {
    captureUtmParams();
    trackFunnelStep('landing_view');
  }, []);

  const handleEnterApp = () => {
    trackCTAClick('hero');
    setShowChoiceModal(true);
  };

  const handleViewDemo = () => {
    trackCTAClick('demo');
    trackFunnelStep('demo_view');
    router.push(`/dashboard/events/${DEMO_EVENT_ID}/canvas`);
  };

  // Handle "See how it works" clicks - navigates to app with pending tour
  const handleFeatureTourClick = (tourId: TourId) => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('pendingTour', tourId);
    }
    trackCTAClick(`feature_tour_${tourId}`);
    trackAppEntryConversion();
    trackFunnelStep('cta_click');
    trackFunnelStep('app_entry');
    router.push('/dashboard');
  };

  // Secondary CTA handler
  const handleSecondaryCTA = () => {
    trackCTAClick('secondary');
    setShowChoiceModal(true);
  };

  // Toggle FAQ item
  const toggleFaq = (index: number) => {
    setExpandedFaq(expandedFaq === index ? null : index);
  };

  return (
    <div className="landing-page">
      {/* Mobile Settings Header - only visible on mobile */}
      <div className="mobile-settings-container">
        <MobileSettingsHeader
          onSubscribe={() => setShowEmailCapture(true)}
          canShowEmailButton={canShowEmailButton}
        />
      </div>

      {/* Floating Decorative Shapes */}
      <div className="floating-shapes">
        <RoundTableShape />
        <RectTableShape />
        <GuestCircle1 />
        <GuestCircle2 />
        <HeartShape />
        <NamecardShape />
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

          <p className="landing-tagline">Free Seating Chart Maker for Weddings &amp; Events</p>

          <p className="landing-description">
            Create beautiful seating plans with drag-and-drop simplicity. Our smart seating plan generator handles guest relationships automatically.
          </p>

          <div className="cta-button-group">
            <button className="cta-button" onClick={handleEnterApp}>
              Start Planning Free
            </button>
            <button className="demo-button" onClick={handleViewDemo}>
              View Demo Event
            </button>
          </div>

          <div className="trust-badges">
            <div className="trust-badge">
              <ShieldIcon />
              <span>100% Private</span>
            </div>
            <div className="trust-badge">
              <ClockIcon />
              <span>No Signup</span>
            </div>
            <div className="trust-badge">
              <CheckIcon />
              <span>No Credit Card</span>
            </div>
          </div>
        </section>

        {/* Wave Divider */}
        <div className="wave-divider">
          <svg viewBox="0 0 1200 60" preserveAspectRatio="none">
            <path
              d="M0 30 Q300 0 600 30 T1200 30"
              fill="none"
              stroke="var(--color-border)"
              strokeWidth="1"
            />
          </svg>
        </div>

        {/* Features Section */}
        <section className="features-section">
          <div className="features-stack">
            <div className="feature-card">
              <div className="feature-icon-wrap">
                <HeartIcon />
              </div>
              <div className="feature-content">
                <h3>Smart Seating</h3>
                <p>Keep partners together, separate people who shouldn&apos;t sit near each other. The optimizer handles the relationship math.</p>
                <button
                  className="feature-tour-link"
                  onClick={() => handleFeatureTourClick('optimization')}
                >
                  See how it works <ArrowRightIcon />
                </button>
              </div>
            </div>

            <div className="feature-card">
              <div className="feature-icon-wrap">
                <GridIcon />
              </div>
              <div className="feature-content">
                <h3>Visual Floor Plans</h3>
                <p>Drag-and-drop tables in any shape. Add venue elements like stages, bars, and dance floors.</p>
                <button
                  className="feature-tour-link"
                  onClick={() => handleFeatureTourClick('canvas-floor-plan')}
                >
                  See how it works <ArrowRightIcon />
                </button>
              </div>
            </div>

            <div className="feature-card">
              <div className="feature-icon-wrap">
                <PhoneIcon />
              </div>
              <div className="feature-content">
                <h3>Works Everywhere</h3>
                <p>Phone, tablet, or desktop. Your data stays in your browser — private and always available.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Use Cases */}
        <div className="use-cases">
          {useCases.map((useCase) => (
            <span key={useCase} className="use-case-tag">{useCase}</span>
          ))}
        </div>

        {/* Secondary CTA */}
        <section className="secondary-cta-section">
          <p className="secondary-cta-text">Ready to create your seating chart?</p>
          <button className="secondary-cta-button" onClick={handleSecondaryCTA}>
            Get Started Now
          </button>
        </section>

        {/* Coming Soon Section */}
        <section className="coming-soon-section">
          <div className="coming-soon-header">
            <h2>Coming Soon...</h2>
          </div>
          <div className="coming-soon-grid">
            <div className="coming-soon-card">
              <h3>AI-Powered Seating</h3>
              <p>Advanced algorithms that learn guest relationships and preferences to suggest optimal arrangements.</p>
            </div>
            <div className="coming-soon-card">
              <h3>Guest Import &amp; RSVP</h3>
              <p>Import your guest list from your favorite planning tools and track responses as they come in.</p>
              <div className="supported-platforms">
                <span className="platforms-label">Works with:</span>
                <span className="platform-name">Zola</span>
                <span className="platform-name">RSVPify</span>
                <span className="platform-name">Joy</span>
                <span className="platform-name">CSV/Excel</span>
              </div>
              <div className="supported-platforms">
                <span className="platform-name coming-soon">The Knot <small>(coming soon)</small></span>
                <span className="platform-name coming-soon">Eventbrite <small>(coming soon)</small></span>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="faq-section">
          <h2 className="faq-header">Frequently Asked Questions</h2>
          <div className="faq-list">
            {faqItems.map((item, index) => (
              <div
                key={index}
                className={`faq-item ${expandedFaq === index ? 'faq-item--expanded' : ''}`}
              >
                <button className="faq-question" onClick={() => toggleFaq(index)}>
                  <span>{item.question}</span>
                  <ChevronIcon />
                </button>
                <div className="faq-answer">
                  <p>{item.answer}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Get Updates Section */}
        <section className="email-capture">
          <h2>Get Updates</h2>
          <p className="email-description">We&apos;ll email you when we ship something new. No spam.</p>
          <button className="subscribe-button" onClick={() => setShowEmailCapture(true)}>
            Subscribe for Updates
          </button>
        </section>
      </div>

      <Footer />

      {/* Email Capture Modal */}
      {showEmailCapture && (
        <EmailCaptureModal
          onClose={() => setShowEmailCapture(false)}
          source="landing"
        />
      )}

      {/* Landing Choice Modal */}
      <LandingChoiceModal
        isOpen={showChoiceModal}
        onClose={() => setShowChoiceModal(false)}
      />
    </div>
  );
}
