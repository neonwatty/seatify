'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createEvent, updateEvent, deleteEvent } from '@/actions/events';

interface Event {
  id: string;
  name: string;
  event_type: string;
  date: string | null;
  created_at: string;
  tables: { count: number }[];
  guests: { count: number }[];
}

interface EventListClientProps {
  initialEvents: Event[];
}

export function EventListClient({ initialEvents }: EventListClientProps) {
  const [events, setEvents] = useState(initialEvents);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

  // Form state
  const [eventName, setEventName] = useState('');
  const [eventType, setEventType] = useState('wedding');
  const [eventDate, setEventDate] = useState('');

  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventName.trim()) return;

    startTransition(async () => {
      const result = await createEvent(eventName, eventType);

      if (result.error) {
        console.error('Error creating event:', result.error);
        return;
      }

      if (result.data) {
        router.push(`/dashboard/events/${result.data.id}/canvas`);
      }
    });
  };

  const handleEditEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEvent || !eventName.trim()) return;

    startTransition(async () => {
      const result = await updateEvent(selectedEvent.id, {
        name: eventName.trim(),
        event_type: eventType,
        date: eventDate || null,
      });

      if (result.error) {
        console.error('Error updating event:', result.error);
        return;
      }

      // Update local state
      setEvents(events.map(ev =>
        ev.id === selectedEvent.id
          ? { ...ev, name: eventName.trim(), event_type: eventType, date: eventDate || null }
          : ev
      ));

      closeModals();
    });
  };

  const handleDeleteEvent = async () => {
    if (!selectedEvent) return;

    startTransition(async () => {
      const result = await deleteEvent(selectedEvent.id);

      if (result.error) {
        console.error('Error deleting event:', result.error);
        return;
      }

      // Remove from local state
      setEvents(events.filter(ev => ev.id !== selectedEvent.id));
      closeModals();
    });
  };

  const openEditModal = (event: Event, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedEvent(event);
    setEventName(event.name);
    setEventType(event.event_type);
    setEventDate(event.date || '');
    setShowEditModal(true);
  };

  const openDeleteModal = (event: Event, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedEvent(event);
    setShowDeleteModal(true);
  };

  const openCreateModal = () => {
    setEventName('');
    setEventType('wedding');
    setEventDate('');
    setShowCreateModal(true);
  };

  const closeModals = () => {
    setShowCreateModal(false);
    setShowEditModal(false);
    setShowDeleteModal(false);
    setSelectedEvent(null);
    setEventName('');
    setEventType('wedding');
    setEventDate('');
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'No date set';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatEventType = (type: string) => {
    return type.charAt(0).toUpperCase() + type.slice(1).replace('-', ' ');
  };

  return (
    <div className="events-page">
      <div className="events-header">
        <h1>My Events</h1>
        <button
          className="create-event-button"
          onClick={openCreateModal}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 3V13M3 8H13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          New Event
        </button>
      </div>

      {events.length === 0 ? (
        <div className="empty-state">
          <h3>No events yet</h3>
          <p>Create your first event to start planning your seating arrangement.</p>
          <button
            className="create-event-button"
            onClick={openCreateModal}
          >
            Create Your First Event
          </button>
        </div>
      ) : (
        <div className="events-grid">
          {events.map((event) => (
            <div key={event.id} className="event-card-wrapper">
              <Link
                href={`/dashboard/events/${event.id}/canvas`}
                className="event-card"
              >
                <span className="event-type">{formatEventType(event.event_type)}</span>
                <h3>{event.name}</h3>
                <p className="event-date">{formatDate(event.date)}</p>
                <div className="event-stats">
                  <span>{event.tables?.[0]?.count || 0} tables</span>
                  <span>{event.guests?.[0]?.count || 0} guests</span>
                </div>
              </Link>
              <div className="event-card-actions">
                <button
                  className="event-action-btn edit-btn"
                  onClick={(e) => openEditModal(event, e)}
                  title="Edit event"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M11.5 2.5L13.5 4.5M2 14L2.5 11.5L11 3L13 5L4.5 13.5L2 14Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                <button
                  className="event-action-btn delete-btn"
                  onClick={(e) => openDeleteModal(event, e)}
                  title="Delete event"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M3 4H13M6 4V3C6 2.44772 6.44772 2 7 2H9C9.55228 2 10 2.44772 10 3V4M12 4V13C12 13.5523 11.5523 14 11 14H5C4.44772 14 4 13.5523 4 13V4H12Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Event Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={closeModals}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Create New Event</h2>
            <form onSubmit={handleCreateEvent}>
              <div className="form-group">
                <label htmlFor="eventName">Event Name</label>
                <input
                  id="eventName"
                  type="text"
                  placeholder="e.g., Smith-Johnson Wedding"
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                  autoFocus
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="eventType">Event Type</label>
                <select
                  id="eventType"
                  value={eventType}
                  onChange={(e) => setEventType(e.target.value)}
                >
                  <option value="wedding">Wedding</option>
                  <option value="corporate">Corporate Event</option>
                  <option value="gala">Gala</option>
                  <option value="party">Party</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={closeModals}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={isPending || !eventName.trim()}
                >
                  {isPending ? 'Creating...' : 'Create Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Event Modal */}
      {showEditModal && selectedEvent && (
        <div className="modal-overlay" onClick={closeModals}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Edit Event</h2>
            <form onSubmit={handleEditEvent}>
              <div className="form-group">
                <label htmlFor="editEventName">Event Name</label>
                <input
                  id="editEventName"
                  type="text"
                  placeholder="e.g., Smith-Johnson Wedding"
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                  autoFocus
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="editEventType">Event Type</label>
                <select
                  id="editEventType"
                  value={eventType}
                  onChange={(e) => setEventType(e.target.value)}
                >
                  <option value="wedding">Wedding</option>
                  <option value="corporate">Corporate Event</option>
                  <option value="gala">Gala</option>
                  <option value="party">Party</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="editEventDate">Event Date</label>
                <input
                  id="editEventDate"
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={closeModals}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={isPending || !eventName.trim()}
                >
                  {isPending ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedEvent && (
        <div className="modal-overlay" onClick={closeModals}>
          <div className="modal-content delete-modal" onClick={(e) => e.stopPropagation()}>
            <h2>Delete Event</h2>
            <p>
              Are you sure you want to delete <strong>{selectedEvent.name}</strong>?
              This will permanently remove all tables, guests, and seating arrangements.
            </p>
            <div className="modal-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={closeModals}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-danger"
                onClick={handleDeleteEvent}
                disabled={isPending}
              >
                {isPending ? 'Deleting...' : 'Delete Event'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
