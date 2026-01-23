'use client';

import { useEffect, useState } from 'react';
import { Link } from '@/lib/router-compat';
import '../LandingPage.css';
import { Footer } from '../Footer';
import { trackEvent } from '../../utils/analytics';
import { captureUtmParams } from '../../utils/utm';
import { PRICING_TIERS, type SubscriptionPlan } from '@/types/subscription';
import { startCheckout, STRIPE_PRICES } from '@/lib/stripe/client';
import { useSubscription } from '@/hooks/useSubscription';

// Check icon
const CheckIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="check-icon">
    <path d="M20 6L9 17l-5-5" />
  </svg>
);

// Billing toggle component
function BillingToggle({ annual, onChange }: { annual: boolean; onChange: (annual: boolean) => void }) {
  return (
    <div className="billing-toggle">
      <button
        className={`toggle-option ${!annual ? 'active' : ''}`}
        onClick={() => onChange(false)}
      >
        Monthly
      </button>
      <button
        className={`toggle-option ${annual ? 'active' : ''}`}
        onClick={() => onChange(true)}
      >
        Yearly
        <span className="save-badge">Save 30%</span>
      </button>
    </div>
  );
}

// Pricing card component
function PricingCard({
  tier,
  annual,
  currentPlan,
  onUpgrade,
  isLoading,
}: {
  tier: typeof PRICING_TIERS[number];
  annual: boolean;
  currentPlan: SubscriptionPlan;
  onUpgrade: (plan: SubscriptionPlan, annual: boolean) => void;
  isLoading: boolean;
}) {
  const price = annual ? tier.yearlyPrice : tier.monthlyPrice;
  const isCurrentPlan = tier.plan === currentPlan;
  const isEnterprise = tier.plan === 'enterprise';
  const isFree = tier.plan === 'free';

  const handleClick = () => {
    if (isEnterprise) {
      window.location.href = 'mailto:support@seatify.app?subject=Enterprise%20Inquiry';
    } else if (!isFree && !isCurrentPlan) {
      onUpgrade(tier.plan, annual);
    }
  };

  return (
    <div className={`pricing-card ${tier.highlighted ? 'highlighted' : ''} ${isCurrentPlan ? 'current' : ''}`}>
      {tier.highlighted && <div className="popular-badge">Most Popular</div>}
      {isCurrentPlan && <div className="current-badge">Current Plan</div>}

      <h3 className="plan-name">{tier.name}</h3>
      <p className="plan-description">{tier.description}</p>

      <div className="plan-price">
        {isEnterprise ? (
          <span className="price-custom">Custom</span>
        ) : isFree ? (
          <span className="price-free">Free</span>
        ) : (
          <>
            <span className="price-currency">$</span>
            <span className="price-amount">{price}</span>
            <span className="price-period">/{annual ? 'year' : 'month'}</span>
          </>
        )}
      </div>

      {annual && !isFree && !isEnterprise && (
        <p className="price-monthly-equiv">
          ${Math.round(price / 12)}/month billed annually
        </p>
      )}

      <ul className="feature-list">
        {tier.features.map((feature, index) => (
          <li key={index} className="feature-item">
            <CheckIcon />
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      <button
        className={`plan-cta ${tier.highlighted ? 'primary' : 'secondary'} ${isCurrentPlan ? 'disabled' : ''}`}
        onClick={handleClick}
        disabled={isCurrentPlan || isLoading}
      >
        {isLoading ? 'Loading...' : isCurrentPlan ? 'Current Plan' : tier.ctaText}
      </button>
    </div>
  );
}

export function PricingPage() {
  const [annual, setAnnual] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const { plan: currentPlan, isLoading: subscriptionLoading } = useSubscription();

  useEffect(() => {
    captureUtmParams();
    trackEvent('pricing_view', { event_category: 'page_view' });

    document.title = 'Pricing | Seatify';
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', 'Choose the Seatify plan that fits your needs. Free for small events, Pro for unlimited events and custom branding, Team for collaboration.');
    }
  }, []);

  const handleUpgrade = async (plan: SubscriptionPlan, isAnnual: boolean) => {
    setIsLoading(true);
    try {
      const priceId = isAnnual
        ? STRIPE_PRICES[plan as 'pro' | 'team']?.yearly
        : STRIPE_PRICES[plan as 'pro' | 'team']?.monthly;

      if (!priceId) {
        console.error('Price ID not found for plan:', plan);
        alert('Unable to start checkout. Please try again later.');
        return;
      }

      await startCheckout(priceId);
    } catch (error) {
      console.error('Checkout error:', error);
      alert('Failed to start checkout. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="landing-page pricing-page">
      <div className="landing-content">
        {/* Hero Section */}
        <section className="hero-section">
          <div className="logo-wrapper">
            <Link href="/" className="landing-logo">
              <span className="logo-seat">Seat</span>
              <span className="logo-ify">ify</span>
            </Link>
          </div>
          <p className="landing-tagline">Simple, Transparent Pricing</p>
          <p className="landing-description">
            Start free and upgrade when you need more. No hidden fees.
          </p>
        </section>

        {/* Billing Toggle */}
        <section className="billing-section">
          <BillingToggle annual={annual} onChange={setAnnual} />
        </section>

        {/* Pricing Cards */}
        <section className="pricing-grid">
          {PRICING_TIERS.map((tier) => (
            <PricingCard
              key={tier.plan}
              tier={tier}
              annual={annual}
              currentPlan={subscriptionLoading ? 'free' : currentPlan}
              onUpgrade={handleUpgrade}
              isLoading={isLoading}
            />
          ))}
        </section>

        {/* FAQ Section */}
        <section className="faq-section">
          <h2>Frequently Asked Questions</h2>

          <div className="faq-grid">
            <div className="faq-item">
              <h3>Can I try Pro features before upgrading?</h3>
              <p>Yes! Start with our free tier and upgrade anytime. Your data is always preserved when you upgrade or downgrade.</p>
            </div>

            <div className="faq-item">
              <h3>What happens when I reach my limits?</h3>
              <p>You&apos;ll see a friendly prompt to upgrade. Your existing events and guests remain accessible — you just can&apos;t add more until you upgrade.</p>
            </div>

            <div className="faq-item">
              <h3>Can I cancel anytime?</h3>
              <p>Absolutely. Cancel your subscription anytime from your account settings. You&apos;ll keep access until the end of your billing period.</p>
            </div>

            <div className="faq-item">
              <h3>Do you offer refunds?</h3>
              <p>Yes, we offer a 30-day money-back guarantee. If you&apos;re not satisfied, contact us for a full refund.</p>
            </div>

            <div className="faq-item">
              <h3>What payment methods do you accept?</h3>
              <p>We accept all major credit cards (Visa, Mastercard, American Express) through our secure Stripe payment processor.</p>
            </div>

            <div className="faq-item">
              <h3>Can I switch between plans?</h3>
              <p>Yes! You can upgrade or downgrade at any time. When upgrading, you&apos;ll be charged the prorated difference. When downgrading, you&apos;ll receive credit toward future billing.</p>
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

      <style jsx>{`
        .pricing-page {
          --primary-color: #F97066;
        }

        .billing-section {
          display: flex;
          justify-content: center;
          margin: 2rem 0;
        }

        .billing-toggle {
          display: inline-flex;
          background: var(--bg-secondary, #f5f5f5);
          border-radius: 999px;
          padding: 4px;
          gap: 4px;
        }

        .toggle-option {
          padding: 0.75rem 1.5rem;
          border: none;
          background: transparent;
          border-radius: 999px;
          cursor: pointer;
          font-weight: 500;
          color: var(--text-secondary, #666);
          transition: all 0.2s;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .toggle-option.active {
          background: white;
          color: var(--text-primary, #1a1a1a);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .save-badge {
          background: var(--primary-color);
          color: white;
          font-size: 0.7rem;
          padding: 0.2rem 0.5rem;
          border-radius: 999px;
          font-weight: 600;
        }

        .pricing-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 1.5rem;
          max-width: 1200px;
          margin: 2rem auto;
          padding: 0 1rem;
        }

        .pricing-card {
          background: var(--bg-card, white);
          border-radius: 1rem;
          padding: 2rem;
          display: flex;
          flex-direction: column;
          position: relative;
          border: 2px solid var(--border-color, #e5e5e5);
          transition: transform 0.2s, box-shadow 0.2s;
        }

        .pricing-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.1);
        }

        .pricing-card.highlighted {
          border-color: var(--primary-color);
          box-shadow: 0 8px 30px rgba(249, 112, 102, 0.2);
        }

        .pricing-card.current {
          border-color: #10B981;
        }

        .popular-badge,
        .current-badge {
          position: absolute;
          top: -12px;
          left: 50%;
          transform: translateX(-50%);
          padding: 0.25rem 0.75rem;
          border-radius: 999px;
          font-size: 0.75rem;
          font-weight: 600;
          white-space: nowrap;
        }

        .popular-badge {
          background: var(--primary-color);
          color: white;
        }

        .current-badge {
          background: #10B981;
          color: white;
        }

        .plan-name {
          font-size: 1.5rem;
          font-weight: 700;
          margin-bottom: 0.5rem;
          color: var(--text-primary, #1a1a1a);
        }

        .plan-description {
          color: var(--text-secondary, #666);
          font-size: 0.9rem;
          margin-bottom: 1.5rem;
        }

        .plan-price {
          margin-bottom: 0.5rem;
        }

        .price-currency {
          font-size: 1.5rem;
          font-weight: 600;
          vertical-align: top;
          color: var(--text-primary, #1a1a1a);
        }

        .price-amount {
          font-size: 3rem;
          font-weight: 700;
          line-height: 1;
          color: var(--text-primary, #1a1a1a);
        }

        .price-period {
          color: var(--text-secondary, #666);
          font-size: 1rem;
        }

        .price-free,
        .price-custom {
          font-size: 2.5rem;
          font-weight: 700;
          color: var(--text-primary, #1a1a1a);
        }

        .price-monthly-equiv {
          font-size: 0.85rem;
          color: var(--text-secondary, #666);
          margin-bottom: 1.5rem;
        }

        .feature-list {
          list-style: none;
          padding: 0;
          margin: 0 0 2rem 0;
          flex-grow: 1;
        }

        .feature-item {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          padding: 0.5rem 0;
          color: var(--text-primary, #1a1a1a);
          font-size: 0.9rem;
        }

        .feature-item :global(.check-icon) {
          width: 20px;
          height: 20px;
          flex-shrink: 0;
          stroke: #10B981;
        }

        .plan-cta {
          width: 100%;
          padding: 1rem;
          border-radius: 0.5rem;
          font-weight: 600;
          font-size: 1rem;
          cursor: pointer;
          transition: all 0.2s;
          border: none;
        }

        .plan-cta.primary {
          background: var(--primary-color);
          color: white;
        }

        .plan-cta.primary:hover {
          background: #e65a4f;
        }

        .plan-cta.secondary {
          background: var(--bg-secondary, #f5f5f5);
          color: var(--text-primary, #1a1a1a);
          border: 1px solid var(--border-color, #e5e5e5);
        }

        .plan-cta.secondary:hover {
          background: var(--bg-tertiary, #e5e5e5);
        }

        .plan-cta.disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .faq-section {
          max-width: 1000px;
          margin: 4rem auto 2rem;
          padding: 0 1rem;
        }

        .faq-section h2 {
          text-align: center;
          font-size: 2rem;
          margin-bottom: 2rem;
          color: var(--text-primary, #1a1a1a);
        }

        .faq-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 2rem;
        }

        .faq-item h3 {
          font-size: 1rem;
          font-weight: 600;
          margin-bottom: 0.5rem;
          color: var(--text-primary, #1a1a1a);
        }

        .faq-item p {
          color: var(--text-secondary, #666);
          font-size: 0.9rem;
          line-height: 1.6;
        }

        @media (max-width: 768px) {
          .pricing-grid {
            grid-template-columns: 1fr;
          }

          .faq-grid {
            grid-template-columns: 1fr;
          }

          .toggle-option {
            padding: 0.5rem 1rem;
            font-size: 0.9rem;
          }
        }
      `}</style>
    </div>
  );
}
