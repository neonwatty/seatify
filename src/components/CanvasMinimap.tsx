import { useState, useMemo, useCallback, useRef } from 'react';
import { useStore } from '../store/useStore';
import './CanvasMinimap.css';

const MINIMAP_WIDTH = 180;
const MINIMAP_HEIGHT = 120;
const PADDING = 20;

export function CanvasMinimap() {
  const { event, canvas, setPan } = useStore();
  const [isDragging, setIsDragging] = useState(false);
  const [hoveredTableId, setHoveredTableId] = useState<string | null>(null);
  const minimapRef = useRef<SVGSVGElement>(null);

  // Calculate bounds of all content
  const bounds = useMemo(() => {
    const tables = event.tables;
    const elements = event.venueElements || [];

    if (tables.length === 0 && elements.length === 0) {
      return { minX: 0, minY: 0, maxX: 1000, maxY: 800 };
    }

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    for (const table of tables) {
      minX = Math.min(minX, table.x);
      minY = Math.min(minY, table.y);
      maxX = Math.max(maxX, table.x + table.width);
      maxY = Math.max(maxY, table.y + table.height);
    }

    for (const el of elements) {
      minX = Math.min(minX, el.x);
      minY = Math.min(minY, el.y);
      maxX = Math.max(maxX, el.x + el.width);
      maxY = Math.max(maxY, el.y + el.height);
    }

    // Add some padding
    return {
      minX: minX - PADDING,
      minY: minY - PADDING,
      maxX: maxX + PADDING,
      maxY: maxY + PADDING,
    };
  }, [event.tables, event.venueElements]);

  const contentWidth = bounds.maxX - bounds.minX;
  const contentHeight = bounds.maxY - bounds.minY;

  // Scale factor to fit content in minimap
  const scale = Math.min(
    MINIMAP_WIDTH / contentWidth,
    MINIMAP_HEIGHT / contentHeight,
    1 // Don't scale up
  );

  // Viewport indicator position
  const viewportWidth = window.innerWidth - 280; // Subtract sidebar width approximately
  const viewportHeight = window.innerHeight - 120; // Subtract toolbar height approximately

  const viewportRect = {
    x: (-canvas.panX / canvas.zoom - bounds.minX) * scale,
    y: (-canvas.panY / canvas.zoom - bounds.minY) * scale,
    width: (viewportWidth / canvas.zoom) * scale,
    height: (viewportHeight / canvas.zoom) * scale,
  };

  // Handle click on minimap to navigate
  const handleClick = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!minimapRef.current) return;

    const rect = minimapRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Convert minimap coordinates to canvas coordinates
    const canvasX = (clickX / scale) + bounds.minX;
    const canvasY = (clickY / scale) + bounds.minY;

    // Center viewport on clicked point
    const newPanX = viewportWidth / 2 - canvasX * canvas.zoom;
    const newPanY = viewportHeight / 2 - canvasY * canvas.zoom;

    setPan(newPanX, newPanY);
  }, [scale, bounds, canvas.zoom, viewportWidth, viewportHeight, setPan]);

  // Handle dragging viewport
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!isDragging || !minimapRef.current) return;

    const rect = minimapRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Convert minimap coordinates to canvas coordinates (center of viewport)
    const canvasX = (mouseX / scale) + bounds.minX;
    const canvasY = (mouseY / scale) + bounds.minY;

    // Calculate new pan to center on this point
    const newPanX = viewportWidth / 2 - canvasX * canvas.zoom;
    const newPanY = viewportHeight / 2 - canvasY * canvas.zoom;

    setPan(newPanX, newPanY);
  }, [isDragging, scale, bounds, canvas.zoom, viewportWidth, viewportHeight, setPan]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Hide minimap if no content
  if (event.tables.length === 0 && (!event.venueElements || event.venueElements.length === 0)) {
    return null;
  }

  const hoveredTable = hoveredTableId
    ? event.tables.find(t => t.id === hoveredTableId)
    : null;

  return (
    <div className="canvas-minimap">
      <svg
        ref={minimapRef}
        width={MINIMAP_WIDTH}
        height={MINIMAP_HEIGHT}
        onClick={handleClick}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Background */}
        <rect
          width={MINIMAP_WIDTH}
          height={MINIMAP_HEIGHT}
          fill="var(--color-bg-secondary)"
          rx={4}
        />

        {/* Venue elements */}
        {(event.venueElements || []).map(element => (
          <rect
            key={element.id}
            x={(element.x - bounds.minX) * scale}
            y={(element.y - bounds.minY) * scale}
            width={element.width * scale}
            height={element.height * scale}
            fill="var(--color-text-secondary)"
            opacity={0.3}
            rx={2}
          />
        ))}

        {/* Tables */}
        {event.tables.map(table => {
          const guestCount = event.guests.filter(g => g.tableId === table.id).length;
          const isFull = guestCount >= table.capacity;
          const isSelected = canvas.selectedTableIds.includes(table.id);

          return (
            <rect
              key={table.id}
              x={(table.x - bounds.minX) * scale}
              y={(table.y - bounds.minY) * scale}
              width={table.width * scale}
              height={table.height * scale}
              rx={table.shape === 'round' || table.shape === 'oval' ? (table.width * scale) / 2 : 2}
              fill={isSelected ? 'var(--color-primary)' : isFull ? 'var(--color-success)' : 'var(--color-primary-light)'}
              stroke={isSelected ? 'var(--color-primary)' : 'none'}
              strokeWidth={2}
              opacity={isSelected ? 1 : 0.8}
              className="minimap-table"
              onMouseEnter={() => setHoveredTableId(table.id)}
              onMouseLeave={() => setHoveredTableId(null)}
            />
          );
        })}

        {/* Viewport indicator */}
        <rect
          x={Math.max(0, viewportRect.x)}
          y={Math.max(0, viewportRect.y)}
          width={Math.min(viewportRect.width, MINIMAP_WIDTH - viewportRect.x)}
          height={Math.min(viewportRect.height, MINIMAP_HEIGHT - viewportRect.y)}
          fill="none"
          stroke="var(--color-text)"
          strokeWidth={2}
          strokeDasharray="4 2"
          rx={2}
          className="viewport-indicator"
          onMouseDown={handleMouseDown}
          style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
        />
      </svg>

      <div className="minimap-label">
        <span>{event.tables.length} tables</span>
        <span>{Math.round(canvas.zoom * 100)}%</span>
      </div>

      {/* Tooltip */}
      {hoveredTable && (
        <div className="minimap-tooltip">
          <strong>{hoveredTable.name}</strong>
          <span>
            {event.guests.filter(g => g.tableId === hoveredTable.id).length}/{hoveredTable.capacity} guests
          </span>
        </div>
      )}
    </div>
  );
}
