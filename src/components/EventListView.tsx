import { useState } from 'react';
import { useStore } from '../store/useStore';
import { EventFormModal } from './EventFormModal';
import { DeleteEventDialog } from './DeleteEventDialog';
import type { Event } from '../types';
import './EventListView.css';

const MAX_EVENTS = 10;

// Event type badge colors
const eventTypeBadges: Record<Event['eventType'], { label: string; className: string }> = {
  wedding: { label: 'Wedding', className: 'badge-wedding' },
  corporate: { label: 'Corporate', className: 'badge-corporate' },
  gala: { label: 'Gala', className: 'badge-gala' },
  party: { label: 'Party', className: 'badge-party' },
  other: { label: 'Other', className: 'badge-other' },
};

export function EventListView() {
  const {
    events,
    switchEvent,
    setActiveView,
    canCreateEvent,
  } = useStore();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [deletingEvent, setDeletingEvent] = useState<Event | null>(null);

  const handleEventClick = (eventId: string) => {
    switchEvent(eventId);
    setActiveView('canvas');
  };

  const handleEditClick = (e: React.MouseEvent, event: Event) => {
    e.stopPropagation();
    setEditingEvent(event);
  };

  const handleDeleteClick = (e: React.MouseEvent, event: Event) => {
    e.stopPropagation();
    setDeletingEvent(event);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return null;
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const sortedEvents = [...events].sort((a, b) => {
    // Sort by updatedAt descending (most recent first)
    const aTime = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
    const bTime = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
    return bTime - aTime;
  });

  return (
    <div className="event-list-view">
      <div className="event-list-header">
        <div className="header-content">
          <h1>Your Events</h1>
          <p className="header-subtitle">Select an event to continue planning or create a new one.</p>
        </div>
        <button
          className="create-event-btn"
          onClick={() => setShowCreateModal(true)}
          disabled={!canCreateEvent()}
          title={!canCreateEvent() ? `Maximum of ${MAX_EVENTS} events reached` : undefined}
        >
          <span className="btn-icon">+</span>
          Create Event
        </button>
      </div>

      {!canCreateEvent() && (
        <div className="limit-warning">
          You've reached the maximum of {MAX_EVENTS} events. Delete an event to create a new one.
        </div>
      )}

      {events.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📋</div>
          <h2>No events yet</h2>
          <p>Create your first event to start planning seating arrangements.</p>
          <button className="create-first-btn" onClick={() => setShowCreateModal(true)}>
            <span className="btn-icon">+</span>
            Create Your First Event
          </button>
        </div>
      ) : (
        <>
          <div className="event-cards-grid">
            {sortedEvents.map((event) => {
              const guestCount = event.guests.length;
              const tableCount = event.tables.length;
              const badge = eventTypeBadges[event.eventType] || eventTypeBadges.other;

              return (
                <div
                  key={event.id}
                  className="event-card"
                  onClick={() => handleEventClick(event.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      handleEventClick(event.id);
                    }
                  }}
                >
                  <div className="event-card-header">
                    <h3 className="event-name">{event.name}</h3>
                    <span className={`event-type-badge ${badge.className}`}>
                      {badge.label}
                    </span>
                  </div>

                  {event.date && (
                    <div className="event-date">
                      <span className="date-icon">📅</span>
                      {formatDate(event.date)}
                    </div>
                  )}

                  {event.venueName && (
                    <div className="event-venue">
                      <span className="venue-icon">📍</span>
                      {event.venueName}
                    </div>
                  )}

                  <div className="event-card-stats">
                    <div className="stat">
                      <span className="stat-icon">👥</span>
                      <span className="stat-value">{guestCount}</span>
                      <span className="stat-label">guest{guestCount !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="stat">
                      <span className="stat-icon">🪑</span>
                      <span className="stat-value">{tableCount}</span>
                      <span className="stat-label">table{tableCount !== 1 ? 's' : ''}</span>
                    </div>
                  </div>

                  <div className="event-card-actions">
                    <button
                      className="card-action-btn edit"
                      onClick={(e) => handleEditClick(e, event)}
                      title="Edit event details"
                    >
                      Edit
                    </button>
                    <button
                      className="card-action-btn delete"
                      onClick={(e) => handleDeleteClick(e, event)}
                      title="Delete event"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="event-count">
            Showing {events.length} of {MAX_EVENTS} events
          </div>
        </>
      )}

      {showCreateModal && (
        <EventFormModal
          mode="create"
          onClose={() => setShowCreateModal(false)}
        />
      )}

      {editingEvent && (
        <EventFormModal
          mode="edit"
          event={editingEvent}
          onClose={() => setEditingEvent(null)}
        />
      )}

      {deletingEvent && (
        <DeleteEventDialog
          event={deletingEvent}
          onClose={() => setDeletingEvent(null)}
        />
      )}
    </div>
  );
}
