import { useRef, useState, useCallback, useEffect, useLayoutEffect } from 'react';
import {
  DndContext,
  DragOverlay,
  useSensor,
  useSensors,
  PointerSensor,
  TouchSensor,
} from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent, DragMoveEvent } from '@dnd-kit/core';
import { useGesture } from '@use-gesture/react';
import { useStore } from '../store/useStore';
import { useLongPress } from '../hooks/useLongPress';
import { TableComponent } from './Table';
import { GuestChip } from './GuestChip';
import { CanvasGuest } from './CanvasGuest';
import { TablePropertiesPanel } from './TablePropertiesPanel';
import { CanvasSearch } from './CanvasSearch';
import { CanvasMinimap } from './CanvasMinimap';
import { SelectionToolbar } from './SelectionToolbar';
import { ContextMenu } from './ContextMenu';
import type { ContextMenuItem } from './ContextMenu';
import { LayoutToolbar } from './LayoutToolbar';
import { MainToolbar } from './MainToolbar';
import { GridControls } from './GridControls';
import { RelationshipMatrix } from './RelationshipMatrix';
import { ImportWizard } from './ImportWizard/ImportWizard';
import { QRCodeModal } from './QRCodeModal';
import type { Table, AlignmentGuide, Guest } from '../types';
import { getFullName, getInitials } from '../types';
import './Canvas.css';

const SNAP_THRESHOLD = 80; // pixels in canvas coordinates
const ALIGNMENT_THRESHOLD = 10; // pixels for alignment guide detection
const SWAP_THRESHOLD = 40; // pixels for detecting swap target

// Snap a position to grid
function snapToGrid(value: number, gridSize: number, enabled: boolean): number {
  if (!enabled) return value;
  return Math.round(value / gridSize) * gridSize;
}

// Find alignment guides for a moving table
function findAlignmentGuides(
  movingTable: Table,
  newX: number,
  newY: number,
  otherTables: Table[],
  threshold: number
): AlignmentGuide[] {
  const guides: AlignmentGuide[] = [];
  const movingCenterX = newX + movingTable.width / 2;
  const movingCenterY = newY + movingTable.height / 2;
  const movingLeft = newX;
  const movingRight = newX + movingTable.width;
  const movingTop = newY;
  const movingBottom = newY + movingTable.height;

  for (const table of otherTables) {
    if (table.id === movingTable.id) continue;

    const tableCenterX = table.x + table.width / 2;
    const tableCenterY = table.y + table.height / 2;
    const tableLeft = table.x;
    const tableRight = table.x + table.width;
    const tableTop = table.y;
    const tableBottom = table.y + table.height;

    // Vertical alignment (horizontal guides)
    // Center to center
    if (Math.abs(movingCenterY - tableCenterY) < threshold) {
      guides.push({
        type: 'horizontal',
        position: tableCenterY,
        start: Math.min(movingLeft, tableLeft) - 20,
        end: Math.max(movingRight, tableRight) + 20,
      });
    }
    // Top to top
    if (Math.abs(movingTop - tableTop) < threshold) {
      guides.push({
        type: 'horizontal',
        position: tableTop,
        start: Math.min(movingLeft, tableLeft) - 20,
        end: Math.max(movingRight, tableRight) + 20,
      });
    }
    // Bottom to bottom
    if (Math.abs(movingBottom - tableBottom) < threshold) {
      guides.push({
        type: 'horizontal',
        position: tableBottom,
        start: Math.min(movingLeft, tableLeft) - 20,
        end: Math.max(movingRight, tableRight) + 20,
      });
    }

    // Horizontal alignment (vertical guides)
    // Center to center
    if (Math.abs(movingCenterX - tableCenterX) < threshold) {
      guides.push({
        type: 'vertical',
        position: tableCenterX,
        start: Math.min(movingTop, tableTop) - 20,
        end: Math.max(movingBottom, tableBottom) + 20,
      });
    }
    // Left to left
    if (Math.abs(movingLeft - tableLeft) < threshold) {
      guides.push({
        type: 'vertical',
        position: tableLeft,
        start: Math.min(movingTop, tableTop) - 20,
        end: Math.max(movingBottom, tableBottom) + 20,
      });
    }
    // Right to right
    if (Math.abs(movingRight - tableRight) < threshold) {
      guides.push({
        type: 'vertical',
        position: tableRight,
        start: Math.min(movingTop, tableTop) - 20,
        end: Math.max(movingBottom, tableBottom) + 20,
      });
    }
  }

  return guides;
}

function findNearbyTable(x: number, y: number, tables: Table[]): Table | null {
  for (const table of tables) {
    const tableCenterX = table.x + table.width / 2;
    const tableCenterY = table.y + table.height / 2;

    let distance: number;

    if (table.shape === 'round') {
      const radius = table.width / 2;
      const dx = x - tableCenterX;
      const dy = y - tableCenterY;
      distance = Math.sqrt(dx * dx + dy * dy) - radius;
    } else {
      // Rectangle/square - distance to nearest edge
      const dx = Math.max(Math.abs(x - tableCenterX) - table.width / 2, 0);
      const dy = Math.max(Math.abs(y - tableCenterY) - table.height / 2, 0);
      distance = Math.sqrt(dx * dx + dy * dy);
    }

    if (distance < SNAP_THRESHOLD) {
      return table;
    }
  }
  return null;
}

// Check if two rectangles intersect
function rectanglesIntersect(
  r1: { x: number; y: number; width: number; height: number },
  r2: { x: number; y: number; width: number; height: number }
): boolean {
  return !(
    r1.x + r1.width < r2.x ||
    r2.x + r2.width < r1.x ||
    r1.y + r1.height < r2.y ||
    r2.y + r2.height < r1.y
  );
}

// Find all tables that intersect with a selection rectangle
function findTablesInSelectionRect(
  start: { x: number; y: number },
  end: { x: number; y: number },
  tables: Table[]
): string[] {
  // Normalize the selection rectangle (handle any drag direction)
  const selectionRect = {
    x: Math.min(start.x, end.x),
    y: Math.min(start.y, end.y),
    width: Math.abs(end.x - start.x),
    height: Math.abs(end.y - start.y),
  };

  // Find intersecting tables
  return tables
    .filter(table => rectanglesIntersect(selectionRect, table))
    .map(table => table.id);
}

// Calculate seat positions for a table (simplified version)
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
  } else {
    // Rectangle/square - simplified
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

// Find all guests (both unassigned and seated) that intersect with a selection rectangle
function findGuestsInSelectionRect(
  start: { x: number; y: number },
  end: { x: number; y: number },
  guests: Guest[],
  tables: Table[]
): string[] {
  // Normalize the selection rectangle (handle any drag direction)
  const selectionRect = {
    x: Math.min(start.x, end.x),
    y: Math.min(start.y, end.y),
    width: Math.abs(end.x - start.x),
    height: Math.abs(end.y - start.y),
  };

  // Guest chip approximate size (circular, ~40px diameter)
  const guestSize = 40;

  // Pre-compute seat positions for all tables
  const tableSeatPositions = new Map<string, { x: number; y: number }[]>();
  const tableGuestIndices = new Map<string, Map<string, number>>();

  for (const table of tables) {
    const positions = getSeatPositionsForTable(table, table.capacity);
    tableSeatPositions.set(table.id, positions);

    // Build index map for guests at this table
    const seatedGuests = guests.filter(g => g.tableId === table.id);
    const indexMap = new Map<string, number>();
    seatedGuests.forEach((guest, idx) => {
      const seatIdx = guest.seatIndex ?? idx;
      indexMap.set(guest.id, seatIdx);
    });
    tableGuestIndices.set(table.id, indexMap);
  }

  // Find all guests that intersect with selection
  return guests
    .filter(guest => {
      let guestX: number | undefined;
      let guestY: number | undefined;

      if (guest.tableId) {
        // Seated guest - calculate position from table seat
        const positions = tableSeatPositions.get(guest.tableId);
        const indexMap = tableGuestIndices.get(guest.tableId);
        if (positions && indexMap) {
          const seatIndex = indexMap.get(guest.id) ?? 0;
          const seatPos = positions[seatIndex] || positions[0];
          if (seatPos) {
            guestX = seatPos.x;
            guestY = seatPos.y;
          }
        }
      } else if (guest.canvasX !== undefined && guest.canvasY !== undefined) {
        // Unassigned guest on canvas
        guestX = guest.canvasX;
        guestY = guest.canvasY;
      }

      if (guestX === undefined || guestY === undefined) {
        return false;
      }

      // Check if guest chip intersects with selection rectangle
      const guestRect = {
        x: guestX - guestSize / 2,
        y: guestY - guestSize / 2,
        width: guestSize,
        height: guestSize,
      };
      return rectanglesIntersect(selectionRect, guestRect);
    })
    .map(guest => guest.id);
}

// Find a nearby seated guest for swapping
function findNearbySeatedGuest(
  x: number,
  y: number,
  tables: Table[],
  guests: Guest[],
  excludeGuestId: string
): Guest | null {
  let closestGuest: Guest | null = null;
  let closestDistance = SWAP_THRESHOLD;

  for (const table of tables) {
    const seatedGuests = guests.filter((g) => g.tableId === table.id);
    if (seatedGuests.length === 0) continue;

    const seatPositions = getSeatPositionsForTable(table, table.capacity);

    for (const guest of seatedGuests) {
      if (guest.id === excludeGuestId) continue;

      // Get guest's seat position
      const seatIndex = guest.seatIndex ?? seatedGuests.indexOf(guest);
      const seatPos = seatPositions[seatIndex] || seatPositions[0];
      if (!seatPos) continue;

      const dx = x - seatPos.x;
      const dy = y - seatPos.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < closestDistance) {
        closestDistance = distance;
        closestGuest = guest;
      }
    }
  }

  return closestGuest;
}

export function Canvas() {
  const canvasRef = useRef<HTMLDivElement>(null);
  const {
    event,
    canvas,
    canvasPrefs,
    alignmentGuides,
    contextMenu,
    setZoom,
    setPan,
    moveTable,
    assignGuestToTable,
    moveGuestOnCanvas,
    detachGuestFromTable,
    addTable,
    selectTable,
    selectGuest,
    setAlignmentGuides,
    clearAlignmentGuides,
    pushHistory,
    addQuickGuest,
    swapGuestSeats,
    removeTable,
    removeGuest,
    openContextMenu,
    closeContextMenu,
    toggleTableSelection,
    toggleGuestSelection,
    setEditingGuest,
    selectMultipleItems,
    panToPosition,
    newlyAddedGuestId,
    clearNewlyAddedGuest,
    newlyAddedTableId,
    clearNewlyAddedTable,
  } = useStore();

  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [draggedGuestId, setDraggedGuestId] = useState<string | null>(null);
  const [nearbyTableId, setNearbyTableId] = useState<string | null>(null);
  const [swapTargetGuestId, setSwapTargetGuestId] = useState<string | null>(null);
  const [dragType, setDragType] = useState<string | null>(null);
  const [showTableDropdown, setShowTableDropdown] = useState(false);
  const [showRelationships, setShowRelationships] = useState(false);
  const [showImportWizard, setShowImportWizard] = useState(false);
  const [qrModalTableId, setQrModalTableId] = useState<string | null>(null);
  const [isCanvasReady, setIsCanvasReady] = useState(false);
  const tableDropdownRef = useRef<HTMLDivElement>(null);

  // Marquee selection state
  const [isMarqueeSelecting, setIsMarqueeSelecting] = useState(false);
  const [marqueeStart, setMarqueeStart] = useState<{ x: number; y: number } | null>(null);
  const [marqueeEnd, setMarqueeEnd] = useState<{ x: number; y: number } | null>(null);
  const [marqueeModifier, setMarqueeModifier] = useState<'replace' | 'add'>('replace');
  const wasMarqueeSelecting = useRef(false);

  // Re-center canvas to fit all tables in view
  const handleRecenter = useCallback(() => {
    const tables = event.tables;
    if (tables.length === 0) {
      // No tables, reset to default view
      setPan(50, 20);
      setZoom(1);
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

    // Get canvas dimensions (approximate if ref not available)
    const canvasWidth = canvasRef.current?.clientWidth || 800;
    const canvasHeight = canvasRef.current?.clientHeight || 600;

    // Calculate zoom to fit
    const contentWidth = maxX - minX;
    const contentHeight = maxY - minY;
    const zoomX = canvasWidth / contentWidth;
    const zoomY = canvasHeight / contentHeight;
    const newZoom = Math.min(Math.max(Math.min(zoomX, zoomY), 0.25), 2); // Clamp between 0.25 and 2

    // Calculate pan to center content
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const newPanX = (canvasWidth / 2) - (centerX * newZoom);
    const newPanY = (canvasHeight / 2) - (centerY * newZoom);

    setZoom(newZoom);
    setPan(newPanX, newPanY);
  }, [event.tables, setPan, setZoom]);

  // Auto-center canvas on initial mount - use useLayoutEffect to prevent jitter
  useLayoutEffect(() => {
    if (event.tables.length > 0) {
      handleRecenter();
    }
    setIsCanvasReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (tableDropdownRef.current && !tableDropdownRef.current.contains(e.target as Node)) {
        setShowTableDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Track previous guest count to detect newly added guests
  const prevGuestCountRef = useRef(event.guests.length);

  // Pan to show newly added guest if they're off-screen
  useEffect(() => {
    // Only react when guest count increases and we have exactly one selected guest
    if (event.guests.length > prevGuestCountRef.current &&
        canvas.selectedGuestIds.length === 1 &&
        canvasRef.current) {

      const newGuestId = canvas.selectedGuestIds[0];
      const newGuest = event.guests.find(g => g.id === newGuestId);

      if (newGuest && newGuest.canvasX !== undefined && newGuest.canvasY !== undefined) {
        const rect = canvasRef.current.getBoundingClientRect();
        const viewportWidth = rect.width;
        const viewportHeight = rect.height;

        // Check if guest is visible in current viewport
        const guestScreenX = newGuest.canvasX * canvas.zoom + canvas.panX;
        const guestScreenY = newGuest.canvasY * canvas.zoom + canvas.panY;

        const isVisible = guestScreenX >= 0 && guestScreenX <= viewportWidth &&
                          guestScreenY >= 0 && guestScreenY <= viewportHeight;

        if (!isVisible) {
          // Pan to show the new guest (slightly left of center to show tables too)
          panToPosition(newGuest.canvasX + 100, newGuest.canvasY, viewportWidth, viewportHeight);
        }
      }
    }
    prevGuestCountRef.current = event.guests.length;
  }, [event.guests.length, canvas.selectedGuestIds, canvas.zoom, canvas.panX, canvas.panY, event.guests, panToPosition]);

  // Clear newly added guest highlight after animation completes (1.5s)
  useEffect(() => {
    if (newlyAddedGuestId) {
      const timer = setTimeout(() => {
        clearNewlyAddedGuest();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [newlyAddedGuestId, clearNewlyAddedGuest]);

  // Clear newly added table highlight after animation completes (1.5s)
  useEffect(() => {
    if (newlyAddedTableId) {
      const timer = setTimeout(() => {
        clearNewlyAddedTable();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [newlyAddedTableId, clearNewlyAddedTable]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200, // Long-press to initiate drag on touch
        tolerance: 5, // Allow 5px movement during delay
      },
    })
  );

  // Pinch-to-zoom and two-finger pan gesture handling
  const gestureRef = useRef<HTMLDivElement>(null);
  const initialZoomRef = useRef(canvas.zoom);
  const initialPanRef = useRef({ x: canvas.panX, y: canvas.panY });

  useGesture(
    {
      onPinchStart: () => {
        initialZoomRef.current = canvas.zoom;
        initialPanRef.current = { x: canvas.panX, y: canvas.panY };
      },
      onPinch: ({ offset: [scale], origin: [ox, oy], memo }) => {
        const newZoom = Math.min(2, Math.max(0.25, scale));

        // Zoom towards pinch center
        if (!memo) {
          memo = {
            originX: (ox - canvas.panX) / canvas.zoom,
            originY: (oy - canvas.panY) / canvas.zoom,
          };
        }

        const newPanX = ox - memo.originX * newZoom;
        const newPanY = oy - memo.originY * newZoom;

        setZoom(newZoom);
        setPan(newPanX, newPanY);

        return memo;
      },
      onDrag: ({ delta: [dx, dy], touches, pinching, event, target }) => {
        // Two-finger panning always works
        if (touches >= 2 && !pinching) {
          event?.preventDefault();
          setPan(canvas.panX + dx, canvas.panY + dy);
          return;
        }

        // Single-finger panning when pan mode is enabled (mobile feature)
        // Only pan if touching empty canvas area, not interactive elements
        if (touches === 1 && canvasPrefs.panMode && !pinching) {
          const targetEl = target as HTMLElement;
          const isOnInteractiveElement = targetEl?.closest?.('.table-component') ||
            targetEl?.closest?.('.canvas-guest') ||
            targetEl?.closest?.('.seat-guest') ||
            targetEl?.closest?.('button');

          if (!isOnInteractiveElement) {
            event?.preventDefault();
            setPan(canvas.panX + dx, canvas.panY + dy);
          }
        }
      },
    },
    {
      target: gestureRef,
      eventOptions: { passive: false },
      pinch: {
        scaleBounds: { min: 0.25, max: 2 },
        from: () => [canvas.zoom, 0],
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
        setZoom(canvas.zoom + delta);
      } else {
        setPan(canvas.panX - e.deltaX, canvas.panY - e.deltaY);
      }
    },
    [canvas.zoom, canvas.panX, canvas.panY, setZoom, setPan]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // Middle-click or Alt+Shift+click for panning (changed from just Shift to avoid conflict)
      if (e.button === 1 || (e.button === 0 && e.altKey && e.shiftKey)) {
        setIsPanning(true);
        setPanStart({ x: e.clientX - canvas.panX, y: e.clientY - canvas.panY });
        return;
      }

      // Left-click on empty canvas area - start marquee selection
      // Check if NOT clicking on a table, guest, or other interactive element
      const target = e.target as HTMLElement;
      const isOnInteractiveElement = target.closest('.table-component') ||
        target.closest('.canvas-guest') ||
        target.closest('.seat-guest') ||
        target.closest('button') ||
        target.closest('.context-menu');

      if (e.button === 0 && !isOnInteractiveElement && canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        // Convert to canvas coordinates
        const canvasX = (e.clientX - rect.left - canvas.panX) / canvas.zoom;
        const canvasY = (e.clientY - rect.top - canvas.panY) / canvas.zoom;

        setIsMarqueeSelecting(true);
        setMarqueeStart({ x: canvasX, y: canvasY });
        setMarqueeEnd({ x: canvasX, y: canvasY });
        setMarqueeModifier(e.shiftKey ? 'add' : 'replace');

        // Prevent text selection
        e.preventDefault();
      }
    },
    [canvas.panX, canvas.panY, canvas.zoom]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isPanning) {
        setPan(e.clientX - panStart.x, e.clientY - panStart.y);
        return;
      }

      if (isMarqueeSelecting && marqueeStart && canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        const canvasX = (e.clientX - rect.left - canvas.panX) / canvas.zoom;
        const canvasY = (e.clientY - rect.top - canvas.panY) / canvas.zoom;
        setMarqueeEnd({ x: canvasX, y: canvasY });
      }
    },
    [isPanning, panStart, setPan, isMarqueeSelecting, marqueeStart, canvas.panX, canvas.panY, canvas.zoom]
  );

  const handleMouseUp = useCallback(() => {
    if (isPanning) {
      setIsPanning(false);
      return;
    }

    if (isMarqueeSelecting && marqueeStart && marqueeEnd) {
      // Find tables that intersect with the selection rectangle
      const selectedTableIds = findTablesInSelectionRect(
        marqueeStart,
        marqueeEnd,
        event.tables
      );

      // Find guests (both seated and unassigned) that intersect with the selection rectangle
      const selectedGuestIds = findGuestsInSelectionRect(
        marqueeStart,
        marqueeEnd,
        event.guests,
        event.tables
      );

      // Only process if the marquee was actually dragged (not just a click)
      const marqueeWidth = Math.abs(marqueeEnd.x - marqueeStart.x);
      const marqueeHeight = Math.abs(marqueeEnd.y - marqueeStart.y);
      const isActualDrag = marqueeWidth > 5 || marqueeHeight > 5;

      if (isActualDrag) {
        wasMarqueeSelecting.current = true;

        if (marqueeModifier === 'add') {
          // Add to existing selection (Shift+drag)
          const combinedTables = [...new Set([...canvas.selectedTableIds, ...selectedTableIds])];
          const combinedGuests = [...new Set([...canvas.selectedGuestIds, ...selectedGuestIds])];
          selectMultipleItems(combinedTables, combinedGuests);
        } else {
          // Replace selection with items in marquee
          selectMultipleItems(selectedTableIds, selectedGuestIds);
        }
      }

      // Reset marquee state
      setIsMarqueeSelecting(false);
      setMarqueeStart(null);
      setMarqueeEnd(null);
    }
  }, [
    isPanning, isMarqueeSelecting, marqueeStart, marqueeEnd,
    marqueeModifier, event.tables, event.guests, canvas.selectedTableIds, canvas.selectedGuestIds,
    selectMultipleItems
  ]);

  const handleDragStart = (dragEvent: DragStartEvent) => {
    const { active } = dragEvent;
    const type = active.data.current?.type;
    if (type === 'guest' || type === 'canvas-guest' || type === 'seated-guest') {
      setDraggedGuestId(active.id as string);
      setDragType(type);
    } else if (type === 'table') {
      setDragType(type);
      // Save state before moving for undo
      pushHistory('Move table');
    }
  };

  const handleDragMove = (dragEvent: DragMoveEvent) => {
    const { active, delta } = dragEvent;
    const type = active.data.current?.type;

    if (type === 'table') {
      const table = event.tables.find((t) => t.id === active.id);
      if (!table) return;

      const newX = table.x + delta.x / canvas.zoom;
      const newY = table.y + delta.y / canvas.zoom;

      // Compute alignment guides
      if (canvasPrefs.showAlignmentGuides) {
        const guides = findAlignmentGuides(table, newX, newY, event.tables, ALIGNMENT_THRESHOLD);
        setAlignmentGuides(guides);
      }
    } else if (type === 'canvas-guest') {
      const guest = event.guests.find((g) => g.id === active.id);
      if (!guest || guest.canvasX === undefined || guest.canvasY === undefined) return;

      const newX = guest.canvasX + delta.x / canvas.zoom;
      const newY = guest.canvasY + delta.y / canvas.zoom;

      const nearbyTable = findNearbyTable(newX, newY, event.tables);
      setNearbyTableId(nearbyTable?.id || null);
    } else if (type === 'seated-guest') {
      const originalPos = active.data.current?.originalPosition;
      if (!originalPos) return;

      const newX = originalPos.canvasX + delta.x / canvas.zoom;
      const newY = originalPos.canvasY + delta.y / canvas.zoom;

      // Check for swap target (another seated guest nearby)
      const swapTarget = findNearbySeatedGuest(
        newX,
        newY,
        event.tables,
        event.guests,
        active.id as string
      );
      setSwapTargetGuestId(swapTarget?.id || null);

      // Only show nearby table if no swap target
      if (!swapTarget) {
        const nearbyTable = findNearbyTable(newX, newY, event.tables);
        setNearbyTableId(nearbyTable?.id || null);
      } else {
        setNearbyTableId(null);
      }
    }
  };

  const handleDragEnd = (dragEvent: DragEndEvent) => {
    const { active, over, delta } = dragEvent;
    const currentSwapTarget = swapTargetGuestId;
    setDraggedGuestId(null);
    setNearbyTableId(null);
    setSwapTargetGuestId(null);
    setDragType(null);
    clearAlignmentGuides();

    const type = active.data.current?.type;

    if (type === 'table') {
      const table = event.tables.find((t) => t.id === active.id);
      if (table) {
        let newX = table.x + delta.x / canvas.zoom;
        let newY = table.y + delta.y / canvas.zoom;

        // Apply snap to grid
        if (canvasPrefs.snapToGrid) {
          newX = snapToGrid(newX, canvasPrefs.gridSize, true);
          newY = snapToGrid(newY, canvasPrefs.gridSize, true);
        }

        moveTable(active.id as string, newX, newY);
      }
    } else if (type === 'canvas-guest') {
      // Dragging a free-floating guest on the canvas
      const guest = event.guests.find((g) => g.id === active.id);
      if (!guest || guest.canvasX === undefined || guest.canvasY === undefined) return;

      const newX = guest.canvasX + delta.x / canvas.zoom;
      const newY = guest.canvasY + delta.y / canvas.zoom;

      const nearbyTable = findNearbyTable(newX, newY, event.tables);

      if (nearbyTable) {
        // Snap to table
        assignGuestToTable(active.id as string, nearbyTable.id);
      } else {
        // Just move on canvas
        moveGuestOnCanvas(active.id as string, newX, newY);
      }
    } else if (type === 'seated-guest') {
      // Dragging a guest who is currently seated at a table
      const originalPos = active.data.current?.originalPosition;
      if (!originalPos) return;

      const newX = originalPos.canvasX + delta.x / canvas.zoom;
      const newY = originalPos.canvasY + delta.y / canvas.zoom;

      // Check if we're swapping with another guest
      if (currentSwapTarget) {
        pushHistory('Swap guests');
        swapGuestSeats(active.id as string, currentSwapTarget);
        return;
      }

      const nearbyTable = findNearbyTable(newX, newY, event.tables);

      if (nearbyTable) {
        // Assign to (possibly different) table
        assignGuestToTable(active.id as string, nearbyTable.id);
      } else {
        // Detach from table - guest becomes free-floating
        detachGuestFromTable(active.id as string, newX, newY);
      }
    } else if (type === 'guest') {
      // Dragging from sidebar
      if (over?.data.current?.type === 'table') {
        assignGuestToTable(active.id as string, over.id as string);
      } else if (!over) {
        // Dropped on canvas - calculate position
        const rect = canvasRef.current?.getBoundingClientRect();
        if (rect) {
          // Place guest at a reasonable position on canvas
          const guest = event.guests.find((g) => g.id === active.id);
          const existingPos = guest?.canvasX !== undefined && guest?.canvasY !== undefined;

          if (!existingPos) {
            // Give a default position in canvas coordinates
            const existingUnassigned = event.guests.filter((g) => !g.tableId && g.id !== active.id);
            const defaultX = 80;
            const defaultY = 100 + existingUnassigned.length * 70;
            moveGuestOnCanvas(active.id as string, defaultX, defaultY);
          }
          // Unassign from table
          assignGuestToTable(active.id as string, undefined);
        }
      }
    }
  };

  const handleCanvasClick = (e: React.MouseEvent) => {
    // Don't clear selection if we just finished a marquee select
    if (wasMarqueeSelecting.current) {
      wasMarqueeSelecting.current = false;
      return;
    }
    if (e.target === canvasRef.current) {
      selectTable(null);
    }
  };

  const goToTable = (table: Table) => {
    // Center viewport on table
    const viewportWidth = window.innerWidth - 280;
    const viewportHeight = window.innerHeight - 120;

    const newPanX = viewportWidth / 2 - (table.x + table.width / 2) * canvas.zoom;
    const newPanY = viewportHeight / 2 - (table.y + table.height / 2) * canvas.zoom;

    setPan(newPanX, newPanY);
    selectTable(table.id);
    setShowTableDropdown(false);
  };

  // Generate context menu items based on target
  const getContextMenuItems = (): ContextMenuItem[] => {
    if (!contextMenu.targetType) return [];

    if (contextMenu.targetType === 'table' && contextMenu.targetId) {
      const table = event.tables.find((t) => t.id === contextMenu.targetId);
      if (!table) return [];

      const guestCount = event.guests.filter((g) => g.tableId === table.id).length;
      const isSelected = canvas.selectedTableIds.includes(table.id);
      const hasMultipleSelected = canvas.selectedTableIds.length > 1;

      const items: ContextMenuItem[] = [
        {
          label: isSelected ? 'Deselect' : 'Select',
          icon: isSelected ? '○' : '●',
          onClick: () => selectTable(isSelected ? null : table.id),
        },
        {
          label: 'Add to Selection',
          icon: '+',
          onClick: () => toggleTableSelection(table.id),
          disabled: isSelected,
        },
        { label: '', onClick: () => {}, divider: true },
        {
          label: 'Duplicate Table',
          icon: '⧉',
          onClick: () => {
            pushHistory('Duplicate table');
            addTable(table.shape, table.x + 50, table.y + 50);
          },
        },
        {
          label: 'Generate QR Code',
          icon: '📱',
          onClick: () => setQrModalTableId(table.id),
        },
        { label: '', onClick: () => {}, divider: true },
        {
          label: hasMultipleSelected ? `Delete ${canvas.selectedTableIds.length} Tables` : 'Delete Table',
          icon: '🗑',
          onClick: () => {
            if (confirm(`Delete ${table.name}?${guestCount > 0 ? ` ${guestCount} guest(s) will be unassigned.` : ''}`)) {
              pushHistory('Delete table');
              removeTable(table.id);
            }
          },
          danger: true,
        },
      ];

      return items;
    }

    if (contextMenu.targetType === 'guest' && contextMenu.targetId) {
      const guest = event.guests.find((g) => g.id === contextMenu.targetId);
      if (!guest) return [];

      const isSelected = canvas.selectedGuestIds.includes(guest.id);

      const items: ContextMenuItem[] = [
        {
          label: 'Edit Guest',
          icon: '✏️',
          onClick: () => setEditingGuest(guest.id),
        },
        { label: '', onClick: () => {}, divider: true },
        {
          label: isSelected ? 'Deselect' : 'Select',
          icon: isSelected ? '○' : '●',
          onClick: () => selectGuest(isSelected ? null : guest.id),
        },
        {
          label: 'Add to Selection',
          icon: '+',
          onClick: () => toggleGuestSelection(guest.id),
          disabled: isSelected,
        },
        { label: '', onClick: () => {}, divider: true },
      ];

      // Add "Assign to Table" submenu items
      if (event.tables.length > 0) {
        items.push({
          label: 'Unassign from Table',
          icon: '↩',
          onClick: () => {
            pushHistory('Unassign guest');
            assignGuestToTable(guest.id, undefined);
          },
          disabled: !guest.tableId,
        });
      }

      items.push({ label: '', onClick: () => {}, divider: true });
      items.push({
        label: 'Delete Guest',
        icon: '🗑',
        onClick: () => {
          if (confirm(`Delete ${getFullName(guest)}?`)) {
            pushHistory('Delete guest');
            removeGuest(guest.id);
          }
        },
        danger: true,
      });

      return items;
    }

    if (contextMenu.targetType === 'canvas') {
      return [
        {
          label: 'Add Round Table',
          icon: '⭕',
          onClick: () => {
            const canvasX = (contextMenu.x - canvas.panX) / canvas.zoom;
            const canvasY = (contextMenu.y - canvas.panY) / canvas.zoom;
            addTable('round', canvasX, canvasY);
          },
        },
        {
          label: 'Add Rectangle Table',
          icon: '▭',
          onClick: () => {
            const canvasX = (contextMenu.x - canvas.panX) / canvas.zoom;
            const canvasY = (contextMenu.y - canvas.panY) / canvas.zoom;
            addTable('rectangle', canvasX, canvasY);
          },
        },
        {
          label: 'Add Guest',
          icon: '👤',
          onClick: () => {
            const canvasX = (contextMenu.x - canvas.panX) / canvas.zoom;
            const canvasY = (contextMenu.y - canvas.panY) / canvas.zoom;
            addQuickGuest(canvasX, canvasY);
          },
        },
        { label: '', onClick: () => {}, divider: true },
        {
          label: 'Select All Tables',
          icon: '⊞',
          onClick: () => {
            const allTableIds = event.tables.map((t) => t.id);
            allTableIds.forEach((id) => toggleTableSelection(id));
          },
          disabled: event.tables.length === 0,
        },
      ];
    }

    return [];
  };

  // Handle right-click context menu on canvas
  const handleCanvasContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    // Only open canvas context menu if clicking on empty space
    if (e.target === e.currentTarget || (e.target as HTMLElement).classList.contains('canvas-content')) {
      openContextMenu(e.clientX, e.clientY, 'canvas', null);
    }
  };

  // Long press for mobile canvas context menu
  const canvasLongPressHandlers = useLongPress({
    onLongPress: (e: React.TouchEvent) => {
      // Only open if touching empty canvas space
      const target = e.target as HTMLElement;
      if (target.classList.contains('canvas-viewport') || target.classList.contains('canvas-content')) {
        e.preventDefault();
        const touch = e.touches[0] || e.changedTouches[0];
        if (touch) {
          openContextMenu(touch.clientX, touch.clientY, 'canvas', null);
        }
      }
    },
  });

  const draggedGuest = draggedGuestId
    ? event.guests.find((g) => g.id === draggedGuestId)
    : null;

  return (
    <div className="canvas-container">
      <MainToolbar
        showRelationships={showRelationships}
        onToggleRelationships={() => setShowRelationships(!showRelationships)}
        onImport={() => setShowImportWizard(true)}
      >
        {/* Grid controls */}
        <GridControls />

        {/* Go to Table dropdown */}
        {event.tables.length > 0 && (
          <div className="table-nav-dropdown" ref={tableDropdownRef}>
            <button
              onClick={() => setShowTableDropdown(!showTableDropdown)}
              className="toolbar-btn"
            >
              Go to Table
            </button>
            {showTableDropdown && (
              <div className="dropdown-menu">
                {event.tables.map(table => {
                  const guestCount = event.guests.filter(g => g.tableId === table.id).length;
                  const isFull = guestCount >= table.capacity;
                  return (
                    <button
                      key={table.id}
                      onClick={() => goToTable(table)}
                      className={`table-nav-item ${isFull ? 'full' : ''}`}
                    >
                      <span className="table-nav-name">{table.name}</span>
                      <span className="table-nav-count">{guestCount}/{table.capacity}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Zoom controls */}
        <div className="zoom-controls">
          <button onClick={() => setZoom(canvas.zoom - 0.1)} title="Zoom Out">−</button>
          <span className="zoom-display">{Math.round(canvas.zoom * 100)}%</span>
          <button onClick={() => setZoom(canvas.zoom + 0.1)} title="Zoom In">+</button>
          <button onClick={handleRecenter} className="recenter-btn has-tooltip" data-tooltip="Re-center">⌖</button>
        </div>
      </MainToolbar>

      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragMove={handleDragMove}
        onDragEnd={handleDragEnd}
      >
        <div
          ref={(node) => {
            (canvasRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
            (gestureRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
          }}
          className={`canvas ${canvasPrefs.showGrid ? 'show-grid' : ''}`}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onClick={handleCanvasClick}
          onContextMenu={handleCanvasContextMenu}
          {...canvasLongPressHandlers}
          style={{ cursor: isPanning ? 'grabbing' : isMarqueeSelecting ? 'crosshair' : 'default', touchAction: 'none' }}
        >
          <div
            className="canvas-content"
            style={{
              transform: `translate(${canvas.panX}px, ${canvas.panY}px) scale(${canvas.zoom})`,
              transformOrigin: '0 0',
              opacity: isCanvasReady ? 1 : 0,
            }}
          >
            {event.tables.map((table) => (
              <TableComponent
                key={table.id}
                table={table}
                guests={event.guests.filter((g) => g.tableId === table.id)}
                isSelected={canvas.selectedTableIds.includes(table.id)}
                isSnapTarget={nearbyTableId === table.id}
                swapTargetGuestId={swapTargetGuestId}
                isNewlyAdded={newlyAddedTableId === table.id}
              />
            ))}

            {/* Unassigned guests on canvas */}
            {event.guests
              .filter((g) => !g.tableId && g.canvasX !== undefined && g.canvasY !== undefined)
              .map((guest) => (
                <CanvasGuest
                  key={guest.id}
                  guest={guest}
                  isSelected={canvas.selectedGuestIds.includes(guest.id)}
                  isNearTable={nearbyTableId !== null && draggedGuestId === guest.id}
                  isNewlyAdded={newlyAddedGuestId === guest.id}
                />
              ))}

            {/* Alignment guides */}
            {alignmentGuides.map((guide, index) => (
              <div
                key={`guide-${index}`}
                className={`alignment-guide alignment-guide-${guide.type}`}
                style={
                  guide.type === 'horizontal'
                    ? {
                        top: guide.position,
                        left: guide.start,
                        width: guide.end - guide.start,
                      }
                    : {
                        left: guide.position,
                        top: guide.start,
                        height: guide.end - guide.start,
                      }
                }
              />
            ))}

            {/* Selection Rectangle (Marquee) */}
            {isMarqueeSelecting && marqueeStart && marqueeEnd && (
              <div
                className="selection-rectangle"
                style={{
                  left: Math.min(marqueeStart.x, marqueeEnd.x),
                  top: Math.min(marqueeStart.y, marqueeEnd.y),
                  width: Math.abs(marqueeEnd.x - marqueeStart.x),
                  height: Math.abs(marqueeEnd.y - marqueeStart.y),
                }}
              />
            )}
          </div>

          {/* Grid overlay */}
          {canvasPrefs.showGrid && (
            <div
              className="canvas-grid-overlay"
              style={{
                backgroundSize: `${canvasPrefs.gridSize * canvas.zoom}px ${canvasPrefs.gridSize * canvas.zoom}px`,
                backgroundPosition: `${canvas.panX}px ${canvas.panY}px`,
              }}
            />
          )}

          {event.tables.length === 0 && event.guests.filter((g) => !g.tableId).length === 0 && (
            <div className="canvas-empty">
              <h2>Welcome to Seatify!</h2>
              <p>Click "Add Table" above to create tables, then drag guests from the sidebar to assign seats.</p>
            </div>
          )}
        </div>

        <DragOverlay>
          {draggedGuest && (
            dragType === 'canvas-guest' || dragType === 'seated-guest' ? (
              <div className="canvas-guest-overlay">
                <div className="canvas-guest-circle">
                  <span className="initials">
                    {getInitials(draggedGuest)}
                  </span>
                </div>
              </div>
            ) : (
              <GuestChip guest={draggedGuest} isDragging />
            )
          )}
        </DragOverlay>
      </DndContext>

      <CanvasMinimap />
      <CanvasSearch />
      <TablePropertiesPanel />
      <SelectionToolbar />
      <LayoutToolbar />

      {/* Context Menu */}
      {contextMenu.isOpen && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={getContextMenuItems()}
          onClose={closeContextMenu}
        />
      )}

      {/* Relationships Panel */}
      {showRelationships && (
        <div className="relationships-panel">
          <div className="relationships-panel-header">
            <h3>Guest Relationships</h3>
            <button className="close-btn" onClick={() => setShowRelationships(false)}>×</button>
          </div>
          <RelationshipMatrix />
        </div>
      )}

      {/* Import Wizard */}
      <ImportWizard
        isOpen={showImportWizard}
        onClose={() => setShowImportWizard(false)}
      />

      {/* QR Code Modal */}
      {qrModalTableId && (
        <QRCodeModal
          tableId={qrModalTableId}
          onClose={() => setQrModalTableId(null)}
        />
      )}
    </div>
  );
}
