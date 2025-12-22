import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { version } from '../../package.json';
import { UpdatesButton } from './UpdatesPopup';
import './Header.css';

interface HeaderProps {
  onLogoClick?: () => void;
  onShowHelp?: () => void;
  onStartTour?: () => void;
}

export function Header({ onLogoClick, onShowHelp, onStartTour }: HeaderProps) {
  const navigate = useNavigate();
  const { eventId } = useParams<{ eventId?: string }>();
  const { event, setEventName, theme, cycleTheme, currentEventId } = useStore();

  // Check if we're inside an event (has eventId in URL)
  const isInsideEvent = !!eventId || (currentEventId && window.location.hash.includes('/events/'));

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
        {onStartTour && (
          <button
            className="tour-btn"
            onClick={onStartTour}
            title="Take a tour of Seatify"
          >
            Tour
          </button>
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
    </header>
  );
}
