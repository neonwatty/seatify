import { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useParams } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { version } from '../../package.json';
import { UpdatesButton } from './UpdatesPopup';
import { EmailCaptureModal } from './EmailCaptureModal';
import { ShareLinkModal } from './ShareLinkModal';
import {
  shouldShowEmailCapture,
  markAsSubscribed,
  trackDismissal,
} from '../utils/emailCaptureManager';
import { trackShareModalOpened } from '../utils/analytics';
import { getToursByCategory, type TourId } from '../data/tourRegistry';
import './Header.css';

interface HeaderProps {
  onLogoClick?: () => void;
  onShowHelp?: () => void;
  onStartTour?: (tourId: TourId) => void;
}

export function Header({ onLogoClick, onShowHelp, onStartTour }: HeaderProps) {
  const navigate = useNavigate();
  const { eventId } = useParams<{ eventId?: string }>();
  const { event, setEventName, theme, cycleTheme, currentEventId, isTourComplete } = useStore();
  const [showEmailCapture, setShowEmailCapture] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showLearnDropdown, setShowLearnDropdown] = useState(false);
  const learnDropdownRef = useRef<HTMLDivElement>(null);

  // Get tours by category
  const gettingStartedTours = getToursByCategory('getting-started');
  const featureTours = getToursByCategory('features');

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (learnDropdownRef.current && !learnDropdownRef.current.contains(event.target as Node)) {
        setShowLearnDropdown(false);
      }
    }
    if (showLearnDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showLearnDropdown]);

  // Check if user has already subscribed (don't show button if so)
  const canShowEmailButton = shouldShowEmailCapture('guestMilestone') ||
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

  const handleOpenShare = () => {
    trackShareModalOpened('header');
    setShowShareModal(true);
  };

  // Check if we're inside an event (has eventId in URL)
  const isInsideEvent = !!eventId || (currentEventId && window.location.pathname.includes('/events/'));

  // Check if event has content worth sharing
  const canShare = isInsideEvent && (event.guests.length > 0 || event.tables.length > 0);

  // Apply theme to document
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'light') {
      root.setAttribute('data-theme', 'light');
    } else if (theme === 'dark') {
      root.setAttribute('data-theme', 'dark');
    } else {
      // System mode - remove attribute so media query takes over
      root.removeAttribute('data-theme');
    }
  }, [theme]);

  const getThemeIcon = () => {
    switch (theme) {
      case 'light': return '\u2600'; // Sun
      case 'dark': return '\u263D'; // Moon
      default: return '\u2699'; // Gear (system)
    }
  };

  const getThemeTitle = () => {
    switch (theme) {
      case 'light': return 'Light mode (click for dark)';
      case 'dark': return 'Dark mode (click for system)';
      default: return 'System theme (click for light)';
    }
  };

  return (
    <header className="header">
      <div className="header-left">
        {isInsideEvent && (
          <button
            className="back-to-events-btn"
            onClick={() => navigate('/events')}
            title="Back to events"
          >
            <span className="back-arrow">&larr;</span>
            <span className="back-text">Events</span>
          </button>
        )}
        <h1
          className="logo"
          onClick={onLogoClick}
          style={{ cursor: onLogoClick ? 'pointer' : 'default' }}
          title="Back to home"
        >
          <span className="logo-seat">Seat</span>
          <span className="logo-ify">ify</span>
        </h1>
        <span className="version-badge">v{version}</span>
        <UpdatesButton variant="header" />
        {canShowEmailButton && (
          <button
            className="subscribe-btn"
            onClick={() => setShowEmailCapture(true)}
            title="Get notified of updates"
          >
            Subscribe
          </button>
        )}
        {onStartTour && (
          <div className="learn-dropdown-container" ref={learnDropdownRef}>
            <button
              className="learn-btn"
              onClick={() => setShowLearnDropdown(!showLearnDropdown)}
              title="Take tours to learn Seatify"
            >
              Learn ▾
            </button>
            {showLearnDropdown && (
              <div className="learn-dropdown">
                {gettingStartedTours.map(tour => (
                  <button
                    key={tour.id}
                    className={`learn-dropdown-item ${isTourComplete(tour.id) ? 'completed' : ''}`}
                    onClick={() => {
                      setShowLearnDropdown(false);
                      onStartTour(tour.id);
                    }}
                  >
                    <span className="tour-icon">{tour.icon}</span>
                    <span className="tour-info">
                      <span className="tour-title">{tour.title}</span>
                      <span className="tour-time">{tour.estimatedTime}</span>
                    </span>
                    {isTourComplete(tour.id) && <span className="tour-check">✓</span>}
                  </button>
                ))}
                {featureTours.length > 0 && (
                  <>
                    <div className="learn-dropdown-divider" />
                    <div className="learn-dropdown-section-title">Feature Tours</div>
                    {featureTours.map(tour => (
                      <button
                        key={tour.id}
                        className={`learn-dropdown-item ${isTourComplete(tour.id) ? 'completed' : ''}`}
                        onClick={() => {
                          setShowLearnDropdown(false);
                          onStartTour(tour.id);
                        }}
                      >
                        <span className="tour-icon">{tour.icon}</span>
                        <span className="tour-info">
                          <span className="tour-title">{tour.title}</span>
                          <span className="tour-time">{tour.estimatedTime}</span>
                        </span>
                        {isTourComplete(tour.id) && <span className="tour-check">✓</span>}
                      </button>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
        )}
        {onShowHelp && (
          <button
            className="help-btn"
            onClick={onShowHelp}
            title="Keyboard Shortcuts (?)"
          >
            ?
          </button>
        )}
        {canShare && (
          <button
            className="share-btn"
            onClick={handleOpenShare}
            title="Share seating chart"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
              <polyline points="16 6 12 2 8 6" />
              <line x1="12" y1="2" x2="12" y2="15" />
            </svg>
            <span className="share-btn-text">Share</span>
          </button>
        )}
        <button
          className="theme-btn"
          onClick={cycleTheme}
          title={getThemeTitle()}
        >
          {getThemeIcon()}
        </button>
        {isInsideEvent && (
          <div className="event-info">
            <input
              type="text"
              value={event.name}
              onChange={(e) => setEventName(e.target.value)}
              className="event-name-input"
            />
          </div>
        )}
      </div>
      {showEmailCapture && createPortal(
        <EmailCaptureModal
          onClose={() => handleEmailCaptureClose(false)}
          onSuccess={() => handleEmailCaptureClose(true)}
          source="value_moment"
        />,
        document.body
      )}
      {showShareModal && createPortal(
        <ShareLinkModal
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          event={event}
        />,
        document.body
      )}
    </header>
  );
}
