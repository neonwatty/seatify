import { useState } from 'react';
import { useDrag } from '@use-gesture/react';
import { useStore } from '../store/useStore';
import { getFullName } from '../types';
import { useIsMobile } from '../hooks/useResponsive';
import { QRCodeModal } from './QRCodeModal';
import type { TableShape } from '../types';
import './TablePropertiesPanel.css';

export function TablePropertiesPanel() {
  const {
    event,
    canvas,
    updateTable,
    removeTable,
    selectTable,
    duplicateTable,
    rotateTable,
  } = useStore();
  const isMobile = useIsMobile();
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [dragY, setDragY] = useState(0);
  const [showQRModal, setShowQRModal] = useState(false);

  // Only show panel when exactly one table is selected
  const selectedTable =
    canvas.selectedTableIds.length === 1
      ? event.tables.find((t) => t.id === canvas.selectedTableIds[0])
      : null;

  // Swipe to dismiss gesture (mobile only)
  const bind = useDrag(
    ({ movement: [, my], velocity: [, vy], direction: [, dy], last }) => {
      if (!isMobile) return;

      if (last) {
        // Dismiss if dragged down > 100px or fast swipe down
        if (my > 100 || (vy > 0.5 && dy > 0)) {
          selectTable(null);
        }
        setDragY(0);
      } else {
        // Only track downward movement
        setDragY(Math.max(0, my));
      }
    },
    { axis: 'y', filterTaps: true }
  );

  if (!selectedTable) return null;

  const assignedGuests = event.guests.filter((g) => g.tableId === selectedTable.id);

  // Table navigation
  const tableIndex = event.tables.findIndex((t) => t.id === selectedTable.id);
  const totalTables = event.tables.length;

  const goToPrevTable = () => {
    const prevIndex = (tableIndex - 1 + totalTables) % totalTables;
    selectTable(event.tables[prevIndex].id);
  };

  const goToNextTable = () => {
    const nextIndex = (tableIndex + 1) % totalTables;
    selectTable(event.tables[nextIndex].id);
  };

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

  const handleDuplicate = () => {
    duplicateTable(selectedTable.id);
  };

  const handleRotate = () => {
    rotateTable(selectedTable.id, 45);
  };

  return (
    <>
      {/* Backdrop for mobile */}
      {isMobile && (
        <div
          className="table-panel-backdrop"
          onClick={() => selectTable(null)}
          aria-hidden="true"
        />
      )}

      <div
        className={`table-properties-panel ${isMobile ? 'mobile' : ''}`}
        style={isMobile && dragY > 0 ? { transform: `translateY(${dragY}px)` } : undefined}
      >
        {/* Drag handle for mobile */}
        {isMobile && (
          <div className="panel-drag-handle" {...bind()} aria-hidden="true">
            <div className="drag-handle-bar" />
          </div>
        )}

        <div className="panel-header">
          {/* Table navigation */}
          {totalTables > 1 && (
            <button
              className="nav-btn"
              onClick={goToPrevTable}
              title="Previous table"
              aria-label="Previous table"
            >
              ‹
            </button>
          )}
          <div className="panel-title">
            <h3>{selectedTable.name}</h3>
            {totalTables > 1 && (
              <span className="table-counter">
                {tableIndex + 1} of {totalTables}
              </span>
            )}
          </div>
          {totalTables > 1 && (
            <button
              className="nav-btn"
              onClick={goToNextTable}
              title="Next table"
              aria-label="Next table"
            >
              ›
            </button>
          )}
          <button
            className="close-btn"
            onClick={() => selectTable(null)}
            title="Close panel"
            aria-label="Close panel"
          >
            ×
          </button>
        </div>

        {/* Quick actions bar */}
        <div className="quick-actions">
          <button
            className="quick-action-btn"
            onClick={handleDuplicate}
            title="Duplicate table"
            aria-label="Duplicate table"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
              <path
                fill="currentColor"
                d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"
              />
            </svg>
            <span>Duplicate</span>
          </button>
          <button
            className="quick-action-btn"
            onClick={handleRotate}
            title="Rotate 45°"
            aria-label="Rotate table 45 degrees"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
              <path
                fill="currentColor"
                d="M7.11 8.53L5.7 7.11C4.8 8.27 4.24 9.61 4.07 11h2.02c.14-.87.49-1.72 1.02-2.47zM6.09 13H4.07c.17 1.39.72 2.73 1.62 3.89l1.41-1.42c-.52-.75-.87-1.59-1.01-2.47zm1.01 5.32c1.16.9 2.51 1.44 3.9 1.61V17.9c-.87-.15-1.71-.49-2.46-1.03L7.1 18.32zM13 4.07V1L8.45 5.55 13 10V6.09c2.84.48 5 2.94 5 5.91s-2.16 5.43-5 5.91v2.02c3.95-.49 7-3.85 7-7.93s-3.05-7.44-7-7.93z"
              />
            </svg>
            <span>Rotate</span>
          </button>
          <button
            className="quick-action-btn"
            onClick={() => setShowQRModal(true)}
            title="Generate QR Code"
            aria-label="Generate QR Code"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
              <path
                fill="currentColor"
                d="M3 11h8V3H3v8zm2-6h4v4H5V5zm8-2v8h8V3h-8zm6 6h-4V5h4v4zM3 21h8v-8H3v8zm2-6h4v4H5v-4zm13 2h-2v4h2v2h2v-2h2v-2h-2v-4h-2v2zm0-6h2v2h-2v-2zm-4 2h2v4h-2v-4zm-2 2h2v2h-2v-2z"
              />
            </svg>
            <span>QR Code</span>
          </button>
          <button
            className="quick-action-btn delete"
            onClick={handleDelete}
            title="Delete table"
            aria-label="Delete table"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
              <path
                fill="currentColor"
                d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"
              />
            </svg>
            <span>Delete</span>
          </button>
        </div>

        {/* Name input */}
        <div className="property-group">
          <label htmlFor="table-name">Name</label>
          <input
            id="table-name"
            type="text"
            value={selectedTable.name}
            onChange={(e) => updateTable(selectedTable.id, { name: e.target.value })}
          />
        </div>

        {/* Shape selector */}
        <div className="property-group">
          <label>Shape</label>
          <div className="shape-selector">
            <button
              className={selectedTable.shape === 'round' ? 'active' : ''}
              onClick={() => handleShapeChange('round')}
              title="Round"
              aria-label="Round table"
              aria-pressed={selectedTable.shape === 'round'}
            >
              ⭕
            </button>
            <button
              className={selectedTable.shape === 'rectangle' ? 'active' : ''}
              onClick={() => handleShapeChange('rectangle')}
              title="Rectangle"
              aria-label="Rectangle table"
              aria-pressed={selectedTable.shape === 'rectangle'}
            >
              ▭
            </button>
            <button
              className={selectedTable.shape === 'square' ? 'active' : ''}
              onClick={() => handleShapeChange('square')}
              title="Square"
              aria-label="Square table"
              aria-pressed={selectedTable.shape === 'square'}
            >
              ⬜
            </button>
            <button
              className={selectedTable.shape === 'oval' ? 'active' : ''}
              onClick={() => handleShapeChange('oval')}
              title="Oval"
              aria-label="Oval table"
              aria-pressed={selectedTable.shape === 'oval'}
            >
              ⬭
            </button>
            <button
              className={selectedTable.shape === 'half-round' ? 'active' : ''}
              onClick={() => handleShapeChange('half-round')}
              title="Half-Round"
              aria-label="Half-round table"
              aria-pressed={selectedTable.shape === 'half-round'}
            >
              ◗
            </button>
            <button
              className={selectedTable.shape === 'serpentine' ? 'active' : ''}
              onClick={() => handleShapeChange('serpentine')}
              title="Serpentine (Buffet)"
              aria-label="Serpentine table"
              aria-pressed={selectedTable.shape === 'serpentine'}
            >
              〰️
            </button>
          </div>
        </div>

        {/* Capacity */}
        <div className="property-group">
          <label>Capacity</label>
          <div className="capacity-control">
            <button
              onClick={() => handleCapacityChange(selectedTable.capacity - 1)}
              disabled={selectedTable.capacity <= assignedGuests.length || selectedTable.capacity <= 1}
              aria-label="Decrease capacity"
            >
              −
            </button>
            <input
              type="number"
              min={Math.max(1, assignedGuests.length)}
              max={20}
              value={selectedTable.capacity}
              onChange={(e) => handleCapacityChange(parseInt(e.target.value) || 1)}
              aria-label="Table capacity"
            />
            <button
              onClick={() => handleCapacityChange(selectedTable.capacity + 1)}
              disabled={selectedTable.capacity >= 20}
              aria-label="Increase capacity"
            >
              +
            </button>
          </div>
          <span className="capacity-hint">
            {assignedGuests.length} of {selectedTable.capacity} seats filled
          </span>
        </div>

        {/* Advanced section (collapsible on mobile) */}
        {isMobile ? (
          <>
            <button
              className="advanced-toggle"
              onClick={() => setShowAdvanced(!showAdvanced)}
              aria-expanded={showAdvanced}
            >
              Advanced Settings
              <span className={`toggle-icon ${showAdvanced ? 'open' : ''}`}>›</span>
            </button>
            {showAdvanced && (
              <div className="advanced-section">
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
                        onChange={(e) =>
                          updateTable(selectedTable.id, { width: parseInt(e.target.value) || 100 })
                        }
                        aria-label="Table width"
                      />
                    </div>
                    <div>
                      <span>H</span>
                      <input
                        type="number"
                        min={60}
                        max={300}
                        value={selectedTable.height}
                        onChange={(e) =>
                          updateTable(selectedTable.id, { height: parseInt(e.target.value) || 100 })
                        }
                        aria-label="Table height"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <>
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
                    onChange={(e) =>
                      updateTable(selectedTable.id, { width: parseInt(e.target.value) || 100 })
                    }
                    aria-label="Table width"
                  />
                </div>
                <div>
                  <span>H</span>
                  <input
                    type="number"
                    min={60}
                    max={300}
                    value={selectedTable.height}
                    onChange={(e) =>
                      updateTable(selectedTable.id, { height: parseInt(e.target.value) || 100 })
                    }
                    aria-label="Table height"
                  />
                </div>
              </div>
            </div>

            <div className="panel-actions">
              <button className="delete-btn" onClick={handleDelete}>
                Delete Table
              </button>
            </div>
          </>
        )}

        {/* Assigned guests list */}
        {assignedGuests.length > 0 && (
          <div className="assigned-guests">
            <label>Assigned Guests ({assignedGuests.length})</label>
            <ul>
              {assignedGuests.map((guest) => (
                <li key={guest.id}>{getFullName(guest)}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* QR Code Modal */}
      {showQRModal && (
        <QRCodeModal
          tableId={selectedTable.id}
          onClose={() => setShowQRModal(false)}
        />
      )}
    </>
  );
}
