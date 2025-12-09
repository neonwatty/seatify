import { useDraggable } from '@dnd-kit/core';
import { useStore } from '../store/useStore';
import { getGroupColor } from './groupColors';
import { getDietaryIcons, ACCESSIBILITY_ICON } from '../constants/dietaryIcons';
import type { Guest } from '../types';
import './CanvasGuest.css';

interface CanvasGuestProps {
  guest: Guest;
  isSelected: boolean;
  isNearTable?: boolean;
}

export function CanvasGuest({ guest, isSelected, isNearTable }: CanvasGuestProps) {
  const { toggleGuestSelection, addGuestToSelection, selectGuest, openContextMenu, setEditingGuest, visibleGroups } = useStore();
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: guest.id,
    data: { type: 'canvas-guest', guest },
  });

  const initials = guest.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const groupColor = getGroupColor(guest.group);

  // Check if this guest's group is visible
  const groupKey = guest.group ?? '';
  const isGroupVisible = visibleGroups === 'all' || visibleGroups.has(groupKey);

  // Dietary and accessibility indicators
  const dietaryIcons = getDietaryIcons(guest.dietaryRestrictions);
  const hasDietary = dietaryIcons.length > 0;
  const hasAccessibility = guest.accessibilityNeeds && guest.accessibilityNeeds.length > 0;

  // Build tooltip
  const buildTooltip = () => {
    const parts = [guest.name];
    if (guest.group) parts.push(`Group: ${guest.group}`);
    if (guest.dietaryRestrictions?.length) {
      parts.push(`Diet: ${guest.dietaryRestrictions.join(', ')}`);
    }
    if (guest.accessibilityNeeds?.length) {
      parts.push(`Accessibility: ${guest.accessibilityNeeds.join(', ')}`);
    }
    return parts.join('\n');
  };

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

  return (
    <div
      ref={setNodeRef}
      className={`canvas-guest ${isSelected ? 'selected' : ''} ${isDragging ? 'dragging' : ''} ${isNearTable ? 'near-table' : ''} ${!isGroupVisible ? 'dimmed' : ''}`}
      style={{
        left: guest.canvasX,
        top: guest.canvasY,
      }}
      title={buildTooltip()}
      onClick={(e) => {
        e.stopPropagation();
        if (e.metaKey || e.ctrlKey) {
          // Cmd/Ctrl+click: toggle selection
          toggleGuestSelection(guest.id);
        } else if (e.shiftKey) {
          // Shift+click: add to selection
          addGuestToSelection(guest.id);
        } else {
          // Normal click: select only this guest
          selectGuest(guest.id);
        }
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        setEditingGuest(guest.id);
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        openContextMenu(e.clientX, e.clientY, 'guest', guest.id);
      }}
      {...attributes}
      {...listeners}
    >
      <div
        className="canvas-guest-circle"
        style={groupColor ? { boxShadow: `0 0 0 3px ${groupColor}, var(--shadow-md)` } : undefined}
      >
        <span className="initials">{initials}</span>
      </div>
      <span className="status-dot" style={{ backgroundColor: getStatusColor() }} />
      {hasDietary && <span className="dietary-icon">{dietaryIcons[0]}</span>}
      {hasAccessibility && <span className="accessibility-icon">{ACCESSIBILITY_ICON}</span>}
      <div className="canvas-guest-label">{guest.name}</div>
    </div>
  );
}
