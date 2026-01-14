import { useState, useRef, useEffect } from 'react';
import { useNavigate } from '@/lib/router-compat';
import { useStore } from '../store/useStore';
import type { TourId } from '../data/tourRegistry';
import './MobileCanvasToolbar.css';

interface MobileCanvasToolbarProps {
  onShowHelp?: () => void;
  onStartTour?: (tourId: TourId) => void;
  showRelationships?: boolean;
  onToggleRelationships?: () => void;
  children?: React.ReactNode;
}

export function MobileCanvasToolbar({
  onShowHelp,
  onStartTour,
  showRelationships,
  onToggleRelationships,
  children,
}: MobileCanvasToolbarProps) {
  const navigate = useNavigate();
  const { event, setEventName, theme, cycleTheme, canvas, setZoom, recenterCanvas } = useStore();
  const [isEditing, setIsEditing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  // Close settings when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setShowSettings(false);
      }
    };
    if (showSettings) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showSettings]);

  // Close settings on Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowSettings(false);
        setIsEditing(false);
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  const handleBack = () => {
    navigate('/dashboard');
  };

  const handleNameClick = () => {
    setIsEditing(true);
  };

  const handleNameBlur = () => {
    setIsEditing(false);
  };

  const handleNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      setIsEditing(false);
    }
  };

  const getThemeIcon = () => {
    switch (theme) {
      case 'light': return '☀';
      case 'dark': return '☽';
      default: return '⚙';
    }
  };

  const getThemeLabel = () => {
    switch (theme) {
      case 'light': return 'Light';
      case 'dark': return 'Dark';
      default: return 'System';
    }
  };

  return (
    <div className="mobile-canvas-toolbar">
      {/* Back button */}
      <button
        className="mobile-canvas-back"
        onClick={handleBack}
        aria-label="Back to events"
      >
        <svg viewBox="0 0 24 24" width="20" height="20">
          <path fill="currentColor" d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
        </svg>
      </button>

      {/* Event name (center) */}
      <div className="mobile-canvas-title">
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={event.name}
            onChange={(e) => setEventName(e.target.value)}
            onBlur={handleNameBlur}
            onKeyDown={handleNameKeyDown}
            className="mobile-canvas-name-input"
          />
        ) : (
          <button
            className="mobile-canvas-name"
            onClick={handleNameClick}
            aria-label="Edit event name"
          >
            {event.name || 'Untitled Event'}
            <svg viewBox="0 0 24 24" width="14" height="14" className="edit-icon">
              <path fill="currentColor" d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
            </svg>
          </button>
        )}
      </div>

      {/* Grid controls slot */}
      {children && (
        <div className="mobile-canvas-controls">
          {children}
        </div>
      )}

      {/* Settings button */}
      <div className="mobile-canvas-settings-container" ref={settingsRef}>
        <button
          className={`mobile-canvas-settings ${showSettings ? 'active' : ''}`}
          onClick={() => setShowSettings(!showSettings)}
          aria-label="Settings"
          aria-expanded={showSettings}
        >
          <svg viewBox="0 0 24 24" width="20" height="20">
            <path fill="currentColor" d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
          </svg>
        </button>

        {/* Settings dropdown */}
        {showSettings && (
          <div className="mobile-canvas-settings-sheet">
            {/* Zoom Controls */}
            <div className="settings-section">
              <div className="settings-label">Zoom</div>
              <div className="settings-zoom-controls">
                <button
                  className="zoom-btn"
                  onClick={() => setZoom(Math.max(0.25, canvas.zoom - 0.25))}
                  aria-label="Zoom out"
                >
                  −
                </button>
                <span className="zoom-value">{Math.round(canvas.zoom * 100)}%</span>
                <button
                  className="zoom-btn"
                  onClick={() => setZoom(Math.min(2, canvas.zoom + 0.25))}
                  aria-label="Zoom in"
                >
                  +
                </button>
                <button
                  className="zoom-btn reset"
                  onClick={() => recenterCanvas(window.innerWidth, window.innerHeight)}
                  aria-label="Reset view"
                >
                  ⟲
                </button>
              </div>
            </div>

            {/* Canvas toggles */}
            <div className="settings-section">
              {onToggleRelationships && (
                <button
                  className={`settings-item ${showRelationships ? 'active' : ''}`}
                  onClick={() => {
                    onToggleRelationships();
                  }}
                >
                  <span className="settings-icon">🔗</span>
                  <span>Relationships</span>
                  {showRelationships && <span className="checkmark">✓</span>}
                </button>
              )}
            </div>

            {/* Theme */}
            <div className="settings-section">
              <button
                className="settings-item"
                onClick={cycleTheme}
              >
                <span className="settings-icon">{getThemeIcon()}</span>
                <span>Theme: {getThemeLabel()}</span>
              </button>
            </div>

            {/* Help */}
            <div className="settings-section">
              {onShowHelp && (
                <button
                  className="settings-item"
                  onClick={() => {
                    onShowHelp();
                    setShowSettings(false);
                  }}
                >
                  <span className="settings-icon">⌨️</span>
                  <span>Shortcuts</span>
                </button>
              )}
              {onStartTour && (
                <button
                  className="settings-item"
                  onClick={() => {
                    onStartTour('quick-start');
                    setShowSettings(false);
                  }}
                >
                  <span className="settings-icon">🎓</span>
                  <span>Take Tour</span>
                </button>
              )}
            </div>

            {/* Guests button - alternative to swipe gesture */}
            <div className="settings-section">
              <button
                className="settings-item guests-btn"
                onClick={() => {
                  navigate(`/dashboard/events/${event.id}/guests`);
                  setShowSettings(false);
                }}
              >
                <span className="settings-icon">👥</span>
                <span>Guest List</span>
                <span className="guest-count">{event.guests.length}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
