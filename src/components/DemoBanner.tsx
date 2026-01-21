'use client';

import { useState } from 'react';
import { useStore } from '../store/useStore';
import { trackCTAClick } from '../utils/analytics';
import { DemoSignupModal } from './DemoSignupModal';
import { isDemoEvent } from '../lib/constants';
import './DemoBanner.css';

interface BannerContent {
  message: string;
  cta: string;
}

function getBannerContent(demoInteraction: {
  movedGuest: boolean;
  addedTable: boolean;
  ranOptimizer: boolean;
  viewedRelationships: boolean;
  addedConstraint: boolean;
  actionsCount: number;
}): BannerContent {
  // High engagement (5+ actions)
  if (demoInteraction.actionsCount >= 5) {
    return {
      message: "You've built something great! Sign up to keep it.",
      cta: 'Create Free Account',
    };
  }

  // After running optimizer
  if (demoInteraction.ranOptimizer) {
    return {
      message: 'You just optimized seating like a pro!',
      cta: 'Save Your Layout',
    };
  }

  // After first meaningful interaction
  if (demoInteraction.movedGuest || demoInteraction.addedTable || demoInteraction.addedConstraint) {
    return {
      message: 'Nice work! Create your own seating chart when ready.',
      cta: 'Start Planning Free',
    };
  }

  // Initial state - encourage interaction
  return {
    message: 'Exploring the demo — try dragging guests to tables!',
    cta: 'Sign up free',
  };
}

export function DemoBanner() {
  const [showSignupModal, setShowSignupModal] = useState(false);
  const { isDemo, demoInteraction, event } = useStore();

  // Only show banner if both isDemo is true AND we're viewing the actual demo event
  // This prevents the banner from showing on migrated events due to stale store state
  if (!isDemo || !event || !isDemoEvent(event.id)) return null;

  const { message, cta } = getBannerContent(demoInteraction);

  const handleCTAClick = () => {
    // Track which CTA variant was clicked
    const variant = demoInteraction.actionsCount >= 5 ? 'high_engagement' :
                   demoInteraction.ranOptimizer ? 'post_optimizer' :
                   (demoInteraction.movedGuest || demoInteraction.addedTable) ? 'first_interaction' :
                   'initial';
    trackCTAClick(`demo_banner_${variant}`);
    setShowSignupModal(true);
  };

  return (
    <>
      <div className="demo-banner">
        <div className="demo-banner-content">
          <span className="demo-banner-text">{message}</span>
          <button
            className="demo-banner-cta"
            onClick={handleCTAClick}
          >
            {cta}
          </button>
        </div>
      </div>
      <DemoSignupModal
        isOpen={showSignupModal}
        onClose={() => setShowSignupModal(false)}
        onSuccess={() => setShowSignupModal(false)}
        feature="save_work"
      />
    </>
  );
}
