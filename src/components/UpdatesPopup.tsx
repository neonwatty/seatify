'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { version } from '../../package.json';
import updates from '../updates.json';
import { EmailCaptureModal } from './EmailCaptureModal';
import {
  shouldShowEmailCapture,
  markAsSubscribed,
  trackDismissal,
} from '../utils/emailCaptureManager';
import './UpdatesPopup.css';

interface UpdatesPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

export function UpdatesPopup({ isOpen, onClose }: UpdatesPopupProps) {
  const [showEmailCapture, setShowEmailCapture] = useState(false);

  // Check if user has already subscribed (don't show link if so)
  const canShowEmailLink = shouldShowEmailCapture('guestMilestone') ||
                           shouldShowEmailCapture('optimizerSuccess') ||
                           shouldShowEmailCapture('exportAttempt');

  const handleEmailCaptureClose = (subscribed = false) => {
    if (subscribed) {
      markAsSubscribed();
    } else {
      trackDismissal();
    }
    setShowEmailCapture(false);
  };

  if (!isOpen) return null;

  // Use portal to render at document body level for proper centering
  return createPortal(
    <>
      <div className="updates-overlay" onClick={onClose}>
        <div className="updates-popup" onClick={(e) => e.stopPropagation()}>
          <div className="updates-header">
            <h2>What&apos;s New</h2>
            <button className="updates-close" onClick={onClose} aria-label="Close">
              ×
            </button>
          </div>
          <div className="updates-content">
            {updates.map((update) => (
              <div key={update.version} className="update-section">
                <span className="update-version">v{update.version}</span>
                <ul className="update-list">
                  {update.highlights.map((highlight, index) => (
                    <li key={index}>{highlight}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="updates-footer">
            <span className="current-version">Current version: v{version}</span>
            {canShowEmailLink && (
              <button
                className="updates-subscribe-link"
                onClick={() => setShowEmailCapture(true)}
              >
                Get notified of new updates
              </button>
            )}
          </div>
        </div>
      </div>
      {showEmailCapture && (
        <EmailCaptureModal
          onClose={() => handleEmailCaptureClose(false)}
          onSuccess={() => handleEmailCaptureClose(true)}
          source="value_moment"
        />
      )}
    </>,
    document.body
  );
}

interface UpdatesButtonProps {
  variant?: 'landing' | 'header' | 'mobile-menu';
  onMenuClick?: () => void;
}

export function UpdatesButton({ variant = 'header', onMenuClick }: UpdatesButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleClick = () => {
    setIsOpen(true);
    if (onMenuClick) {
      onMenuClick();
    }
  };

  if (variant === 'mobile-menu') {
    return (
      <>
        <button
          className="mobile-header-menu-item"
          onClick={handleClick}
          role="menuitem"
        >
          <span className="mobile-header-menu-icon">
            <svg viewBox="0 0 24 24" width="18" height="18">
              <path fill="currentColor" d="M9.5 14.25l-5.5 5.5v-3.5l3.25-3.25L4 9.75v-3.5l5.5 5.5 5.5-5.5v3.5l-3.25 3.25L15 16.75v3.5l-5.5-5.5z M19 9l1.25-2.75L23 5l-2.75-1.25L19 1l-1.25 2.75L15 5l2.75 1.25L19 9z"/>
            </svg>
          </span>
          <span>What&apos;s New</span>
        </button>
        <UpdatesPopup isOpen={isOpen} onClose={() => setIsOpen(false)} />
      </>
    );
  }

  return (
    <>
      <button
        className={`updates-btn updates-btn--${variant}`}
        onClick={handleClick}
        title="What's New"
      >
        {variant === 'landing' ? "What's New" : '✨'}
      </button>
      <UpdatesPopup isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
