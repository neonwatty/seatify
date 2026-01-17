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
        <svg
          className="settings-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      </button>

      {/* Render menu via portal */}
      {menuContent && createPortal(menuContent, document.body)}
    </div>
  );
}
