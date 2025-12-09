import { useDraggable } from '@dnd-kit/core';
import type { Guest } from '../types';
import { getGroupColor } from './groupColors';
import { getDietaryIcons, ACCESSIBILITY_ICON } from '../constants/dietaryIcons';
import './GuestChip.css';

interface GuestChipProps {
  guest: Guest;
  compact?: boolean;
  isDragging?: boolean;
  onClick?: () => void;
}

export function GuestChip({ guest, compact, isDragging, onClick }: GuestChipProps) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: guest.id,
    data: { type: 'guest', guest },
  });

  const style = transform
    ? {
        transform: `translate(${transform.x}px, ${transform.y}px)`,
      }
    : undefined;

  const initials = guest.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const getStatusColor = () => {
    switch (guest.rsvpStatus) {
      case 'confirmed':
        return 'var(--color-success)';
      case 'declined':
        return 'var(--color-error)';
      default:
        return 'var(--color-warning)';
    }
  };

  const groupColor = getGroupColor(guest.group);

  // Dietary and accessibility indicators
  const dietaryIcons = getDietaryIcons(guest.dietaryRestrictions);
  const hasDietary = dietaryIcons.length > 0;
  const hasAccessibility = guest.accessibilityNeeds && guest.accessibilityNeeds.length > 0;

  // Build tooltip with dietary/accessibility info
  const buildTooltip = () => {
    const parts = [guest.name];
    if (guest.company) parts.push(guest.company);
    if (guest.group) parts.push(`Group: ${guest.group}`);
    if (guest.dietaryRestrictions?.length) {
      parts.push(`Diet: ${guest.dietaryRestrictions.join(', ')}`);
    }
    if (guest.accessibilityNeeds?.length) {
      parts.push(`Accessibility: ${guest.accessibilityNeeds.join(', ')}`);
    }
    return parts.join('\n');
  };

  if (compact) {
    return (
      <div
        ref={setNodeRef}
        className={`guest-chip compact ${isDragging ? 'dragging' : ''}`}
        style={{
          ...style,
          ...(groupColor ? { borderColor: groupColor } : {}),
        }}
        title={buildTooltip()}
        onClick={onClick}
        {...attributes}
        {...listeners}
      >
        <span className="initials">{initials}</span>
        <span
          className="status-dot"
          style={{ backgroundColor: getStatusColor() }}
        />
        {groupColor && <span className="group-indicator" style={{ backgroundColor: groupColor }} />}
        {(hasDietary || hasAccessibility) && (
          <span className="dietary-indicator">
            {dietaryIcons[0] || ACCESSIBILITY_ICON}
          </span>
        )}
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      className={`guest-chip ${isDragging ? 'dragging' : ''} ${guest.tableId ? 'assigned' : ''} ${groupColor ? 'has-group' : ''}`}
      style={{
        ...style,
        ...(groupColor ? { '--group-color': groupColor } as React.CSSProperties : {}),
      }}
      title={buildTooltip()}
      onClick={onClick}
      {...attributes}
      {...listeners}
    >
      <div className="guest-avatar" style={{ backgroundColor: getStatusColor() }}>
        {initials}
      </div>
      <div className="guest-info">
        <span className="guest-name">{guest.name}</span>
        {guest.company && <span className="guest-company">{guest.company}</span>}
        <div className="guest-tags">
          {guest.group && (
            <span className="guest-group" style={{ backgroundColor: groupColor || undefined }}>
              {guest.group}
            </span>
          )}
          {(hasDietary || hasAccessibility) && (
            <span className="guest-dietary-tags">
              {dietaryIcons.slice(0, 2).map((icon, idx) => (
                <span key={idx} className="dietary-icon-inline">{icon}</span>
              ))}
              {hasAccessibility && (
                <span className="accessibility-icon-inline">{ACCESSIBILITY_ICON}</span>
              )}
            </span>
          )}
        </div>
      </div>
      {guest.tableId && (
        <span className="assigned-badge" title="Assigned to table">✓</span>
      )}
    </div>
  );
}
