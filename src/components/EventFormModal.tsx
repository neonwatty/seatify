import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import type { Event } from '../types';
import { trackEventCreatedConversion, trackFunnelStep, trackMilestone, setUserProperties } from '../utils/analytics';
import './EventFormModal.css';

interface EventFormModalProps {
  mode: 'create' | 'edit';
  event?: Event;
  onClose: () => void;
}

const eventTypes: { value: Event['eventType']; label: string }[] = [
  { value: 'wedding', label: 'Wedding' },
  { value: 'corporate', label: 'Corporate Event' },
  { value: 'gala', label: 'Gala' },
  { value: 'party', label: 'Party' },
  { value: 'other', label: 'Other' },
];

export function EventFormModal({ mode, event, onClose }: EventFormModalProps) {
  const navigate = useNavigate();
  const { createEvent, updateEventMetadata, switchEvent } = useStore();
  const nameInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    name: event?.name || '',
    eventType: event?.eventType || ('other' as Event['eventType']),
    date: event?.date || '',
    venueName: event?.venueName || '',
    venueAddress: event?.venueAddress || '',
    guestCapacityLimit: event?.guestCapacityLimit?.toString() || '',
  });

  // Auto-focus name field on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      nameInputRef.current?.focus();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const eventData = {
      name: formData.name.trim() || 'Untitled Event',
      eventType: formData.eventType,
      date: formData.date || undefined,
      venueName: formData.venueName.trim() || undefined,
      venueAddress: formData.venueAddress.trim() || undefined,
      guestCapacityLimit: formData.guestCapacityLimit ? parseInt(formData.guestCapacityLimit, 10) : undefined,
    };

    if (mode === 'create') {
      const newEventId = createEvent(eventData);
      switchEvent(newEventId);
      // Track event creation (GA4 + Google Ads conversion)
      trackEventCreatedConversion(eventData.eventType);
      trackFunnelStep('event_created', { event_type: eventData.eventType });
      trackMilestone('first_event', { event_type: eventData.eventType });
      // Set user property for audience segmentation
      setUserProperties({ hasCreatedEvent: true });
      navigate(`/events/${newEventId}/canvas`);
    } else if (event) {
      updateEventMetadata(event.id, eventData);
    }

    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="event-form-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{mode === 'create' ? 'Create New Event' : 'Edit Event'}</h2>
          <button className="close-btn" onClick={onClose} type="button">
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-section">
            <h3>Event Details</h3>
            <div className="form-row">
              <label>
                Event Name *
                <input
                  ref={nameInputRef}
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Smith Wedding, Annual Conference"
                  required
                />
              </label>
            </div>
            <div className="form-row two-columns">
              <label>
                Event Type
                <select
                  value={formData.eventType}
                  onChange={(e) => setFormData({ ...formData, eventType: e.target.value as Event['eventType'] })}
                >
                  {eventTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Event Date
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                />
              </label>
            </div>
          </div>

          <div className="form-section">
            <h3>Venue Information</h3>
            <div className="form-row">
              <label>
                Venue Name
                <input
                  type="text"
                  value={formData.venueName}
                  onChange={(e) => setFormData({ ...formData, venueName: e.target.value })}
                  placeholder="e.g., The Grand Ballroom"
                />
              </label>
            </div>
            <div className="form-row">
              <label>
                Venue Address
                <textarea
                  value={formData.venueAddress}
                  onChange={(e) => setFormData({ ...formData, venueAddress: e.target.value })}
                  placeholder="123 Main Street, City, State"
                  rows={2}
                />
              </label>
            </div>
            <div className="form-row">
              <label>
                Guest Capacity Limit
                <input
                  type="number"
                  min="0"
                  value={formData.guestCapacityLimit}
                  onChange={(e) => setFormData({ ...formData, guestCapacityLimit: e.target.value })}
                  placeholder="Maximum number of guests"
                />
              </label>
            </div>
          </div>

          <div className="form-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-submit">
              {mode === 'create' ? 'Create Event' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
