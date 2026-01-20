'use client';

import { useRouter } from 'next/navigation';
import { DEMO_EVENT_ID } from '@/lib/constants';
import { trackCTAClick, trackFunnelStep } from '@/utils/analytics';
import './LandingChoiceModal.css';

interface LandingChoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Modal that appears when user clicks "Start Planning Free" on landing page.
 * Offers two paths: try the demo first or create an account.
 */
export function LandingChoiceModal({ isOpen, onClose }: LandingChoiceModalProps) {
  const router = useRouter();

  if (!isOpen) return null;

  const handleTryDemo = () => {
    trackCTAClick('landing_choice_demo');
    trackFunnelStep('demo_view');
    router.push(`/dashboard/events/${DEMO_EVENT_ID}/canvas`);
    onClose();
  };

  const handleCreateAccount = () => {
    trackCTAClick('landing_choice_signup');
    trackFunnelStep('cta_click');
    router.push('/signup');
    onClose();
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="landing-choice-overlay" onClick={handleBackdropClick}>
      <div className="landing-choice-modal">
        <button className="landing-choice-close" onClick={onClose} aria-label="Close">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <h2 className="landing-choice-title">How would you like to start?</h2>
        <p className="landing-choice-subtitle">
          Choose what works best for you
        </p>

        <div className="landing-choice-options">
          <button className="landing-choice-option landing-choice-option--demo" onClick={handleTryDemo}>
            <div className="landing-choice-option-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="12" r="10" />
                <polygon points="10 8 16 12 10 16 10 8" fill="currentColor" />
              </svg>
            </div>
            <div className="landing-choice-option-content">
              <span className="landing-choice-option-title">Try Demo First</span>
              <span className="landing-choice-option-desc">
                Explore with sample data, no signup required
              </span>
            </div>
            <div className="landing-choice-option-badge">Recommended</div>
          </button>

          <button className="landing-choice-option landing-choice-option--signup" onClick={handleCreateAccount}>
            <div className="landing-choice-option-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <div className="landing-choice-option-content">
              <span className="landing-choice-option-title">Create My Event</span>
              <span className="landing-choice-option-desc">
                Sign up free and start from scratch
              </span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
