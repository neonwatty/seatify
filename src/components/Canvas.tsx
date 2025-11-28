import { useRef, useState, useCallback } from 'react';
import {
  DndContext,
  DragOverlay,
  useSensor,
  useSensors,
  PointerSensor,
} from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { useStore } from '../store/useStore';
import { TableComponent } from './Table';
import { GuestChip } from './GuestChip';
import type { TableShape } from '../types';
import './Canvas.css';

export function Canvas() {
  const canvasRef = useRef<HTMLDivElement>(null);
  const {
    event,
    canvas,
    setZoom,
    setPan,
    moveTable,
    assignGuestToTable,
    addTable,
    selectTable,
  } = useStore();

  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [draggedGuestId, setDraggedGuestId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
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
      if (e.button === 1 || (e.button === 0 && e.shiftKey)) {
        setIsPanning(true);
        setPanStart({ x: e.clientX - canvas.panX, y: e.clientY - canvas.panY });
      }
    },
    [canvas.panX, canvas.panY]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isPanning) {
        setPan(e.clientX - panStart.x, e.clientY - panStart.y);
      }
    },
    [isPanning, panStart, setPan]
  );

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    if (active.data.current?.type === 'guest') {
      setDraggedGuestId(active.id as string);
    }
  };

  const handleDragEnd = (dragEvent: DragEndEvent) => {
    const { active, over, delta } = dragEvent;
    setDraggedGuestId(null);

    if (active.data.current?.type === 'table') {
      const table = event.tables.find((t) => t.id === active.id);
      if (table) {
        moveTable(active.id as string, table.x + delta.x / canvas.zoom, table.y + delta.y / canvas.zoom);
      }
    } else if (active.data.current?.type === 'guest') {
      if (over?.data.current?.type === 'table') {
        assignGuestToTable(active.id as string, over.id as string);
      } else if (!over) {
        assignGuestToTable(active.id as string, undefined);
      }
    }
  };

  const handleAddTable = (shape: TableShape) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) {
      const centerX = (rect.width / 2 - canvas.panX) / canvas.zoom;
      const centerY = (rect.height / 2 - canvas.panY) / canvas.zoom;
      addTable(shape, centerX, centerY);
    }
  };

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (e.target === canvasRef.current) {
      selectTable(null);
    }
  };

  const draggedGuest = draggedGuestId
    ? event.guests.find((g) => g.id === draggedGuestId)
    : null;

  return (
    <div className="canvas-container">
      <div className="canvas-toolbar">
        <div className="toolbar-group">
          <button onClick={() => handleAddTable('round')} title="Add Round Table">
            ⭕ Round
          </button>
          <button onClick={() => handleAddTable('rectangle')} title="Add Rectangle Table">
            ▭ Rectangle
          </button>
          <button onClick={() => handleAddTable('square')} title="Add Square Table">
            ⬜ Square
          </button>
        </div>
        <div className="toolbar-group">
          <button onClick={() => setZoom(canvas.zoom - 0.1)}>−</button>
          <span className="zoom-display">{Math.round(canvas.zoom * 100)}%</span>
          <button onClick={() => setZoom(canvas.zoom + 0.1)}>+</button>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div
          ref={canvasRef}
          className="canvas"
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onClick={handleCanvasClick}
          style={{ cursor: isPanning ? 'grabbing' : 'default' }}
        >
          <div
            className="canvas-content"
            style={{
              transform: `translate(${canvas.panX}px, ${canvas.panY}px) scale(${canvas.zoom})`,
              transformOrigin: '0 0',
            }}
          >
            {event.tables.map((table) => (
              <TableComponent
                key={table.id}
                table={table}
                guests={event.guests.filter((g) => g.tableId === table.id)}
                isSelected={canvas.selectedTableId === table.id}
              />
            ))}
          </div>

          {event.tables.length === 0 && (
            <div className="canvas-empty">
              <p>No tables yet!</p>
              <p>Click the buttons above to add tables to your floor plan.</p>
            </div>
          )}
        </div>

        <DragOverlay>
          {draggedGuest && (
            <GuestChip guest={draggedGuest} isDragging />
          )}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
