import { useDraggable } from '@dnd-kit/core';
import type { Guest } from '../types';
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

  if (compact) {
    return (
      <div
        ref={setNodeRef}
        className={`guest-chip compact ${isDragging ? 'dragging' : ''}`}
        style={style}
        title={`${guest.name}${guest.company ? ` - ${guest.company}` : ''}`}
        onClick={onClick}
        {...attributes}
        {...listeners}
      >
        <span className="initials">{initials}</span>
        <span
          className="status-dot"
          style={{ backgroundColor: getStatusColor() }}
        />
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      className={`guest-chip ${isDragging ? 'dragging' : ''} ${guest.tableId ? 'assigned' : ''}`}
      style={style}
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
        {guest.group && <span className="guest-group">{guest.group}</span>}
      </div>
      {guest.tableId && (
        <span className="assigned-badge" title="Assigned to table">✓</span>
      )}
    </div>
  );
}
