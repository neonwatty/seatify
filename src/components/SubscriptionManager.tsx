'use client';

import { useState } from 'react';
import { Link } from '@/lib/router-compat';
import { useSubscription } from '@/hooks/useSubscription';
import { openCustomerPortal } from '@/lib/stripe/client';

/**
 * Component for managing user subscription
 * Shows current plan, usage, and upgrade/manage options
 */
export function SubscriptionManager() {
  const { subscription, plan, limits, isLoading, isPro, isTeam, isEnterprise, isFree } = useSubscription();
  const [isPortalLoading, setIsPortalLoading] = useState(false);

  const handleManageSubscription = async () => {
    setIsPortalLoading(true);
    try {
      await openCustomerPortal();
    } catch (error) {
      console.error('Portal error:', error);
      alert('Failed to open subscription management. Please try again.');
    } finally {
      setIsPortalLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="subscription-manager loading">
        <div className="loading-spinner" />
        <span>Loading subscription...</span>

        <style jsx>{`
          .subscription-manager.loading {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            padding: 1rem;
            color: var(--text-secondary, #666);
          }

          .loading-spinner {
            width: 20px;
            height: 20px;
            border: 2px solid var(--border-color, #e5e5e5);
            border-top-color: var(--primary-color, #F97066);
            border-radius: 50%;
            animation: spin 1s linear infinite;
          }

          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  const planBadgeClass = isFree ? 'free' : isPro ? 'pro' : isTeam ? 'team' : 'enterprise';

  return (
    <div className="subscription-manager">
      <div className="subscription-header">
        <div className="plan-info">
          <span className={`plan-badge ${planBadgeClass}`}>
            {plan.charAt(0).toUpperCase() + plan.slice(1)}
          </span>
          <h3 className="plan-title">Your Plan</h3>
        </div>
      </div>

      <div className="subscription-details">
        <div className="detail-row">
          <span className="detail-label">Events</span>
          <span className="detail-value">
            {limits.maxEvents === -1 ? 'Unlimited' : `Up to ${limits.maxEvents}`}
          </span>
        </div>
        <div className="detail-row">
          <span className="detail-label">Guests per event</span>
          <span className="detail-value">
            {limits.maxGuestsPerEvent === -1 ? 'Unlimited' : `Up to ${limits.maxGuestsPerEvent}`}
          </span>
        </div>
        <div className="detail-row">
          <span className="detail-label">PDF branding</span>
          <span className="detail-value">
            {limits.hasWatermark ? 'Includes watermark' : 'No watermark'}
          </span>
        </div>
        {limits.hasCustomLogo && (
          <div className="detail-row">
            <span className="detail-label">Custom logo</span>
            <span className="detail-value">Available</span>
          </div>
        )}
        {subscription?.currentPeriodEnd && (
          <div className="detail-row">
            <span className="detail-label">Renews</span>
            <span className="detail-value">
              {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
            </span>
          </div>
        )}
      </div>

      <div className="subscription-actions">
        {isFree ? (
          <Link href="/pricing" className="action-button primary">
            Upgrade Plan
          </Link>
        ) : (
          <>
            <button
              className="action-button secondary"
              onClick={handleManageSubscription}
              disabled={isPortalLoading}
            >
              {isPortalLoading ? 'Loading...' : 'Manage Subscription'}
            </button>
            <Link href="/pricing" className="action-link">
              Compare Plans
            </Link>
          </>
        )}
      </div>

      <style jsx>{`
        .subscription-manager {
          background: var(--bg-card, white);
          border-radius: 0.75rem;
          padding: 1.5rem;
          border: 1px solid var(--border-color, #e5e5e5);
        }

        .subscription-header {
          margin-bottom: 1.25rem;
        }

        .plan-info {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .plan-badge {
          padding: 0.25rem 0.75rem;
          border-radius: 999px;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
        }

        .plan-badge.free {
          background: var(--bg-secondary, #f5f5f5);
          color: var(--text-secondary, #666);
        }

        .plan-badge.pro {
          background: #F97066;
          color: white;
        }

        .plan-badge.team {
          background: #3B82F6;
          color: white;
        }

        .plan-badge.enterprise {
          background: #8B5CF6;
          color: white;
        }

        .plan-title {
          font-size: 1.125rem;
          font-weight: 600;
          color: var(--text-primary, #1a1a1a);
          margin: 0;
        }

        .subscription-details {
          margin-bottom: 1.25rem;
        }

        .detail-row {
          display: flex;
          justify-content: space-between;
          padding: 0.5rem 0;
          border-bottom: 1px solid var(--border-color, #e5e5e5);
        }

        .detail-row:last-child {
          border-bottom: none;
        }

        .detail-label {
          color: var(--text-secondary, #666);
          font-size: 0.875rem;
        }

        .detail-value {
          color: var(--text-primary, #1a1a1a);
          font-weight: 500;
          font-size: 0.875rem;
        }

        .subscription-actions {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .action-button {
          padding: 0.75rem 1.25rem;
          border-radius: 0.5rem;
          font-weight: 600;
          font-size: 0.9rem;
          cursor: pointer;
          transition: all 0.2s;
          text-decoration: none;
          text-align: center;
          border: none;
        }

        .action-button.primary {
          background: #F97066;
          color: white;
        }

        .action-button.primary:hover {
          background: #e65a4f;
        }

        .action-button.secondary {
          background: var(--bg-secondary, #f5f5f5);
          color: var(--text-primary, #1a1a1a);
        }

        .action-button.secondary:hover {
          background: var(--bg-tertiary, #e5e5e5);
        }

        .action-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .action-link {
          text-align: center;
          color: var(--text-secondary, #666);
          font-size: 0.875rem;
          text-decoration: none;
        }

        .action-link:hover {
          color: #F97066;
          text-decoration: underline;
        }
      `}</style>
    </div>
  );
}

/**
 * A compact plan badge for showing current plan in headers/nav
 */
export function PlanBadge({ className = '' }: { className?: string }) {
  const { plan, isLoading } = useSubscription();

  if (isLoading || plan === 'free') {
    return null;
  }

  const badgeClass = plan === 'pro' ? 'pro' : plan === 'team' ? 'team' : 'enterprise';

  return (
    <span className={`plan-badge-small ${badgeClass} ${className}`}>
      {plan.toUpperCase()}

      <style jsx>{`
        .plan-badge-small {
          padding: 0.125rem 0.5rem;
          border-radius: 999px;
          font-size: 0.65rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .plan-badge-small.pro {
          background: #F97066;
          color: white;
        }

        .plan-badge-small.team {
          background: #3B82F6;
          color: white;
        }

        .plan-badge-small.enterprise {
          background: #8B5CF6;
          color: white;
        }
      `}</style>
    </span>
  );
}
