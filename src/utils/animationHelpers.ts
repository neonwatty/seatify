import type { Guest, Table, CanvasState } from '../types';
import type { FlyingGuest } from '../store/useStore';
import { getSeatPositions } from '../components/Table';

/**
 * Convert canvas coordinates to screen coordinates
 */
export function canvasToScreen(
  canvasX: number,
  canvasY: number,
  zoom: number,
  panX: number,
  panY: number,
  canvasRect: DOMRect
): { x: number; y: number } {
  return {
    x: canvasRect.left + canvasX * zoom + panX,
    y: canvasRect.top + canvasY * zoom + panY
  };
}

/**
 * Get the screen position of a guest
 */
export function getGuestScreenPosition(
  guest: Guest,
  tables: Table[],
  canvas: CanvasState,
  canvasRect: DOMRect
): { x: number; y: number } | null {
  if (!guest.tableId) {
    // Unassigned guest - use canvas position if available
    if (guest.canvasX !== undefined && guest.canvasY !== undefined) {
      return canvasToScreen(
        guest.canvasX,
        guest.canvasY,
        canvas.zoom,
        canvas.panX,
        canvas.panY,
        canvasRect
      );
    }
    return null;
  }

  const table = tables.find(t => t.id === guest.tableId);
  if (!table) return null;

  const seatPositions = getSeatPositions(table.shape, table.capacity, table.width, table.height);
  const seatIndex = guest.seatIndex ?? 0;
  const seatPos = seatPositions[seatIndex] || seatPositions[0];

  if (!seatPos) return null;

  return canvasToScreen(
    table.x + seatPos.x,
    table.y + seatPos.y,
    canvas.zoom,
    canvas.panX,
    canvas.panY,
    canvasRect
  );
}

interface GuestPositionSnapshot {
  guestId: string;
  guest: Guest;
  tableId: string | undefined;
  x: number;
  y: number;
}

/**
 * Capture the current screen positions of all guests
 */
export function captureGuestPositions(
  guests: Guest[],
  tables: Table[],
  canvas: CanvasState,
  canvasRect: DOMRect
): GuestPositionSnapshot[] {
  const snapshots: GuestPositionSnapshot[] = [];

  for (const guest of guests) {
    const pos = getGuestScreenPosition(guest, tables, canvas, canvasRect);
    if (pos) {
      snapshots.push({
        guestId: guest.id,
        guest,
        tableId: guest.tableId,
        x: pos.x,
        y: pos.y
      });
    }
  }

  return snapshots;
}

/**
 * Determine the move type for color coding
 */
function classifyMoveType(
  _guest: Guest,
  oldTableId: string | undefined,
  newTableId: string | undefined,
  wasInViolation: boolean
): FlyingGuest['moveType'] {
  // If guest was in a violation and now isn't, it's a resolution
  if (wasInViolation && newTableId) {
    return 'resolve';
  }

  // If guest moved from a table to unassigned, it's a demotion
  if (oldTableId && !newTableId) {
    return 'demote';
  }

  // Otherwise it's a neutral move
  return 'neutral';
}

/**
 * Calculate the flying paths for moved guests
 */
export function calculateFlyingPaths(
  oldSnapshots: GuestPositionSnapshot[],
  newGuests: Guest[],
  newTables: Table[],
  canvas: CanvasState,
  canvasRect: DOMRect,
  movedGuestIds: string[],
  violatingGuestIds: Set<string>
): FlyingGuest[] {
  const flyingGuests: FlyingGuest[] = [];
  const staggerDelay = 200; // ms between each guest

  // Create a map of old positions
  const oldPosMap = new Map(oldSnapshots.map(s => [s.guestId, s]));

  let index = 0;
  for (const guestId of movedGuestIds) {
    const oldSnapshot = oldPosMap.get(guestId);
    if (!oldSnapshot) continue;

    const newGuest = newGuests.find(g => g.id === guestId);
    if (!newGuest) continue;

    // Get new position
    const newPos = getGuestScreenPosition(newGuest, newTables, canvas, canvasRect);
    if (!newPos) continue;

    // Skip if position didn't actually change visually (within 5px)
    const dx = Math.abs(newPos.x - oldSnapshot.x);
    const dy = Math.abs(newPos.y - oldSnapshot.y);
    if (dx < 5 && dy < 5) continue;

    // Classify the move type
    const wasInViolation = violatingGuestIds.has(guestId);
    const moveType = classifyMoveType(
      newGuest,
      oldSnapshot.tableId,
      newGuest.tableId,
      wasInViolation
    );

    flyingGuests.push({
      guestId,
      guest: newGuest,
      fromX: oldSnapshot.x,
      fromY: oldSnapshot.y,
      toX: newPos.x,
      toY: newPos.y,
      moveType,
      delay: index * staggerDelay
    });

    index++;
  }

  return flyingGuests;
}

/**
 * Check if the viewport is in the bounds where animations are appropriate
 */
export function isAnimationViewportValid(canvasRect: DOMRect): boolean {
  // Skip animation on very small viewports (mobile)
  return canvasRect.width >= 768;
}

/**
 * Check if reduced motion is preferred
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
