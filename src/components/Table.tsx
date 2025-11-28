import { useDraggable, useDroppable } from '@dnd-kit/core';
import { useStore } from '../store/useStore';
import { GuestChip } from './GuestChip';
import type { Table, Guest } from '../types';
import './Table.css';

interface TableComponentProps {
  table: Table;
  guests: Guest[];
  isSelected: boolean;
}

export function TableComponent({ table, guests, isSelected }: TableComponentProps) {
  const { selectTable, removeTable, updateTable } = useStore();

  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: table.id,
    data: { type: 'table' },
  });

  const { attributes, listeners, setNodeRef: setDraggableRef, isDragging } = useDraggable({
    id: table.id,
    data: { type: 'table' },
  });

  const seatPositions = getSeatPositions(table.shape, table.capacity, table.width, table.height);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    selectTable(table.id);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`Delete ${table.name}? All guests will be unassigned.`)) {
      removeTable(table.id);
    }
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateTable(table.id, { name: e.target.value });
  };

  return (
    <div
      ref={(node) => {
        setDroppableRef(node);
        setDraggableRef(node);
      }}
      className={`table-component ${table.shape} ${isSelected ? 'selected' : ''} ${isOver ? 'drop-target' : ''} ${isDragging ? 'dragging' : ''}`}
      style={{
        left: table.x,
        top: table.y,
        width: table.width,
        height: table.height,
      }}
      onClick={handleClick}
      {...attributes}
      {...listeners}
    >
      <div className="table-surface">
        <div className="table-label">
          {isSelected ? (
            <input
              type="text"
              value={table.name}
              onChange={handleNameChange}
              onClick={(e) => e.stopPropagation()}
              className="table-name-input"
            />
          ) : (
            <span>{table.name}</span>
          )}
          <span className="table-count">
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
            {guest && <GuestChip guest={guest} compact />}
          </div>
        );
      })}

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
