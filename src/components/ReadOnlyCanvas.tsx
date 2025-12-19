import { useRef, useState, useCallback, useLayoutEffect } from 'react';
import { useGesture } from '@use-gesture/react';
import type { Table, Guest, VenueElement, Constraint } from '../types';
import { getFullName, getInitials } from '../types';
import { getGroupColor } from './groupColors';
import { DIETARY_ICONS, ACCESSIBILITY_ICON } from '../constants/dietaryIcons';
import './ReadOnlyCanvas.css';

interface ReadOnlyCanvasProps {
  tables: Table[];
  guests: Guest[];
  venueElements?: VenueElement[];
  constraints?: Constraint[];
  eventName?: string;
  showGrid?: boolean;
}

// Calculate seat positions for a table
function getSeatPositionsForTable(table: Table, capacity: number): { x: number; y: number }[] {
  const positions: { x: number; y: number }[] = [];

  if (table.shape === 'round' || table.shape === 'oval') {
    const radiusX = table.width / 2 + 20;
    const radiusY = table.shape === 'oval' ? table.height / 2 + 20 : radiusX;
    for (let i = 0; i < capacity; i++) {
      const angle = (2 * Math.PI * i) / capacity - Math.PI / 2;
      positions.push({
        x: table.x + table.width / 2 + radiusX * Math.cos(angle),
        y: table.y + table.height / 2 + radiusY * Math.sin(angle),
      });
    }
  } else if (table.shape === 'half-round') {
    const radius = table.width / 2 + 20;
    // Seats only on the curved side (top half)
    for (let i = 0; i < capacity; i++) {
      const angle = Math.PI + (Math.PI * i) / (capacity - 1 || 1);
      positions.push({
        x: table.x + table.width / 2 + radius * Math.cos(angle),
        y: table.y + table.height / 2 + radius * Math.sin(angle),
      });
    }
  } else {
    // Rectangle/square
    const longSideSeats = Math.ceil(capacity / 2);
    const seatSpacing = table.width / (longSideSeats + 1);
    for (let i = 0; i < longSideSeats; i++) {
      positions.push({
        x: table.x + seatSpacing * (i + 1),
        y: table.y - 20,
      });
    }
    for (let i = 0; i < capacity - longSideSeats; i++) {
      positions.push({
        x: table.x + seatSpacing * (i + 1),
        y: table.y + table.height + 20,
      });
    }
  }

  return positions;
}

// Get dietary restriction icon (first one)
function getDietaryIcon(restrictions: string[] | undefined): string | null {
  if (!restrictions || restrictions.length === 0) return null;
  for (const restriction of restrictions) {
    const icon = DIETARY_ICONS[restriction.toLowerCase()];
    if (icon) return icon;
  }
  return '🍽️';
}

// Get RSVP status color
function getStatusColor(rsvpStatus: string | undefined): string {
  switch (rsvpStatus) {
    case 'confirmed':
      return 'var(--color-success)';
    case 'declined':
      return 'var(--color-error)';
    default:
      return 'var(--color-warning)';
  }
}

// Calculate violations for a table based on constraints
function getTableViolations(
  tableGuests: Guest[],
  allGuests: Guest[],
  constraints: Constraint[]
): { description: string; priority: 'required' | 'preferred' }[] {
  const violations: { description: string; priority: 'required' | 'preferred' }[] = [];

  for (const constraint of constraints) {
    // Normalize priority to exclude 'optional'
    const priority = constraint.priority === 'optional' ? 'preferred' : (constraint.priority || 'preferred');

    if (constraint.type === 'must_sit_together') {
      const guestIds = constraint.guestIds;
      const tableGuestIds = tableGuests.map(g => g.id);
      const atThisTable = guestIds.filter(id => tableGuestIds.includes(id));

      // If some but not all are at this table, it's a violation
      if (atThisTable.length > 0 && atThisTable.length < guestIds.length) {
        const names = guestIds.map(id => {
          const guest = allGuests.find(g => g.id === id);
          return guest ? getFullName(guest) : 'Unknown';
        });
        violations.push({
          description: `${names.join(' & ')} should sit together`,
          priority,
        });
      }
    } else if (constraint.type === 'must_not_sit_together') {
      const guestIds = constraint.guestIds;
      const tableGuestIds = tableGuests.map(g => g.id);
      const atThisTable = guestIds.filter(id => tableGuestIds.includes(id));

      // If more than one is at this table, it's a violation
      if (atThisTable.length > 1) {
        const names = atThisTable.map(id => {
          const guest = allGuests.find(g => g.id === id);
          return guest ? getFullName(guest) : 'Unknown';
        });
        violations.push({
          description: `${names.join(' & ')} should not sit together`,
          priority,
        });
      }
    }
  }

  return violations;
}

export function ReadOnlyCanvas({ tables, guests, venueElements = [], constraints = [], eventName, showGrid: initialShowGrid = true }: ReadOnlyCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const gestureRef = useRef<HTMLDivElement>(null);

  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(50);
  const [panY, setPanY] = useState(50);
  const [isReady, setIsReady] = useState(false);
  const [showGrid, setShowGrid] = useState(initialShowGrid);

  // Tooltip state
  const [tooltip, setTooltip] = useState<{ x: number; y: number; content: string } | null>(null);

  // Auto-center canvas on mount
  useLayoutEffect(() => {
    if (tables.length === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional initial state set on mount
      setIsReady(true);
      return;
    }

    // Calculate bounding box of all tables
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const table of tables) {
      minX = Math.min(minX, table.x);
      minY = Math.min(minY, table.y);
      maxX = Math.max(maxX, table.x + table.width);
      maxY = Math.max(maxY, table.y + table.height);
    }

    // Add padding
    const padding = 100;
    minX -= padding;
    minY -= padding;
    maxX += padding;
    maxY += padding;

    // Get canvas dimensions
    const canvasWidth = canvasRef.current?.clientWidth || 800;
    const canvasHeight = canvasRef.current?.clientHeight || 600;

    // Calculate zoom to fit
    const contentWidth = maxX - minX;
    const contentHeight = maxY - minY;
    const zoomX = canvasWidth / contentWidth;
    const zoomY = canvasHeight / contentHeight;
    const newZoom = Math.min(Math.max(Math.min(zoomX, zoomY), 0.25), 2);

    // Calculate pan to center content
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const newPanX = (canvasWidth / 2) - (centerX * newZoom);
    const newPanY = (canvasHeight / 2) - (centerY * newZoom);

    setZoom(newZoom);
    setPanX(newPanX);
    setPanY(newPanY);
    setIsReady(true);
  }, [tables]);

  // Gesture handling for pinch-to-zoom and pan
  useGesture(
    {
      onPinch: ({ offset: [scale], origin: [ox, oy], memo }) => {
        const newZoom = Math.min(2, Math.max(0.25, scale));

        if (!memo) {
          memo = {
            originX: (ox - panX) / zoom,
            originY: (oy - panY) / zoom,
          };
        }

        const newPanX = ox - memo.originX * newZoom;
        const newPanY = oy - memo.originY * newZoom;

        setZoom(newZoom);
        setPanX(newPanX);
        setPanY(newPanY);

        return memo;
      },
      onDrag: ({ delta: [dx, dy], touches, pinching }) => {
        if (pinching) return;
        // Allow single-finger or two-finger panning
        if (touches >= 1) {
          setPanX(prev => prev + dx);
          setPanY(prev => prev + dy);
        }
      },
    },
    {
      target: gestureRef,
      eventOptions: { passive: false },
      pinch: {
        scaleBounds: { min: 0.25, max: 2 },
        from: () => [zoom, 0],
      },
      drag: {
        pointer: { touch: true },
        filterTaps: true,
        threshold: 10,
      },
    }
  );

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        setZoom(prev => Math.min(2, Math.max(0.25, prev + delta)));
      } else {
        setPanX(prev => prev - e.deltaX);
        setPanY(prev => prev - e.deltaY);
      }
    },
    []
  );

  const handleRecenter = () => {
    if (tables.length === 0) {
      setPanX(50);
      setPanY(50);
      setZoom(1);
      return;
    }

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const table of tables) {
      minX = Math.min(minX, table.x);
      minY = Math.min(minY, table.y);
      maxX = Math.max(maxX, table.x + table.width);
      maxY = Math.max(maxY, table.y + table.height);
    }

    const padding = 100;
    minX -= padding;
    minY -= padding;
    maxX += padding;
    maxY += padding;

    const canvasWidth = canvasRef.current?.clientWidth || 800;
    const canvasHeight = canvasRef.current?.clientHeight || 600;

    const contentWidth = maxX - minX;
    const contentHeight = maxY - minY;
    const zoomX = canvasWidth / contentWidth;
    const zoomY = canvasHeight / contentHeight;
    const newZoom = Math.min(Math.max(Math.min(zoomX, zoomY), 0.25), 2);

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const newPanX = (canvasWidth / 2) - (centerX * newZoom);
    const newPanY = (canvasHeight / 2) - (centerY * newZoom);

    setZoom(newZoom);
    setPanX(newPanX);
    setPanY(newPanY);
  };

  // Get guests for a specific table
  const getTableGuests = (tableId: string) => {
    return guests.filter(g => g.tableId === tableId);
  };

  // Show tooltip for a guest
  const showGuestTooltip = (guest: Guest, x: number, y: number) => {
    const table = guest.tableId ? tables.find(t => t.id === guest.tableId) : null;
    const parts = [getFullName(guest)];
    if (table) parts[0] += ` (${table.name})`;
    if (guest.rsvpStatus) {
      const statusLabel = guest.rsvpStatus.charAt(0).toUpperCase() + guest.rsvpStatus.slice(1);
      parts.push(`Status: ${statusLabel}`);
    }
    if (guest.group) parts.push(`Group: ${guest.group}`);
    if (guest.dietaryRestrictions?.length) {
      parts.push(`Diet: ${guest.dietaryRestrictions.join(', ')}`);
    }
    if (guest.accessibilityNeeds?.length) {
      parts.push(`Accessibility: ${guest.accessibilityNeeds.join(', ')}`);
    }
    setTooltip({ x, y, content: parts.join('\n') });
  };

  return (
    <div className="readonly-canvas-container">
      {/* Header */}
      <div className="readonly-canvas-header">
        <div className="readonly-header-left">
          {eventName && <h2 className="readonly-event-name">{eventName}</h2>}
          <span className="readonly-stats">
            {tables.length} table{tables.length !== 1 ? 's' : ''} &bull; {guests.length} guest{guests.length !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="readonly-header-right">
          <button
            className={`readonly-grid-toggle ${showGrid ? 'active' : ''}`}
            onClick={() => setShowGrid(!showGrid)}
            title={showGrid ? 'Hide Grid' : 'Show Grid'}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <rect x="1" y="1" width="4" height="4" />
              <rect x="6" y="1" width="4" height="4" />
              <rect x="11" y="1" width="4" height="4" />
              <rect x="1" y="6" width="4" height="4" />
              <rect x="6" y="6" width="4" height="4" />
              <rect x="11" y="6" width="4" height="4" />
              <rect x="1" y="11" width="4" height="4" />
              <rect x="6" y="11" width="4" height="4" />
              <rect x="11" y="11" width="4" height="4" />
            </svg>
          </button>
          <div className="readonly-zoom-controls">
            <button onClick={() => setZoom(prev => Math.max(0.25, prev - 0.1))} title="Zoom Out">−</button>
            <span className="zoom-display">{Math.round(zoom * 100)}%</span>
            <button onClick={() => setZoom(prev => Math.min(2, prev + 0.1))} title="Zoom In">+</button>
            <button onClick={handleRecenter} className="recenter-btn" title="Re-center">⌖</button>
          </div>
        </div>
      </div>

      {/* Canvas */}
      <div
        ref={(node) => {
          (canvasRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
          (gestureRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
        }}
        className={`readonly-canvas ${showGrid ? 'show-grid' : ''}`}
        onWheel={handleWheel}
        style={{ touchAction: 'none' }}
      >
        <div
          className="readonly-canvas-content"
          style={{
            transform: `translate(${panX}px, ${panY}px) scale(${zoom})`,
            transformOrigin: '0 0',
            opacity: isReady ? 1 : 0,
          }}
        >
          {/* Venue Elements */}
          {venueElements.map((element) => (
            <div
              key={element.id}
              className={`readonly-venue-element readonly-venue-${element.type}`}
              style={{
                left: element.x,
                top: element.y,
                width: element.width,
                height: element.height,
                transform: element.rotation ? `rotate(${element.rotation}deg)` : undefined,
              }}
            >
              <span className="venue-label">{element.label}</span>
            </div>
          ))}

          {/* Tables */}
          {tables.map((table) => {
            const tableGuests = getTableGuests(table.id);
            const seatPositions = getSeatPositionsForTable(table, table.capacity);
            const violations = getTableViolations(tableGuests, guests, constraints);
            const hasViolations = violations.length > 0;
            const hasRequiredViolations = violations.some(v => v.priority === 'required');

            // Calculate capacity status
            const occupancy = tableGuests.length / table.capacity;
            const capacityStatus = tableGuests.length > table.capacity ? 'over'
              : occupancy >= 1 ? 'full'
              : occupancy >= 0.75 ? 'nearly-full'
              : 'available';

            // Calculate capacity ring for round tables
            const ringSize = Math.max(table.width, table.height) + 16;
            const ringRadius = ringSize / 2 - 4;
            const circumference = 2 * Math.PI * ringRadius;
            const strokeDashoffset = circumference * (1 - Math.min(occupancy, 1));

            // Calculate dietary summary for table
            const dietarySummary = (() => {
              const counts: Record<string, number> = {};
              let accessibilityCount = 0;
              tableGuests.forEach((guest) => {
                guest.dietaryRestrictions?.forEach((diet) => {
                  const key = diet.toLowerCase();
                  counts[key] = (counts[key] || 0) + 1;
                });
                if (guest.accessibilityNeeds?.length) {
                  accessibilityCount += 1;
                }
              });
              return { dietary: counts, accessibility: accessibilityCount };
            })();

            const hasDietaryNeeds = Object.keys(dietarySummary.dietary).length > 0 || dietarySummary.accessibility > 0;
            const totalDietaryCount = Object.values(dietarySummary.dietary).reduce((a, b) => a + b, 0) + dietarySummary.accessibility;

            const formatDietarySummary = () => {
              const parts: string[] = [];
              Object.entries(dietarySummary.dietary).forEach(([diet, count]) => {
                const icon = DIETARY_ICONS[diet] || '';
                parts.push(`${icon} ${diet}: ${count}`);
              });
              if (dietarySummary.accessibility > 0) {
                parts.push(`${ACCESSIBILITY_ICON} Accessibility: ${dietarySummary.accessibility}`);
              }
              return parts.join('\n');
            };

            const violationTooltip = hasViolations
              ? violations.map(v => `⚠️ ${v.description}`).join('\n')
              : '';

            return (
              <div
                key={table.id}
                className={`readonly-table-wrapper capacity-${capacityStatus} ${hasViolations ? 'has-violations' : ''} ${hasRequiredViolations ? 'has-required-violations' : ''}`}
              >
                {/* Capacity Ring for round tables */}
                {table.shape === 'round' && (
                  <svg
                    className="readonly-capacity-ring"
                    width={ringSize}
                    height={ringSize}
                    style={{
                      position: 'absolute',
                      left: table.x + table.width / 2 - ringSize / 2,
                      top: table.y + table.height / 2 - ringSize / 2,
                      pointerEvents: 'none',
                    }}
                  >
                    <circle
                      cx={ringSize / 2}
                      cy={ringSize / 2}
                      r={ringRadius}
                      fill="none"
                      stroke="var(--color-border-light)"
                      strokeWidth="3"
                    />
                    <circle
                      cx={ringSize / 2}
                      cy={ringSize / 2}
                      r={ringRadius}
                      fill="none"
                      className={`capacity-progress capacity-${capacityStatus}`}
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeDasharray={circumference}
                      strokeDashoffset={strokeDashoffset}
                      style={{ transform: `rotate(-90deg)`, transformOrigin: '50% 50%' }}
                    />
                  </svg>
                )}

                {/* Table shape */}
                <div
                  className={`readonly-table readonly-table-${table.shape} capacity-${capacityStatus}`}
                  style={{
                    left: table.x,
                    top: table.y,
                    width: table.width,
                    height: table.height,
                    transform: table.rotation ? `rotate(${table.rotation}deg)` : undefined,
                  }}
                >
                  <span className="table-name">{table.name}</span>
                  <span className={`table-count capacity-${capacityStatus}`}>
                    {tableGuests.length}/{table.capacity}
                  </span>

                  {/* Violation Badge */}
                  {hasViolations && (
                    <div
                      className={`readonly-violation-badge ${hasRequiredViolations ? 'required' : 'preferred'}`}
                      title={violationTooltip}
                    >
                      ⚠️ {violations.length}
                    </div>
                  )}

                  {/* Dietary Summary Badge */}
                  {hasDietaryNeeds && (
                    <div className="readonly-dietary-summary" title={formatDietarySummary()}>
                      <span className="dietary-summary-icon">🍽️</span>
                      <span className="dietary-summary-count">{totalDietaryCount}</span>
                    </div>
                  )}
                </div>

                {/* Seated guests */}
                {tableGuests.map((guest, index) => {
                  const seatIndex = guest.seatIndex ?? index;
                  const seatPos = seatPositions[seatIndex] || seatPositions[0];
                  if (!seatPos) return null;

                  const dietaryIcon = getDietaryIcon(guest.dietaryRestrictions);
                  const hasAccessibility = guest.accessibilityNeeds && guest.accessibilityNeeds.length > 0;
                  const groupColor = getGroupColor(guest.group);

                  return (
                    <div
                      key={guest.id}
                      className={`readonly-guest ${groupColor ? 'has-group' : ''}`}
                      style={{
                        left: seatPos.x,
                        top: seatPos.y,
                      }}
                      onMouseEnter={(e) => showGuestTooltip(guest, e.clientX, e.clientY)}
                      onMouseLeave={() => setTooltip(null)}
                    >
                      <div
                        className="guest-circle"
                        style={groupColor ? { borderColor: groupColor, borderWidth: '3px' } : undefined}
                      >
                        <span className="guest-initials">{getInitials(guest)}</span>
                      </div>
                      <span className="status-dot" style={{ backgroundColor: getStatusColor(guest.rsvpStatus) }} />
                      {groupColor && <span className="group-dot" style={{ backgroundColor: groupColor }} />}
                      {dietaryIcon && <span className="dietary-icon">{dietaryIcon}</span>}
                      {hasAccessibility && <span className="accessibility-icon">{ACCESSIBILITY_ICON}</span>}
                    </div>
                  );
                })}
              </div>
            );
          })}

          {/* Unassigned guests on canvas */}
          {guests
            .filter(g => !g.tableId && g.canvasX !== undefined && g.canvasY !== undefined)
            .map((guest) => {
              const dietaryIcon = getDietaryIcon(guest.dietaryRestrictions);
              const hasAccessibility = guest.accessibilityNeeds && guest.accessibilityNeeds.length > 0;
              const groupColor = getGroupColor(guest.group);

              return (
                <div
                  key={guest.id}
                  className={`readonly-guest readonly-guest-unassigned ${groupColor ? 'has-group' : ''}`}
                  style={{
                    left: guest.canvasX,
                    top: guest.canvasY,
                  }}
                  onMouseEnter={(e) => showGuestTooltip(guest, e.clientX, e.clientY)}
                  onMouseLeave={() => setTooltip(null)}
                >
                  <div
                    className="guest-circle"
                    style={groupColor ? { borderColor: groupColor, borderWidth: '3px' } : undefined}
                  >
                    <span className="guest-initials">{getInitials(guest)}</span>
                  </div>
                  <span className="status-dot" style={{ backgroundColor: getStatusColor(guest.rsvpStatus) }} />
                  {groupColor && <span className="group-dot" style={{ backgroundColor: groupColor }} />}
                  {dietaryIcon && <span className="dietary-icon">{dietaryIcon}</span>}
                  {hasAccessibility && <span className="accessibility-icon">{ACCESSIBILITY_ICON}</span>}
                </div>
              );
            })}
        </div>

        {/* Empty state */}
        {tables.length === 0 && guests.length === 0 && (
          <div className="readonly-empty">
            <p>No seating arrangement to display.</p>
          </div>
        )}
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="readonly-tooltip"
          style={{
            left: tooltip.x + 10,
            top: tooltip.y + 10,
          }}
        >
          {tooltip.content.split('\n').map((line, i) => (
            <div key={i}>{line}</div>
          ))}
        </div>
      )}
    </div>
  );
}
