import { useState, useRef, useEffect } from 'react';
import { submitEmail } from '../utils/formspree';
import { showToast } from './toastStore';
import { trackEmailSignupConversion, setUserProperties } from '../utils/analytics';
import './EmailCaptureModal.css';

interface EmailCaptureModalProps {
  onClose: () => void;
  onSuccess?: () => void;
  source?: 'landing' | 'value_moment' | 'export_prompt';
}

type ModalState = 'form' | 'loading' | 'success';

export function EmailCaptureModal({ onClose, onSuccess, source = 'landing' }: EmailCaptureModalProps) {
  const [email, setEmail] = useState('');
  const [modalState, setModalState] = useState<ModalState>('form');
  const emailInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus email input on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      emailInputRef.current?.focus();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // Auto-close after success and notify parent
  useEffect(() => {
    if (modalState === 'success') {
      onSuccess?.();
      const timer = setTimeout(() => {
        onClose();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [modalState, onClose, onSuccess]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) return;

    setModalState('loading');

    try {
      // Get UTM params from sessionStorage if available
      const utmParamsStr = sessionStorage.getItem('utm_params');
      const utmParams = utmParamsStr ? JSON.parse(utmParamsStr) : {};

      await submitEmail(email, {
        ...utmParams,
        capture_source: source,
      });

      // Track successful email signup (GA4 + Google Ads conversion)
      trackEmailSignupConversion(source);
      setUserProperties({ hasSubscribed: true });
      setModalState('success');
    } catch (error) {
      console.error('Email submission failed:', error);
      showToast('Failed to subscribe. Please try again.', 'error');
      setModalState('form');
    }
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="email-capture-modal-overlay" onClick={handleOverlayClick}>
      <div className="email-capture-modal" onClick={(e) => e.stopPropagation()}>
        {modalState === 'success' ? (
          <div className="success-state">
            <div className="success-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h2>You're subscribed!</h2>
            <p>Thanks! We'll keep you updated on new features.</p>
          </div>
        ) : (
          <>
            <div className="modal-header">
              <h2>Get Updates</h2>
              <button
                className="close-btn"
                onClick={onClose}
                aria-label="Close modal"
                disabled={modalState === 'loading'}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <p className="modal-description">
                We'll email you when we ship something new. No spam, unsubscribe anytime.
              </p>

              <div className="form-row">
                <label htmlFor="email-capture-input">Email Address</label>
                <input
                  id="email-capture-input"
                  ref={emailInputRef}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  disabled={modalState === 'loading'}
                  autoComplete="email"
                />
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={onClose}
                  disabled={modalState === 'loading'}
                >
                  Maybe Later
                </button>
                <button
                  type="submit"
                  className="btn-submit"
                  disabled={modalState === 'loading'}
                >
                  {modalState === 'loading' ? (
                    <>
                      <span className="spinner" />
                      Subscribing...
                    </>
                  ) : (
                    'Subscribe'
                  )}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
