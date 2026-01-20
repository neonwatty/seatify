'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useStore } from '../store/useStore';
import './DemoSignupModal.css';

export type GatedFeature =
  | 'pdf_table_cards'
  | 'pdf_place_cards'
  | 'share_link'
  | 'share_file'
  | 'qr_codes'
  | 'survey_builder';

interface DemoSignupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  feature: GatedFeature;
}

const FEATURE_MESSAGES: Record<GatedFeature, { title: string; description: string; cta: string }> = {
  pdf_table_cards: {
    title: 'Download Table Cards',
    description: 'Create a free account to download your table cards PDF.',
    cta: 'Sign up to download',
  },
  pdf_place_cards: {
    title: 'Download Place Cards',
    description: 'Create a free account to download your place cards PDF.',
    cta: 'Sign up to download',
  },
  share_link: {
    title: 'Share Your Seating Chart',
    description: 'Create a free account to get a shareable link for your seating chart.',
    cta: 'Sign up to share',
  },
  share_file: {
    title: 'Download Seating Data',
    description: 'Create a free account to download your seating data file.',
    cta: 'Sign up to download',
  },
  qr_codes: {
    title: 'Print QR Codes',
    description: 'Create a free account to print QR codes for your tables.',
    cta: 'Sign up to print',
  },
  survey_builder: {
    title: 'Create Guest Surveys',
    description: 'Create a free account to build surveys and collect guest responses.',
    cta: 'Sign up to create surveys',
  },
};

type ModalState = 'form' | 'loading' | 'success' | 'verify_email';

export function DemoSignupModal({ isOpen, onClose, onSuccess: _onSuccess, feature }: DemoSignupModalProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [modalState, setModalState] = useState<ModalState>('form');
  const emailInputRef = useRef<HTMLInputElement>(null);

  const { event } = useStore();

  // Lazy initialize Supabase client
  const supabase = useMemo(() => {
    if (typeof window === 'undefined') return null;
    return createClient();
  }, []);

  const messages = FEATURE_MESSAGES[feature];

  // Auto-focus email input on mount
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        emailInputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Track previous open state to detect close transition
  const wasOpenRef = useRef(isOpen);
  useEffect(() => {
    // Only reset form when transitioning from open to closed
    if (wasOpenRef.current && !isOpen) {
      // Use setTimeout to avoid synchronous setState in effect
      const timer = setTimeout(() => {
        setEmail('');
        setPassword('');
        setConfirmPassword('');
        setError(null);
        setModalState('form');
      }, 0);
      wasOpenRef.current = isOpen;
      return () => clearTimeout(timer);
    }
    wasOpenRef.current = isOpen;
  }, [isOpen]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (!supabase) {
      setError('Unable to connect. Please try again.');
      return;
    }

    setModalState('loading');

    try {
      // Store demo data for migration after email verification
      if (event) {
        sessionStorage.setItem('seatify_demo_migration', JSON.stringify({
          event,
          feature,
          timestamp: Date.now(),
        }));
      }

      const { error: signupError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?migrate=demo&feature=${feature}`,
        },
      });

      if (signupError) {
        setError(signupError.message);
        setModalState('form');
        return;
      }

      // Show email verification message
      setModalState('verify_email');
    } catch (err) {
      console.error('Signup failed:', err);
      setError('Something went wrong. Please try again.');
      setModalState('form');
    }
  };

  const handleGoogleSignup = async () => {
    if (!supabase) return;

    setModalState('loading');
    setError(null);

    try {
      // Store demo data for migration after OAuth
      if (event) {
        sessionStorage.setItem('seatify_demo_migration', JSON.stringify({
          event,
          feature,
          timestamp: Date.now(),
        }));
      }

      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?migrate=demo&feature=${feature}`,
        },
      });

      if (oauthError) {
        setError(oauthError.message);
        setModalState('form');
      }
    } catch (err) {
      console.error('Google signup failed:', err);
      setError('Something went wrong. Please try again.');
      setModalState('form');
    }
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && modalState !== 'loading') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="demo-signup-modal-overlay" onClick={handleOverlayClick}>
      <div className="demo-signup-modal" onClick={(e) => e.stopPropagation()}>
        {modalState === 'verify_email' ? (
          <div className="demo-signup-success">
            <div className="success-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
              </svg>
            </div>
            <h2>Check your email</h2>
            <p>
              We&apos;ve sent a confirmation link to <strong>{email}</strong>.
              <br />
              Click the link to activate your account and your demo work will be saved automatically.
            </p>
            <button className="demo-signup-btn primary" onClick={onClose}>
              Got it
            </button>
          </div>
        ) : modalState === 'success' ? (
          <div className="demo-signup-success">
            <div className="success-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h2>Account created!</h2>
            <p>Your demo work has been saved. Completing your action now...</p>
          </div>
        ) : (
          <>
            <div className="demo-signup-header">
              <div className="demo-signup-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </div>
              <h2>{messages.title}</h2>
              <p>{messages.description}</p>
              <button
                className="demo-signup-close"
                onClick={onClose}
                aria-label="Close modal"
                disabled={modalState === 'loading'}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSignup} className="demo-signup-form">
              <div className="demo-signup-benefits">
                <div className="benefit-item">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                  <span>Your demo work will be saved</span>
                </div>
                <div className="benefit-item">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                  <span>Access from any device</span>
                </div>
                <div className="benefit-item">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                  <span>Free forever</span>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="demo-signup-email">Email</label>
                <input
                  id="demo-signup-email"
                  ref={emailInputRef}
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="you@example.com"
                  required
                  disabled={modalState === 'loading'}
                  autoComplete="email"
                />
              </div>

              <div className="form-group">
                <label htmlFor="demo-signup-password">Password</label>
                <input
                  id="demo-signup-password"
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="At least 6 characters"
                  required
                  disabled={modalState === 'loading'}
                  autoComplete="new-password"
                />
              </div>

              <div className="form-group">
                <label htmlFor="demo-signup-confirm">Confirm Password</label>
                <input
                  id="demo-signup-confirm"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="Confirm your password"
                  required
                  disabled={modalState === 'loading'}
                  autoComplete="new-password"
                />
              </div>

              {error && <p className="demo-signup-error">{error}</p>}

              <button
                type="submit"
                className="demo-signup-btn primary"
                disabled={modalState === 'loading'}
              >
                {modalState === 'loading' ? (
                  <>
                    <span className="spinner" />
                    Creating account...
                  </>
                ) : (
                  messages.cta
                )}
              </button>
            </form>

            <div className="demo-signup-divider">
              <span>or</span>
            </div>

            <button
              onClick={handleGoogleSignup}
              className="demo-signup-btn google"
              disabled={modalState === 'loading'}
            >
              <svg viewBox="0 0 24 24" width="20" height="20">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </button>

            <p className="demo-signup-footer">
              Already have an account?{' '}
              <a href="/login" onClick={(e) => {
                e.preventDefault();
                window.location.href = '/login';
              }}>
                Sign in
              </a>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
