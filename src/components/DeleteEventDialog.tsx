import { useStore } from '../store/useStore';
import type { Event } from '../types';
import './DeleteEventDialog.css';

interface DeleteEventDialogProps {
  event: Event;
  onClose: () => void;
}

export function DeleteEventDialog({ event, onClose }: DeleteEventDialogProps) {
  const { deleteEvent } = useStore();

  const handleDelete = () => {
    deleteEvent(event.id);
    onClose();
  };

  const guestCount = event.guests.length;
  const tableCount = event.tables.length;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="delete-event-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-icon">⚠️</div>
        <h2>Delete Event?</h2>
        <p className="event-name-display">{event.name}</p>

        <div className="warning-text">
          This action cannot be undone. All data associated with this event will be permanently deleted:
        </div>

        {(guestCount > 0 || tableCount > 0) && (
          <div className="deletion-summary">
            {guestCount > 0 && (
              <div className="summary-item">
                <span className="summary-icon">👥</span>
                <span>{guestCount} guest{guestCount !== 1 ? 's' : ''}</span>
              </div>
            )}
            {tableCount > 0 && (
              <div className="summary-item">
                <span className="summary-icon">🪑</span>
                <span>{tableCount} table{tableCount !== 1 ? 's' : ''}</span>
              </div>
            )}
          </div>
        )}

        <div className="dialog-actions">
          <button className="btn-cancel" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-delete" onClick={handleDelete}>
            Delete Event
          </button>
        </div>
      </div>
    </div>
  );
}
