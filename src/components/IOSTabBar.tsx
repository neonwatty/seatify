import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import './IOSTabBar.css';

interface IOSTabBarProps {
  onSettingsClick?: () => void;
}

/**
 * iOS-style tab bar for mobile navigation.
 * Renders via portal to be positioned at the bottom of the viewport.
 */
export function IOSTabBar({ onSettingsClick }: IOSTabBarProps) {
  const navigate = useNavigate();
  const { activeView, setActiveView, currentEventId } = useStore();

  const handleEventsClick = () => {
    navigate('/events');
    setActiveView('event-list');
  };

  const handleCanvasClick = () => {
    if (currentEventId) {
      navigate(`/events/${currentEventId}/canvas`);
      setActiveView('canvas');
    } else {
      // If no event selected, go to events list
      navigate('/events');
      setActiveView('event-list');
    }
  };

  const handleGuestsClick = () => {
    if (currentEventId) {
      navigate(`/events/${currentEventId}/guests`);
      setActiveView('guests');
    } else {
      navigate('/events');
      setActiveView('event-list');
    }
  };

  const handleSettingsClick = () => {
    if (onSettingsClick) {
      onSettingsClick();
    }
  };

  const tabBarContent = (
    <nav className="ios-tab-bar">
      <button
        className={`tab-bar-item ${activeView === 'event-list' || activeView === 'dashboard' ? 'active' : ''}`}
        onClick={handleEventsClick}
      >
        {/* SF Symbol: calendar */}
        <svg viewBox="0 0 24 24" width="24" height="24">
          <path fill="currentColor" d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zm0-12H5V6h14v2z"/>
        </svg>
        <span>Events</span>
      </button>
      <button
        className={`tab-bar-item ${activeView === 'canvas' ? 'active' : ''}`}
        onClick={handleCanvasClick}
      >
        {/* SF Symbol: square.grid.2x2 */}
        <svg viewBox="0 0 24 24" width="24" height="24">
          <path fill="currentColor" d="M3 3h8v8H3V3zm0 10h8v8H3v-8zm10-10h8v8h-8V3zm0 10h8v8h-8v-8z"/>
        </svg>
        <span>Canvas</span>
      </button>
      <button
        className={`tab-bar-item ${activeView === 'guests' ? 'active' : ''}`}
        onClick={handleGuestsClick}
      >
        {/* SF Symbol: person.2 */}
        <svg viewBox="0 0 24 24" width="24" height="24">
          <path fill="currentColor" d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
        </svg>
        <span>Guests</span>
      </button>
      <button
        className="tab-bar-item"
        onClick={handleSettingsClick}
      >
        {/* SF Symbol: gearshape */}
        <svg viewBox="0 0 24 24" width="24" height="24">
          <path fill="currentColor" d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
        </svg>
        <span>Settings</span>
      </button>
    </nav>
  );

  return createPortal(tabBarContent, document.body);
}
