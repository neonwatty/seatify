import { useRef, useEffect, useMemo } from 'react';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { useStore } from '../store/useStore';
import { getGroupColor } from './groupColors';
import { DIETARY_ICONS, getDietaryIcon, ACCESSIBILITY_ICON } from '../constants/dietaryIcons';
import type { Table, Guest } from '../types';
import './Table.css';

interface TableComponentProps {
  table: Table;
  guests: Guest[];
  isSelected: boolean;
  isSnapTarget?: boolean;
  swapTargetGuestId?: string | null;
}

interface SeatGuestProps {
  guest: Guest;
  seatPosition: { x: number; y: number };
  tablePosition: { x: number; y: number };
  isSwapTarget?: boolean;
}

function SeatGuest({ guest, seatPosition, tablePosition, isSwapTarget }: SeatGuestProps) {
  const { setEditingGuest, openContextMenu, animatingGuestIds, clearAnimatingGuests, visibleGroups } = useStore();
  const isAnimating = animatingGuestIds.has(guest.id);

  // Check if this guest's group is visible
  const groupKey = guest.group ?? '';
  const isGroupVisible = visibleGroups === 'all' || visibleGroups.has(groupKey);

  // Clear animation state after animation completes
  useEffect(() => {
    if (isAnimating) {
      const timer = setTimeout(() => {
        clearAnimatingGuests();
      }, 1500); // Animation duration + buffer
      return () => clearTimeout(timer);
    }
  }, [isAnimating, clearAnimatingGuests]);

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: guest.id,
    data: {
      type: 'seated-guest',
      guest,
      originalPosition: {
        canvasX: tablePosition.x + seatPosition.x,
        canvasY: tablePosition.y + seatPosition.y,
      },
    },
  });

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

  // Check for dietary restrictions
  const hasDietary = guest.dietaryRestrictions && guest.dietaryRestrictions.length > 0;
  const dietaryIcon = hasDietary
    ? guest.dietaryRestrictions!.map(d => DIETARY_ICONS[d.toLowerCase()] || '').filter(Boolean)[0] || '🍽️'
    : null;

  // Check for accessibility needs
  const hasAccessibility = guest.accessibilityNeeds && guest.accessibilityNeeds.length > 0;

  // Get group color
  const groupColor = getGroupColor(guest.group);

  // Build tooltip
  const tooltipParts = [guest.name];
  if (guest.group) tooltipParts.push(`Group: ${guest.group}`);
  if (hasDietary) tooltipParts.push(`Diet: ${guest.dietaryRestrictions!.join(', ')}`);
  if (hasAccessibility) tooltipParts.push(`Accessibility: ${guest.accessibilityNeeds!.join(', ')}`);

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingGuest(guest.id);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    openContextMenu(e.clientX, e.clientY, 'guest', guest.id);
  };

  return (
    <div
      ref={setNodeRef}
      className={`seat-guest ${isDragging ? 'dragging' : ''} ${groupColor ? 'has-group' : ''} ${isSwapTarget ? 'swap-target' : ''} ${isAnimating ? 'optimized' : ''} ${!isGroupVisible ? 'dimmed' : ''}`}
      title={tooltipParts.join('\n')}
      onDoubleClick={handleDoubleClick}
      onContextMenu={handleContextMenu}
      {...attributes}
      {...listeners}
    >
      <div
        className="seat-guest-circle"
        style={groupColor ? { borderColor: groupColor, borderWidth: '3px' } : undefined}
      >
        <span className="initials">{initials}</span>
      </div>
      <span className="status-dot" style={{ backgroundColor: getStatusColor() }} />
      {groupColor && <span className="group-dot" style={{ backgroundColor: groupColor }} />}
      {dietaryIcon && <span className="dietary-icon">{dietaryIcon}</span>}
      {hasAccessibility && <span className="accessibility-icon">♿</span>}
      {isSwapTarget && <span className="swap-icon">⇄</span>}
    </div>
  );
}

export function TableComponent({ table, guests, isSelected, isSnapTarget, swapTargetGuestId }: TableComponentProps) {
  const { selectTable, removeTable, getViolationsForTable, toggleTableSelection, addTableToSelection, openContextMenu } = useStore();
  const violations = getViolationsForTable(table.id);
  const hasViolations = violations.length > 0;
  const hasRequiredViolations = violations.some(v => v.priority === 'required');

  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: table.id,
    data: { type: 'table' },
  });

  const { attributes, listeners, setNodeRef: setDraggableRef, isDragging, transform } = useDraggable({
    id: table.id,
    data: { type: 'table' },
  });

  // Track the last transform to prevent flicker on drop
  // Note: Refs are accessed during render intentionally for synchronous state tracking
  // to prevent visual flicker when drag ends. This is a valid pattern for this use case.
  /* eslint-disable react-hooks/refs */
  const lastTransformRef = useRef<{ x: number; y: number } | null>(null);
  const lastPositionRef = useRef<{ x: number; y: number }>({ x: table.x, y: table.y });
  const wasDraggingRef = useRef(false);

  // Update last transform while dragging
  if (isDragging && transform) {
    lastTransformRef.current = { x: transform.x, y: transform.y };
    wasDraggingRef.current = true;
  }

  // Compute active transform synchronously
  let activeTransform: { x: number; y: number } | null = null;

  if (isDragging) {
    // During drag, use the current transform
    activeTransform = transform;
  } else if (wasDraggingRef.current && lastTransformRef.current) {
    // Just stopped dragging
    if (table.x !== lastPositionRef.current.x || table.y !== lastPositionRef.current.y) {
      // Position updated, clear everything
      lastTransformRef.current = null;
      lastPositionRef.current = { x: table.x, y: table.y };
      wasDraggingRef.current = false;
      activeTransform = null;
    } else {
      // Position hasn't updated yet, keep showing the pending transform
      activeTransform = lastTransformRef.current;
    }
  } else {
    // Not dragging and no pending transform
    if (table.x !== lastPositionRef.current.x || table.y !== lastPositionRef.current.y) {
      lastPositionRef.current = { x: table.x, y: table.y };
    }
    activeTransform = null;
  }
  /* eslint-enable react-hooks/refs */

  const seatPositions = getSeatPositions(table.shape, table.capacity, table.width, table.height);

  // Calculate capacity status
  const occupancy = guests.length / table.capacity;
  const getCapacityStatus = () => {
    if (guests.length > table.capacity) return 'over';
    if (occupancy >= 1) return 'full';
    if (occupancy >= 0.75) return 'nearly-full';
    return 'available';
  };
  const capacityStatus = getCapacityStatus();

  // Calculate ring stroke dasharray for SVG
  const ringSize = Math.max(table.width, table.height) + 16;
  const ringRadius = ringSize / 2 - 4;
  const circumference = 2 * Math.PI * ringRadius;
  const strokeDashoffset = circumference * (1 - Math.min(occupancy, 1));

  // Calculate table dietary summary
  const dietarySummary = useMemo(() => {
    const counts: Record<string, number> = {};
    let accessibilityCount = 0;

    guests.forEach((guest) => {
      guest.dietaryRestrictions?.forEach((diet) => {
        const key = diet.toLowerCase();
        counts[key] = (counts[key] || 0) + 1;
      });
      if (guest.accessibilityNeeds?.length) {
        accessibilityCount += 1;
      }
    });

    return { dietary: counts, accessibility: accessibilityCount };
  }, [guests]);

  const hasDietaryNeeds = Object.keys(dietarySummary.dietary).length > 0 || dietarySummary.accessibility > 0;
  const totalDietaryCount = Object.values(dietarySummary.dietary).reduce((a, b) => a + b, 0) + dietarySummary.accessibility;

  const formatDietarySummary = () => {
    const parts: string[] = [];
    Object.entries(dietarySummary.dietary).forEach(([diet, count]) => {
      const icon = getDietaryIcon(diet) || '';
      parts.push(`${icon} ${diet}: ${count}`);
    });
    if (dietarySummary.accessibility > 0) {
      parts.push(`${ACCESSIBILITY_ICON} Accessibility: ${dietarySummary.accessibility}`);
    }
    return parts.join('\n');
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (e.metaKey || e.ctrlKey) {
      // Cmd/Ctrl+click: toggle selection
      toggleTableSelection(table.id);
    } else if (e.shiftKey) {
      // Shift+click: add to selection
      addTableToSelection(table.id);
    } else {
      // Normal click: select only this table
      selectTable(table.id);
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`Delete ${table.name}? All guests will be unassigned.`)) {
      removeTable(table.id);
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    openContextMenu(e.clientX, e.clientY, 'table', table.id);
  };

  // Build violation tooltip
  const violationTooltip = hasViolations
    ? violations.map(v => `⚠️ ${v.description}`).join('\n')
    : '';

  return (
    <div
      ref={(node) => {
        setDroppableRef(node);
        setDraggableRef(node);
      }}
      className={`table-component ${table.shape} ${isSelected ? 'selected' : ''} ${isOver ? 'drop-target' : ''} ${isDragging ? 'dragging' : ''} ${isSnapTarget ? 'snap-target' : ''} capacity-${capacityStatus} ${hasViolations ? 'has-violations' : ''} ${hasRequiredViolations ? 'has-required-violations' : ''}`}
      style={{
        left: table.x,
        top: table.y,
        width: table.width,
        height: table.height,
        transform: activeTransform ? `translate(${activeTransform.x}px, ${activeTransform.y}px)` : undefined,
      }}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      {...attributes}
      {...listeners}
    >
      {/* Capacity Ring */}
      {table.shape === 'round' && (
        <svg
          className="capacity-ring"
          width={ringSize}
          height={ringSize}
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'none',
          }}
        >
          {/* Background ring */}
          <circle
            cx={ringSize / 2}
            cy={ringSize / 2}
            r={ringRadius}
            fill="none"
            stroke="var(--color-border-light)"
            strokeWidth="3"
          />
          {/* Progress ring */}
          <circle
            cx={ringSize / 2}
            cy={ringSize / 2}
            r={ringRadius}
            fill="none"
            className="capacity-progress"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            transform={`rotate(-90 ${ringSize / 2} ${ringSize / 2})`}
          />
        </svg>
      )}

      <div className="table-surface">
        <div className="table-label">
          <span>{table.name}</span>
          <span className={`table-count ${capacityStatus}`}>
            {guests.length}/{table.capacity}
          </span>
        </div>
      </div>

      {seatPositions.map((pos, idx) => {
        const guest = guests.find((g) => g.seatIndex === idx) || guests[idx];
        return (
          <div
            key={idx}
            className="seat"
            style={{
              left: pos.x,
              top: pos.y,
              transform: 'translate(-50%, -50%)',
            }}
          >
            {guest && (
              <SeatGuest
                guest={guest}
                seatPosition={pos}
                tablePosition={{ x: table.x, y: table.y }}
                isSwapTarget={swapTargetGuestId === guest.id}
              />
            )}
          </div>
        );
      })}

      {/* Violation Warning Badge */}
      {hasViolations && (
        <div
          className={`violation-badge ${hasRequiredViolations ? 'required' : 'preferred'}`}
          title={violationTooltip}
        >
          ⚠️ {violations.length}
        </div>
      )}

      {/* Dietary Summary Badge */}
      {hasDietaryNeeds && (
        <div className="table-dietary-summary" title={formatDietarySummary()}>
          <span className="dietary-summary-icon">🍽️</span>
          <span className="dietary-summary-count">{totalDietaryCount}</span>
        </div>
      )}

      {/* Availability indicator during drag */}
      {isOver && table.capacity > guests.length && (
        <div className="availability-indicator">
          {table.capacity - guests.length} seat{table.capacity - guests.length !== 1 ? 's' : ''} available
        </div>
      )}
      {isOver && table.capacity <= guests.length && (
        <div className="availability-indicator full">
          Table full
        </div>
      )}

      {isSelected && (
        <button className="table-delete" onClick={handleDelete} title="Delete table">
          ×
        </button>
      )}
    </div>
  );
}

function getSeatPositions(
  shape: Table['shape'],
  capacity: number,
  width: number,
  height: number
): { x: number; y: number }[] {
  const positions: { x: number; y: number }[] = [];

  if (shape === 'round') {
    const radius = width / 2 + 20;
    for (let i = 0; i < capacity; i++) {
      const angle = (2 * Math.PI * i) / capacity - Math.PI / 2;
      positions.push({
        x: width / 2 + radius * Math.cos(angle),
        y: height / 2 + radius * Math.sin(angle),
      });
    }
  } else if (shape === 'oval') {
    // Oval - elliptical seating
    const radiusX = width / 2 + 20;
    const radiusY = height / 2 + 20;
    for (let i = 0; i < capacity; i++) {
      const angle = (2 * Math.PI * i) / capacity - Math.PI / 2;
      positions.push({
        x: width / 2 + radiusX * Math.cos(angle),
        y: height / 2 + radiusY * Math.sin(angle),
      });
    }
  } else if (shape === 'half-round') {
    // Half-round - seats along curved edge only
    const radius = width / 2 + 20;
    for (let i = 0; i < capacity; i++) {
      const angle = Math.PI * (i / (capacity - 1 || 1));
      positions.push({
        x: width / 2 - radius * Math.cos(angle),
        y: height + radius * Math.sin(angle) * 0.5,
      });
    }
  } else if (shape === 'serpentine') {
    // Serpentine - S-curve, often used as buffet (capacity might be 0)
    if (capacity === 0) return positions;
    const amplitude = height / 4;
    for (let i = 0; i < capacity; i++) {
      const t = i / (capacity - 1 || 1);
      const x = t * width;
      const curveY = height / 2 + amplitude * Math.sin(t * 2 * Math.PI);
      // Calculate normal to curve for seat placement
      const derivative = amplitude * 2 * Math.PI * Math.cos(t * 2 * Math.PI) / width;
      const normalAngle = Math.atan2(derivative, 1) + Math.PI / 2;
      positions.push({
        x: x + 25 * Math.cos(normalAngle),
        y: curveY + 25 * Math.sin(normalAngle),
      });
    }
  } else if (shape === 'rectangle') {
    const longSideSeats = Math.ceil(capacity / 2);
    const seatSpacing = width / (longSideSeats + 1);

    for (let i = 0; i < longSideSeats; i++) {
      positions.push({
        x: seatSpacing * (i + 1),
        y: -20,
      });
    }
    for (let i = 0; i < capacity - longSideSeats; i++) {
      positions.push({
        x: seatSpacing * (i + 1),
        y: height + 20,
      });
    }
  } else {
    // square - seats on all 4 sides
    const seatsPerSide = Math.ceil(capacity / 4);
    const topBottom = seatsPerSide * 2;
    const leftRight = capacity - topBottom;

    for (let i = 0; i < seatsPerSide && positions.length < capacity; i++) {
      positions.push({
        x: (width / (seatsPerSide + 1)) * (i + 1),
        y: -20,
      });
    }
    for (let i = 0; i < Math.ceil(leftRight / 2) && positions.length < capacity; i++) {
      positions.push({
        x: width + 20,
        y: (height / (Math.ceil(leftRight / 2) + 1)) * (i + 1),
      });
    }
    for (let i = 0; i < seatsPerSide && positions.length < capacity; i++) {
      positions.push({
        x: (width / (seatsPerSide + 1)) * (seatsPerSide - i),
        y: height + 20,
      });
    }
    for (let i = 0; i < Math.floor(leftRight / 2) && positions.length < capacity; i++) {
      positions.push({
        x: -20,
        y: (height / (Math.floor(leftRight / 2) + 1)) * (i + 1),
      });
    }
  }

  return positions;
}
