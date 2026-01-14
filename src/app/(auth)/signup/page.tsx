'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import '../login/auth.css';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Lazy initialize Supabase client to avoid pre-rendering issues
  const supabase = useMemo(() => {
    if (typeof window === 'undefined') return null;
    return createClient();
  }, []);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    if (!supabase) return;
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
  };

  const handleGoogleSignup = async () => {
    if (!supabase) return;
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="auth-page">
        {/* Brand Panel - visible on desktop */}
        <div className="auth-brand-panel">
          <div className="auth-brand-content">
            <div className="auth-brand-logo">Seatify</div>
            <h2 className="auth-brand-tagline">
              You're almost there!
            </h2>
            <p className="auth-brand-description">
              Just one more step to start creating beautiful seating arrangements
              for your events.
            </p>
          </div>
          <div className="auth-brand-decoration" />
          <div className="auth-brand-decoration-2" />
        </div>

        {/* Form Panel */}
        <div className="auth-form-panel">
          <div className="auth-container">
            <div className="auth-header">
              <div className="auth-success-icon">✓</div>
              <h1>Check your email</h1>
              <p>
                We've sent a confirmation link to <strong>{email}</strong>.
                Click the link to activate your account.
              </p>
            </div>
            <Link href="/login" className="auth-button primary">
              Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      {/* Brand Panel - visible on desktop */}
      <div className="auth-brand-panel">
        <div className="auth-brand-content">
          <div className="auth-brand-logo">Seatify</div>
          <h2 className="auth-brand-tagline">
            Start planning your perfect event
          </h2>
          <p className="auth-brand-description">
            Join thousands of event planners using Seatify to create stunning
            seating charts with ease. Free to get started.
          </p>
        </div>
        <div className="auth-brand-decoration" />
        <div className="auth-brand-decoration-2" />
      </div>

      {/* Form Panel */}
      <div className="auth-form-panel">
        <div className="auth-container">
          <div className="auth-header">
            <Link href="/" className="auth-logo">
              Seatify
            </Link>
            <h1>Create your account</h1>
            <p>Start planning your perfect seating arrangement</p>
          </div>

          <form onSubmit={handleSignup} className="auth-form">
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError(null);
                }}
                required
                autoComplete="email"
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                placeholder="Create a password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError(null);
                }}
                required
                autoComplete="new-password"
              />
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <input
                id="confirmPassword"
                type="password"
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (error) setError(null);
                }}
                required
                autoComplete="new-password"
              />
            </div>

            {error && <p className="auth-error">{error}</p>}

            <button type="submit" className="auth-button primary" disabled={loading}>
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <div className="auth-divider">
            <span>or</span>
          </div>

          <button
            onClick={handleGoogleSignup}
            className="auth-button google"
            disabled={loading}
          >
            <svg viewBox="0 0 24 24" width="20" height="20">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>

          <p className="auth-footer">
            Already have an account? <Link href="/login">Sign in</Link>
          </p>

          <div className="auth-demo-link">
            <Link href="/demo">
              Or try the demo without signing up
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
