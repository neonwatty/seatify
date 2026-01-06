import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { EventFormModal } from './EventFormModal';
import { DeleteEventDialog } from './DeleteEventDialog';
import { MobileSettingsHeader } from './MobileSettingsHeader';
import { EmailCaptureModal } from './EmailCaptureModal';
import { shouldShowEmailCapture } from '../utils/emailCaptureManager';
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

// SVG icons for view toggle
const GridIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
    <rect x="1" y="1" width="6" height="6" rx="1" />
    <rect x="9" y="1" width="6" height="6" rx="1" />
    <rect x="1" y="9" width="6" height="6" rx="1" />
    <rect x="9" y="9" width="6" height="6" rx="1" />
  </svg>
);

const ListIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
    <rect x="1" y="2" width="14" height="2" rx="0.5" />
    <rect x="1" y="7" width="14" height="2" rx="0.5" />
    <rect x="1" y="12" width="14" height="2" rx="0.5" />
  </svg>
);

export function EventListView() {
  const navigate = useNavigate();
  const {
    events,
    switchEvent,
    canCreateEvent,
    eventListViewMode,
    setEventListViewMode,
  } = useStore();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [deletingEvent, setDeletingEvent] = useState<Event | null>(null);
  const [showEmailCapture, setShowEmailCapture] = useState(false);

  // Check if user has already subscribed (don't show button if so)
  const canShowEmailButton = shouldShowEmailCapture('guestMilestone') ||
                             shouldShowEmailCapture('optimizerSuccess') ||
                             shouldShowEmailCapture('exportAttempt');

  const handleEventClick = (eventId: string) => {
    switchEvent(eventId);
    navigate(`/events/${eventId}/canvas`);
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
      {/* Mobile Settings Header - only visible on mobile */}
      <div className="mobile-settings-container">
        <MobileSettingsHeader
          onSubscribe={() => setShowEmailCapture(true)}
          canShowEmailButton={canShowEmailButton}
        />
      </div>

      <div className="event-list-header">
        <div className="header-content">
          <h1>Your Events</h1>
          <p className="header-subtitle">Select an event to continue planning or create a new one.</p>
        </div>
        <div className="header-actions">
          <div className="view-toggle" role="group" aria-label="View mode">
            <button
              className={`view-toggle-btn ${eventListViewMode === 'cards' ? 'active' : ''}`}
              onClick={() => setEventListViewMode('cards')}
              aria-pressed={eventListViewMode === 'cards'}
              title="Card view"
            >
              <GridIcon />
              <span className="view-toggle-label">Cards</span>
            </button>
            <button
              className={`view-toggle-btn ${eventListViewMode === 'list' ? 'active' : ''}`}
              onClick={() => setEventListViewMode('list')}
              aria-pressed={eventListViewMode === 'list'}
              title="List view"
            >
              <ListIcon />
              <span className="view-toggle-label">List</span>
            </button>
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
          {eventListViewMode === 'cards' ? (
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
          ) : (
            <div className="event-list-table" role="list" aria-label="Events list">
              <div className="event-list-header-row">
                <div className="col-name">Name</div>
                <div className="col-type">Type</div>
                <div className="col-date">Date</div>
                <div className="col-guests">Guests</div>
                <div className="col-tables">Tables</div>
                <div className="col-actions">Actions</div>
              </div>
              {sortedEvents.map((event) => {
                const guestCount = event.guests.length;
                const tableCount = event.tables.length;
                const badge = eventTypeBadges[event.eventType] || eventTypeBadges.other;

                return (
                  <div
                    key={event.id}
                    className="event-list-row"
                    onClick={() => handleEventClick(event.id)}
                    role="listitem"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        handleEventClick(event.id);
                      }
                    }}
                  >
                    <div className="col-name">
                      <span className="event-name">{event.name}</span>
                      {event.venueName && (
                        <span className="event-venue-inline">{event.venueName}</span>
                      )}
                    </div>
                    <div className="col-type">
                      <span className={`event-type-badge ${badge.className}`}>
                        {badge.label}
                      </span>
                    </div>
                    <div className="col-date">
                      {formatDate(event.date) || <span className="no-date">-</span>}
                    </div>
                    <div className="col-guests">
                      <span className="stat-value">{guestCount}</span>
                    </div>
                    <div className="col-tables">
                      <span className="stat-value">{tableCount}</span>
                    </div>
                    <div className="col-actions">
                      <button
                        className="list-action-btn edit"
                        onClick={(e) => handleEditClick(e, event)}
                        title="Edit event details"
                      >
                        Edit
                      </button>
                      <button
                        className="list-action-btn delete"
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
          )}

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

      {showEmailCapture && (
        <EmailCaptureModal
          onClose={() => setShowEmailCapture(false)}
          source="landing"
        />
      )}
    </div>
  );
}
