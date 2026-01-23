'use client';

import { useState } from 'react';
import { Link } from '@/lib/router-compat';
import { PRICING_TIERS, type SubscriptionPlan } from '@/types/subscription';
import { startCheckout, STRIPE_PRICES } from '@/lib/stripe/client';

interface UpgradePromptProps {
  /** Type of limit reached */
  limitType: 'events' | 'guests';
  /** Current count */
  current: number;
  /** Maximum allowed for current plan */
  max: number;
  /** Current plan */
  plan: SubscriptionPlan;
  /** Callback when prompt is dismissed */
  onDismiss?: () => void;
  /** Whether to show as a modal */
  modal?: boolean;
}

export function UpgradePrompt({
  limitType,
  current,
  max,
  plan,
  onDismiss,
  modal = false,
}: UpgradePromptProps) {
  const [isLoading, setIsLoading] = useState(false);

  const proTier = PRICING_TIERS.find(t => t.plan === 'pro')!;

  const handleUpgrade = async () => {
    setIsLoading(true);
    try {
      const priceId = STRIPE_PRICES.pro.yearly;
      if (priceId) {
        await startCheckout(priceId);
      } else {
        // Fallback to pricing page if no price ID configured
        window.location.href = '/pricing';
      }
    } catch (error) {
      console.error('Checkout error:', error);
      window.location.href = '/pricing';
    } finally {
      setIsLoading(false);
    }
  };

  const title = limitType === 'events'
    ? 'Event Limit Reached'
    : 'Guest Limit Reached';

  const description = limitType === 'events'
    ? `You've created ${current} of ${max} events. Upgrade to Pro for unlimited events.`
    : `This event has ${current} of ${max} guests. Upgrade to Pro for unlimited guests.`;

  const content = (
    <div className="upgrade-prompt-content">
      <div className="upgrade-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <path d="M12 8v4" />
          <path d="M12 16h.01" />
        </svg>
      </div>

      <h3 className="upgrade-title">{title}</h3>
      <p className="upgrade-description">{description}</p>

      <div className="upgrade-plan-preview">
        <div className="plan-name">
          <span className="plan-label">Seatify Pro</span>
          <span className="plan-price">${proTier.yearlyPrice}/year</span>
        </div>
        <ul className="plan-features">
          <li>Unlimited events</li>
          <li>Unlimited guests</li>
          <li>Remove watermarks</li>
          <li>Custom logo on PDFs</li>
        </ul>
      </div>

      <div className="upgrade-actions">
        <button
          className="upgrade-button primary"
          onClick={handleUpgrade}
          disabled={isLoading}
        >
          {isLoading ? 'Loading...' : 'Upgrade to Pro'}
        </button>
        <Link href="/pricing" className="upgrade-button secondary">
          See All Plans
        </Link>
        {onDismiss && (
          <button className="upgrade-dismiss" onClick={onDismiss}>
            Not now
          </button>
        )}
      </div>

      <style jsx>{`
        .upgrade-prompt-content {
          text-align: center;
          max-width: 400px;
          margin: 0 auto;
        }

        .upgrade-icon {
          width: 48px;
          height: 48px;
          margin: 0 auto 1rem;
          color: #F97066;
        }

        .upgrade-icon svg {
          width: 100%;
          height: 100%;
        }

        .upgrade-title {
          font-size: 1.5rem;
          font-weight: 700;
          margin-bottom: 0.5rem;
          color: var(--text-primary, #1a1a1a);
        }

        .upgrade-description {
          color: var(--text-secondary, #666);
          margin-bottom: 1.5rem;
          line-height: 1.5;
        }

        .upgrade-plan-preview {
          background: var(--bg-secondary, #f5f5f5);
          border-radius: 0.75rem;
          padding: 1.25rem;
          margin-bottom: 1.5rem;
          text-align: left;
        }

        .plan-name {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }

        .plan-label {
          font-weight: 600;
          color: var(--text-primary, #1a1a1a);
        }

        .plan-price {
          color: #F97066;
          font-weight: 700;
        }

        .plan-features {
          list-style: none;
          padding: 0;
          margin: 0;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.5rem;
        }

        .plan-features li {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.875rem;
          color: var(--text-primary, #1a1a1a);
        }

        .plan-features li::before {
          content: '✓';
          color: #10B981;
          font-weight: bold;
        }

        .upgrade-actions {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .upgrade-button {
          padding: 0.875rem 1.5rem;
          border-radius: 0.5rem;
          font-weight: 600;
          font-size: 1rem;
          cursor: pointer;
          transition: all 0.2s;
          text-decoration: none;
          text-align: center;
          border: none;
        }

        .upgrade-button.primary {
          background: #F97066;
          color: white;
        }

        .upgrade-button.primary:hover {
          background: #e65a4f;
        }

        .upgrade-button.primary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .upgrade-button.secondary {
          background: transparent;
          color: var(--text-primary, #1a1a1a);
          border: 1px solid var(--border-color, #e5e5e5);
        }

        .upgrade-button.secondary:hover {
          background: var(--bg-secondary, #f5f5f5);
        }

        .upgrade-dismiss {
          background: none;
          border: none;
          color: var(--text-secondary, #666);
          cursor: pointer;
          font-size: 0.875rem;
          padding: 0.5rem;
        }

        .upgrade-dismiss:hover {
          color: var(--text-primary, #1a1a1a);
        }
      `}</style>
    </div>
  );

  if (modal) {
    return (
      <div className="upgrade-modal-backdrop" onClick={onDismiss}>
        <div className="upgrade-modal" onClick={e => e.stopPropagation()}>
          {content}
        </div>

        <style jsx>{`
          .upgrade-modal-backdrop {
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
            padding: 1rem;
          }

          .upgrade-modal {
            background: var(--bg-card, white);
            border-radius: 1rem;
            padding: 2rem;
            max-width: 450px;
            width: 100%;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="upgrade-prompt-inline">
      {content}

      <style jsx>{`
        .upgrade-prompt-inline {
          background: var(--bg-card, white);
          border-radius: 1rem;
          padding: 2rem;
          border: 1px solid var(--border-color, #e5e5e5);
        }
      `}</style>
    </div>
  );
}

/**
 * A smaller inline banner for upgrade prompts
 */
export function UpgradeBanner({
  message,
  onDismiss,
}: {
  message: string;
  onDismiss?: () => void;
}) {
  return (
    <div className="upgrade-banner">
      <span className="banner-icon">✨</span>
      <span className="banner-message">{message}</span>
      <Link href="/pricing" className="banner-link">
        Upgrade
      </Link>
      {onDismiss && (
        <button className="banner-dismiss" onClick={onDismiss} aria-label="Dismiss">
          ×
        </button>
      )}

      <style jsx>{`
        .upgrade-banner {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          background: linear-gradient(90deg, #FEF3F2 0%, #FFFBFA 100%);
          border: 1px solid #FECDC9;
          border-radius: 0.5rem;
          padding: 0.75rem 1rem;
          font-size: 0.875rem;
        }

        .banner-icon {
          flex-shrink: 0;
        }

        .banner-message {
          flex-grow: 1;
          color: var(--text-primary, #1a1a1a);
        }

        .banner-link {
          color: #F97066;
          font-weight: 600;
          text-decoration: none;
          white-space: nowrap;
        }

        .banner-link:hover {
          text-decoration: underline;
        }

        .banner-dismiss {
          background: none;
          border: none;
          color: var(--text-secondary, #666);
          cursor: pointer;
          font-size: 1.25rem;
          line-height: 1;
          padding: 0;
        }

        .banner-dismiss:hover {
          color: var(--text-primary, #1a1a1a);
        }
      `}</style>
    </div>
  );
}
