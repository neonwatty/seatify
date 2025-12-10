import React from 'react';
import './EmptyState.css';

type EmptyStateVariant = 'guests' | 'tables' | 'canvas' | 'search' | 'generic';

interface EmptyStateProps {
  variant?: EmptyStateVariant;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

const illustrations: Record<EmptyStateVariant, React.ReactElement> = {
  guests: (
    <svg viewBox="0 0 120 100" className="empty-illustration">
      <circle cx="40" cy="35" r="18" className="illustration-primary" />
      <circle cx="40" cy="70" r="25" className="illustration-primary" style={{ clipPath: 'inset(0 0 50% 0)' }} />
      <circle cx="80" cy="35" r="18" className="illustration-secondary" />
      <circle cx="80" cy="70" r="25" className="illustration-secondary" style={{ clipPath: 'inset(0 0 50% 0)' }} />
      <circle cx="60" cy="45" r="15" className="illustration-accent" />
      <circle cx="60" cy="75" r="20" className="illustration-accent" style={{ clipPath: 'inset(0 0 50% 0)' }} />
    </svg>
  ),
  tables: (
    <svg viewBox="0 0 120 100" className="empty-illustration">
      <rect x="25" y="35" width="70" height="40" rx="8" className="illustration-primary" />
      <circle cx="25" cy="55" r="10" className="illustration-secondary" />
      <circle cx="95" cy="55" r="10" className="illustration-secondary" />
      <circle cx="45" cy="30" r="8" className="illustration-secondary" />
      <circle cx="75" cy="30" r="8" className="illustration-secondary" />
      <circle cx="45" cy="80" r="8" className="illustration-secondary" />
      <circle cx="75" cy="80" r="8" className="illustration-secondary" />
    </svg>
  ),
  canvas: (
    <svg viewBox="0 0 120 100" className="empty-illustration">
      <rect x="15" y="15" width="90" height="70" rx="4" className="illustration-bg" strokeWidth="2" stroke="currentColor" strokeDasharray="4 2" />
      <rect x="25" y="30" width="30" height="20" rx="4" className="illustration-primary" />
      <circle cx="80" cy="40" r="15" className="illustration-secondary" />
      <rect x="35" y="60" width="40" height="15" rx="3" className="illustration-accent" />
    </svg>
  ),
  search: (
    <svg viewBox="0 0 120 100" className="empty-illustration">
      <circle cx="50" cy="45" r="25" className="illustration-bg" strokeWidth="3" stroke="currentColor" fill="none" />
      <line x1="68" y1="63" x2="90" y2="85" className="illustration-primary" strokeWidth="6" strokeLinecap="round" />
      <text x="50" y="52" textAnchor="middle" className="illustration-text" fontSize="20">?</text>
    </svg>
  ),
  generic: (
    <svg viewBox="0 0 120 100" className="empty-illustration">
      <rect x="30" y="20" width="60" height="50" rx="4" className="illustration-bg" strokeWidth="2" stroke="currentColor" fill="none" />
      <line x1="40" y1="35" x2="80" y2="35" className="illustration-secondary" strokeWidth="3" strokeLinecap="round" />
      <line x1="40" y1="45" x2="70" y2="45" className="illustration-secondary" strokeWidth="3" strokeLinecap="round" />
      <line x1="40" y1="55" x2="75" y2="55" className="illustration-secondary" strokeWidth="3" strokeLinecap="round" />
      <circle cx="60" cy="80" r="12" className="illustration-primary" />
      <text x="60" y="85" textAnchor="middle" className="illustration-text" fontSize="14">+</text>
    </svg>
  ),
};

export function EmptyState({ variant = 'generic', title, description, action }: EmptyStateProps) {
  return (
    <div className="empty-state-container">
      <div className="empty-state-illustration">
        {illustrations[variant]}
      </div>
      <h3 className="empty-state-title">{title}</h3>
      {description && <p className="empty-state-description">{description}</p>}
      {action && (
        <button className="empty-state-action" onClick={action.onClick}>
          {action.label}
        </button>
      )}
    </div>
  );
}
