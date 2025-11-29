import { useStore } from '../store/useStore';
import type { TableShape } from '../types';
import './TablePropertiesPanel.css';

export function TablePropertiesPanel() {
  const { event, canvas, updateTable, removeTable, selectTable } = useStore();

  // Only show panel when exactly one table is selected
  const selectedTable = canvas.selectedTableIds.length === 1
    ? event.tables.find((t) => t.id === canvas.selectedTableIds[0])
    : null;

  if (!selectedTable) return null;

  const assignedGuests = event.guests.filter((g) => g.tableId === selectedTable.id);

  const handleCapacityChange = (newCapacity: number) => {
    const minCapacity = Math.max(1, assignedGuests.length);
    const capacity = Math.max(minCapacity, Math.min(20, newCapacity));
    updateTable(selectedTable.id, { capacity });
  };

  const handleSizePreset = (preset: 'small' | 'medium' | 'large') => {
    const roundSizes = {
      small: { width: 80, height: 80 },
      medium: { width: 120, height: 120 },
      large: { width: 160, height: 160 },
    };
    const rectangleSizes = {
      small: { width: 140, height: 60 },
      medium: { width: 200, height: 80 },
      large: { width: 260, height: 100 },
    };
    const squareSizes = {
      small: { width: 80, height: 80 },
      medium: { width: 100, height: 100 },
      large: { width: 140, height: 140 },
    };
    const ovalSizes = {
      small: { width: 140, height: 90 },
      medium: { width: 180, height: 120 },
      large: { width: 240, height: 160 },
    };
    const halfRoundSizes = {
      small: { width: 120, height: 60 },
      medium: { width: 160, height: 80 },
      large: { width: 200, height: 100 },
    };
    const serpentineSizes = {
      small: { width: 200, height: 80 },
      medium: { width: 300, height: 100 },
      large: { width: 400, height: 120 },
    };

    const sizeMaps: Record<TableShape, Record<string, { width: number; height: number }>> = {
      round: roundSizes,
      rectangle: rectangleSizes,
      square: squareSizes,
      oval: ovalSizes,
      'half-round': halfRoundSizes,
      serpentine: serpentineSizes,
    };

    updateTable(selectedTable.id, sizeMaps[selectedTable.shape][preset]);
  };

  const handleShapeChange = (shape: TableShape) => {
    updateTable(selectedTable.id, { shape });
  };

  const handleDelete = () => {
    if (
      confirm(
        `Delete ${selectedTable.name}?${
          assignedGuests.length > 0
            ? ` ${assignedGuests.length} guest${assignedGuests.length > 1 ? 's' : ''} will be unassigned.`
            : ''
        }`
      )
    ) {
      removeTable(selectedTable.id);
    }
  };

  return (
    <div className="table-properties-panel">
      <div className="panel-header">
        <h3>Table Settings</h3>
        <button className="close-btn" onClick={() => selectTable(null)} title="Close panel">
          ×
        </button>
      </div>

      <div className="property-group">
        <label>Name</label>
        <input
          type="text"
          value={selectedTable.name}
          onChange={(e) => updateTable(selectedTable.id, { name: e.target.value })}
        />
      </div>

      <div className="property-group">
        <label>Shape</label>
        <div className="shape-selector">
          <button
            className={selectedTable.shape === 'round' ? 'active' : ''}
            onClick={() => handleShapeChange('round')}
            title="Round"
          >
            ⭕
          </button>
          <button
            className={selectedTable.shape === 'rectangle' ? 'active' : ''}
            onClick={() => handleShapeChange('rectangle')}
            title="Rectangle"
          >
            ▭
          </button>
          <button
            className={selectedTable.shape === 'square' ? 'active' : ''}
            onClick={() => handleShapeChange('square')}
            title="Square"
          >
            ⬜
          </button>
          <button
            className={selectedTable.shape === 'oval' ? 'active' : ''}
            onClick={() => handleShapeChange('oval')}
            title="Oval"
          >
            ⬭
          </button>
          <button
            className={selectedTable.shape === 'half-round' ? 'active' : ''}
            onClick={() => handleShapeChange('half-round')}
            title="Half-Round"
          >
            ◗
          </button>
          <button
            className={selectedTable.shape === 'serpentine' ? 'active' : ''}
            onClick={() => handleShapeChange('serpentine')}
            title="Serpentine (Buffet)"
          >
            〰️
          </button>
        </div>
      </div>

      <div className="property-group">
        <label>Capacity</label>
        <div className="capacity-control">
          <button
            onClick={() => handleCapacityChange(selectedTable.capacity - 1)}
            disabled={selectedTable.capacity <= assignedGuests.length || selectedTable.capacity <= 1}
          >
            −
          </button>
          <input
            type="number"
            min={Math.max(1, assignedGuests.length)}
            max={20}
            value={selectedTable.capacity}
            onChange={(e) => handleCapacityChange(parseInt(e.target.value) || 1)}
          />
          <button
            onClick={() => handleCapacityChange(selectedTable.capacity + 1)}
            disabled={selectedTable.capacity >= 20}
          >
            +
          </button>
        </div>
        <span className="capacity-hint">
          {assignedGuests.length} of {selectedTable.capacity} seats filled
        </span>
      </div>

      <div className="property-group">
        <label>Size Presets</label>
        <div className="size-presets">
          <button onClick={() => handleSizePreset('small')}>Small</button>
          <button onClick={() => handleSizePreset('medium')}>Medium</button>
          <button onClick={() => handleSizePreset('large')}>Large</button>
        </div>
      </div>

      <div className="property-group">
        <label>Dimensions</label>
        <div className="dimension-inputs">
          <div>
            <span>W</span>
            <input
              type="number"
              min={60}
              max={300}
              value={selectedTable.width}
              onChange={(e) => updateTable(selectedTable.id, { width: parseInt(e.target.value) || 100 })}
            />
          </div>
          <div>
            <span>H</span>
            <input
              type="number"
              min={60}
              max={300}
              value={selectedTable.height}
              onChange={(e) => updateTable(selectedTable.id, { height: parseInt(e.target.value) || 100 })}
            />
          </div>
        </div>
      </div>

      <div className="panel-actions">
        <button className="delete-btn" onClick={handleDelete}>
          Delete Table
        </button>
      </div>

      {assignedGuests.length > 0 && (
        <div className="assigned-guests">
          <label>Assigned Guests ({assignedGuests.length})</label>
          <ul>
            {assignedGuests.map((guest) => (
              <li key={guest.id}>{guest.name}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
