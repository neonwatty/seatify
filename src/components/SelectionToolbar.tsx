import { useState } from 'react';
import { useStore } from '../store/useStore';
import './SelectionToolbar.css';

export function SelectionToolbar() {
  const {
    event,
    canvas,
    batchAssignGuests,
    batchRemoveGuests,
    batchRemoveTables,
    clearAllSelection,
    pushHistory,
  } = useStore();

  const [showTableDropdown, setShowTableDropdown] = useState(false);

  const selectedGuestCount = canvas.selectedGuestIds.length;
  const selectedTableCount = canvas.selectedTableIds.length;
  const totalSelected = selectedGuestCount + selectedTableCount;

  if (totalSelected === 0) return null;

  const handleAssignToTable = (tableId: string) => {
    pushHistory('Batch assign guests');
    batchAssignGuests(canvas.selectedGuestIds, tableId);
    setShowTableDropdown(false);
  };

  const handleDelete = () => {
    const confirmMsg = selectedGuestCount > 0
      ? `Delete ${selectedGuestCount} guest${selectedGuestCount > 1 ? 's' : ''}?`
      : `Delete ${selectedTableCount} table${selectedTableCount > 1 ? 's' : ''}? All guests will be unassigned.`;

    if (confirm(confirmMsg)) {
      pushHistory('Batch delete');
      if (selectedGuestCount > 0) {
        batchRemoveGuests(canvas.selectedGuestIds);
      }
      if (selectedTableCount > 0) {
        batchRemoveTables(canvas.selectedTableIds);
      }
    }
  };

  const getSelectionLabel = () => {
    if (selectedGuestCount > 0 && selectedTableCount > 0) {
      return `${selectedGuestCount} guest${selectedGuestCount > 1 ? 's' : ''}, ${selectedTableCount} table${selectedTableCount > 1 ? 's' : ''}`;
    }
    if (selectedGuestCount > 0) {
      return `${selectedGuestCount} guest${selectedGuestCount > 1 ? 's' : ''} selected`;
    }
    return `${selectedTableCount} table${selectedTableCount > 1 ? 's' : ''} selected`;
  };

  return (
    <div className="selection-toolbar">
      <span className="selection-count">{getSelectionLabel()}</span>

      {selectedGuestCount > 0 && (
        <div className="selection-toolbar-dropdown">
          <button
            className="selection-toolbar-button"
            onClick={() => setShowTableDropdown(!showTableDropdown)}
          >
            Assign to Table
            <span className="dropdown-arrow">▾</span>
          </button>
          {showTableDropdown && (
            <div className="selection-dropdown-menu">
              {event.tables.map((table) => {
                const guestCount = event.guests.filter((g) => g.tableId === table.id).length;
                const availableSeats = table.capacity - guestCount;
                const canFit = availableSeats >= selectedGuestCount;

                return (
                  <button
                    key={table.id}
                    onClick={() => handleAssignToTable(table.id)}
                    className={`dropdown-item ${!canFit ? 'warning' : ''}`}
                    title={!canFit ? `Only ${availableSeats} seats available` : undefined}
                  >
                    <span>{table.name}</span>
                    <span className="seat-count">
                      {guestCount}/{table.capacity}
                    </span>
                  </button>
                );
              })}
              {event.tables.length === 0 && (
                <div className="dropdown-empty">No tables available</div>
              )}
            </div>
          )}
        </div>
      )}

      <button className="selection-toolbar-button danger" onClick={handleDelete}>
        Delete
      </button>

      <button className="selection-toolbar-button clear" onClick={clearAllSelection}>
        ×
      </button>
    </div>
  );
}
