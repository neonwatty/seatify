'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { updateUserPreference } from '@/actions/profilePreferences';
import { useStore } from '@/store/useStore';
import type { SubscriptionPlan, PlanLimits } from '@/types/subscription';
import './profile.css';

interface ProfileClientProps {
  user: {
    id: string;
    email: string;
    createdAt: string;
  };
  subscription: {
    plan: SubscriptionPlan;
    limits: PlanLimits;
  };
  profile: {
    theme: 'light' | 'dark' | 'system';
    customLogoUrl: string | null;
  };
  stats: {
    eventCount: number;
  };
}

export function ProfileClient({ user, subscription, profile, stats }: ProfileClientProps) {
  const router = useRouter();
  const supabase = createClient();
  const { theme, cycleTheme } = useStore();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getThemeLabel = () => {
    switch (theme) {
      case 'light': return 'Light';
      case 'dark': return 'Dark';
      default: return 'System';
    }
  };

  const getThemeIcon = () => {
    switch (theme) {
      case 'light': return '\u2600'; // Sun
      case 'dark': return '\u263D'; // Moon
      default: return '\u2699'; // Gear
    }
  };

  const handleThemeChange = async () => {
    cycleTheme();
    // Save to database
    const newTheme = theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light';
    await updateUserPreference('theme', newTheme);
  };

  return (
    <div className="profile-layout">
      <header className="profile-header">
        <Link href="/dashboard" className="back-link">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Back to Events
        </Link>
        <h1>Profile Settings</h1>
      </header>

      <main className="profile-main">
        {/* Account Info */}
        <section className="profile-section">
          <h2>Account</h2>
          <div className="profile-card">
            <div className="profile-info-row">
              <span className="info-label">Email</span>
              <span className="info-value">{user.email}</span>
            </div>
            <div className="profile-info-row">
              <span className="info-label">Member since</span>
              <span className="info-value">{formatDate(user.createdAt)}</span>
            </div>
            <div className="profile-info-row">
              <span className="info-label">Events created</span>
              <span className="info-value">{stats.eventCount}</span>
            </div>
          </div>
        </section>

        {/* Subscription */}
        <section className="profile-section">
          <h2>Subscription</h2>
          <div className="profile-card subscription-card">
            <div className="subscription-header">
              <div className="plan-info">
                <span className={`plan-badge ${subscription.plan}`}>
                  {subscription.plan === 'pro' ? 'Pro' : 'Free'}
                </span>
                <span className="plan-description">
                  {subscription.plan === 'pro'
                    ? 'Full access to all features'
                    : 'Basic features with limits'}
                </span>
              </div>
              {subscription.plan === 'free' && (
                <Link href="/pricing" className="upgrade-btn">
                  Upgrade to Pro
                </Link>
              )}
            </div>
            <div className="limits-grid">
              <div className="limit-item">
                <span className="limit-value">
                  {subscription.limits.maxEvents === -1 ? 'Unlimited' : subscription.limits.maxEvents}
                </span>
                <span className="limit-label">Events</span>
              </div>
              <div className="limit-item">
                <span className="limit-value">
                  {subscription.limits.maxGuestsPerEvent === -1 ? 'Unlimited' : subscription.limits.maxGuestsPerEvent}
                </span>
                <span className="limit-label">Guests/Event</span>
              </div>
              <div className="limit-item">
                <span className="limit-value">
                  {subscription.limits.hasCustomLogo ? 'Yes' : 'No'}
                </span>
                <span className="limit-label">Custom Logo</span>
              </div>
              <div className="limit-item">
                <span className="limit-value">
                  {subscription.limits.canRemoveBranding ? 'Yes' : 'No'}
                </span>
                <span className="limit-label">No Watermark</span>
              </div>
            </div>
          </div>
        </section>

        {/* Preferences */}
        <section className="profile-section">
          <h2>Preferences</h2>
          <div className="profile-card">
            <div className="preference-row">
              <div className="preference-info">
                <span className="preference-label">Theme</span>
                <span className="preference-description">Choose your preferred color scheme</span>
              </div>
              <button className="theme-toggle" onClick={handleThemeChange}>
                <span className="theme-icon">{getThemeIcon()}</span>
                <span className="theme-label">{getThemeLabel()}</span>
              </button>
            </div>
          </div>
        </section>

        {/* Danger Zone */}
        <section className="profile-section danger-zone">
          <h2>Account Actions</h2>
          <div className="profile-card">
            <button
              className="sign-out-btn"
              onClick={handleSignOut}
              disabled={isSigningOut}
            >
              {isSigningOut ? 'Signing out...' : 'Sign Out'}
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
