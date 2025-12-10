import { useState } from 'react';
import { version } from '../../package.json';
import updates from '../updates.json';
import './UpdatesPopup.css';

interface UpdatesPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

export function UpdatesPopup({ isOpen, onClose }: UpdatesPopupProps) {
  if (!isOpen) return null;

  return (
    <div className="updates-overlay" onClick={onClose}>
      <div className="updates-popup" onClick={(e) => e.stopPropagation()}>
        <div className="updates-header">
          <h2>What's New</h2>
          <button className="updates-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div className="updates-content">
          {updates.map((update) => (
            <div key={update.version} className="update-section">
              <div className="update-version-header">
                <span className="update-version">v{update.version}</span>
                <span className="update-date">{update.date}</span>
              </div>
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
        </div>
      </div>
    </div>
  );
}

interface UpdatesButtonProps {
  variant?: 'landing' | 'header';
}

export function UpdatesButton({ variant = 'header' }: UpdatesButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        className={`updates-btn updates-btn--${variant}`}
        onClick={() => setIsOpen(true)}
        title="What's New"
      >
        {variant === 'landing' ? "What's New" : '?'}
      </button>
      <UpdatesPopup isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
