import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useStore } from '../store/useStore';
import { version } from '../../package.json';
import { UpdatesButton } from './UpdatesPopup';
import './MobileSettingsHeader.css';

interface MobileSettingsHeaderProps {
  onShowHelp?: () => void;
  onStartTour?: () => void;
  onSubscribe?: () => void;
  canShowEmailButton?: boolean;
}

/**
 * Lightweight mobile header with settings menu for Landing and Events pages.
 * Only visible on mobile viewports (via CSS media query).
 */
export function MobileSettingsHeader({
  onShowHelp,
  onStartTour,
  onSubscribe,
  canShowEmailButton,
}: MobileSettingsHeaderProps) {
  const { theme, cycleTheme } = useStore();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      const isOutsideButton = buttonRef.current && !buttonRef.current.contains(target);
      const isOutsideMenu = !menuRef.current || !menuRef.current.contains(target);
      if (isOutsideButton && isOutsideMenu) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close menu on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen]);

  const handleShowHelp = () => {
    if (onShowHelp) {
      onShowHelp();
      setIsOpen(false);
    }
  };

  const handleStartTour = () => {
    if (onStartTour) {
      onStartTour();
      setIsOpen(false);
    }
  };

  const handleSubscribe = () => {
    if (onSubscribe) {
      onSubscribe();
      setIsOpen(false);
    }
  };

  const handleCycleTheme = () => {
    cycleTheme();
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
      default: return '\u2699'; // Gear (system)
    }
  };

  const menuContent = isOpen && (
    <>
      <div className="mobile-settings-backdrop" onClick={() => setIsOpen(false)} />
      <div className="mobile-settings-sheet" role="menu" ref={menuRef}>
        <div className="menu-section">
          <div className="menu-section-label">Settings</div>

          {/* Version Info */}
          <div className="menu-item static">
            <span className="menu-icon">📦</span>
            <span>Version {version}</span>
          </div>

          {/* What's New */}
          <div className="menu-item-updates">
            <UpdatesButton variant="mobile-menu" />
          </div>

          {/* Subscribe */}
          {canShowEmailButton && onSubscribe && (
            <button
              className="menu-item"
              onClick={handleSubscribe}
              role="menuitem"
            >
              <span className="menu-icon">📧</span>
              <span>Subscribe for Updates</span>
            </button>
          )}

          {/* Tour */}
          {onStartTour && (
            <button
              className="menu-item"
              onClick={handleStartTour}
              role="menuitem"
            >
              <span className="menu-icon">🎯</span>
              <span>Take a Tour</span>
            </button>
          )}

          {/* Keyboard Shortcuts */}
          {onShowHelp && (
            <button
              className="menu-item"
              onClick={handleShowHelp}
              role="menuitem"
            >
              <span className="menu-icon">⌨️</span>
              <span>Keyboard Shortcuts</span>
            </button>
          )}

          {/* Theme Toggle */}
          <button
            className="menu-item"
            onClick={handleCycleTheme}
            role="menuitem"
          >
            <span className="menu-icon">{getThemeIcon()}</span>
            <span>Theme: {getThemeLabel()}</span>
          </button>
        </div>
      </div>
    </>
  );

  return (
    <div className="mobile-settings-header">
      <button
        ref={buttonRef}
        className={`mobile-settings-btn ${isOpen ? 'active' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Settings Menu"
        aria-expanded={isOpen}
      >
        {isOpen ? (
          <svg className="settings-icon" viewBox="0 0 24 24" width="22" height="22">
            <path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
          </svg>
        ) : (
          <svg className="settings-icon" viewBox="0 0 24 24" width="22" height="22">
            <path fill="currentColor" d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.74,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.07,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z"/>
          </svg>
        )}
      </button>

      {/* Render menu via portal */}
      {menuContent && createPortal(menuContent, document.body)}
    </div>
  );
}
