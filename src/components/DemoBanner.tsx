'use client';

import { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { trackCTAClick } from '../utils/analytics';
import { DemoSignupModal } from './DemoSignupModal';
import { isDemoEvent } from '../lib/constants';
import { createClient } from '../lib/supabase/client';
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
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const { isDemo, demoInteraction, event } = useStore();

  // Check authentication status
  useEffect(() => {
    const supabase = createClient();

    // Check current session
    supabase.auth.getUser().then(({ data: { user } }) => {
      setIsAuthenticated(!!user);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session?.user);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Only show banner if:
  // 1. isDemo is true AND we're viewing the actual demo event
  // 2. User is NOT authenticated
  // This prevents the banner from showing to logged-in users
  if (!isDemo || !event || !isDemoEvent(event.id)) return null;
  if (isAuthenticated === null) return null; // Still loading auth state
  if (isAuthenticated) return null; // Hide for logged-in users

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
