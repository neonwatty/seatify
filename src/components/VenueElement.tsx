import { useDraggable } from '@dnd-kit/core';
import { useStore } from '../store/useStore';
import { useSyncToSupabase } from '../hooks/useSyncToSupabase';
import type { VenueElement } from '../types';
import './VenueElement.css';

interface VenueElementComponentProps {
  element: VenueElement;
  isSelected: boolean;
}

// Icons for each venue element type
const VENUE_ICONS: Record<VenueElement['type'], string> = {
  'dance-floor': '💃',
  'stage': '🎭',
  'dj-booth': '🎧',
  'bar': '🍸',
  'buffet': '🍽️',
  'entrance': '🚪',
  'exit': '🚪',
  'photo-booth': '📸',
};

export function VenueElementComponent({ element, isSelected }: VenueElementComponentProps) {
  const { selectVenueElement } = useStore();
  const { removeVenueElement } = useSyncToSupabase();

  const { attributes, listeners, setNodeRef, isDragging, transform } = useDraggable({
    id: element.id,
    data: { type: 'venue-element' },
  });

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    selectVenueElement(element.id);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`Delete ${element.label}?`)) {
      removeVenueElement(element.id);
    }
  };

  return (
    <div
      ref={setNodeRef}
      className={`venue-element ${element.type} ${isSelected ? 'selected' : ''} ${isDragging ? 'dragging' : ''}`}
      style={{
        left: element.x,
        top: element.y,
        width: element.width,
        height: element.height,
        transform: transform ? `translate(${transform.x}px, ${transform.y}px)` : undefined,
      }}
      onClick={handleClick}
      {...attributes}
      {...listeners}
    >
      <div className="element-surface">
        <span className="element-icon">{VENUE_ICONS[element.type]}</span>
        <span className="element-label">{element.label}</span>
      </div>

      {isSelected && (
        <button className="element-delete" onClick={handleDelete} title="Delete element">
          ×
        </button>
      )}
    </div>
  );
}
