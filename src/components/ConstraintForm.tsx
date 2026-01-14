import { useState, useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';
import { useSyncToSupabase } from '../hooks/useSyncToSupabase';
import type { Constraint } from '../types';
import { getFullName } from '../types';
import './ConstraintForm.css';

interface ConstraintFormProps {
  constraintId?: string;
  onClose: () => void;
}

const constraintTypes: { value: Constraint['type']; label: string; description: string }[] = [
  { value: 'same_table', label: 'Same Table', description: 'These guests must sit at the same table' },
  { value: 'different_table', label: 'Different Tables', description: 'These guests must sit at different tables' },
  { value: 'must_sit_together', label: 'Sit Together', description: 'These guests must sit next to each other' },
  { value: 'must_not_sit_together', label: 'Keep Apart', description: 'These guests should not sit next to each other' },
  { value: 'near_front', label: 'Near Front', description: 'These guests should be seated near the front' },
  { value: 'accessibility', label: 'Accessibility', description: 'These guests need accessible seating' },
];

const priorityOptions: { value: Constraint['priority']; label: string; description: string }[] = [
  { value: 'required', label: 'Required', description: 'Must be followed' },
  { value: 'preferred', label: 'Preferred', description: 'Should be followed if possible' },
  { value: 'optional', label: 'Nice to Have', description: 'Consider if convenient' },
];

export function ConstraintForm({ constraintId, onClose }: ConstraintFormProps) {
  const { event } = useStore();
  const { addConstraint, updateConstraint, removeConstraint } = useSyncToSupabase();

  const existingConstraint = constraintId
    ? event.constraints.find((c) => c.id === constraintId)
    : null;

  const searchInputRef = useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const getInitialFormData = () => {
    if (existingConstraint) {
      return {
        type: existingConstraint.type,
        guestIds: [...existingConstraint.guestIds],
        priority: existingConstraint.priority,
        description: existingConstraint.description || '',
      };
    }
    return {
      type: 'same_table' as Constraint['type'],
      guestIds: [] as string[],
      priority: 'preferred' as Constraint['priority'],
      description: '',
    };
  };

  const [formData, setFormData] = useState(getInitialFormData);

  // Auto-focus search field on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      searchInputRef.current?.focus();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.guestIds.length < 2) {
      return; // Don't submit if less than 2 guests selected
    }

    const constraintData = {
      type: formData.type,
      guestIds: formData.guestIds,
      priority: formData.priority,
      description: formData.description || undefined,
    };

    if (existingConstraint) {
      updateConstraint(existingConstraint.id, constraintData);
    } else {
      addConstraint(constraintData);
    }
    onClose();
  };

  const handleDelete = () => {
    if (existingConstraint && confirm('Delete this constraint?')) {
      removeConstraint(existingConstraint.id);
      onClose();
    }
  };

  const toggleGuest = (guestId: string) => {
    if (formData.guestIds.includes(guestId)) {
      setFormData({
        ...formData,
        guestIds: formData.guestIds.filter(id => id !== guestId),
      });
    } else {
      setFormData({
        ...formData,
        guestIds: [...formData.guestIds, guestId],
      });
    }
  };

  const removeGuestFromSelection = (guestId: string) => {
    setFormData({
      ...formData,
      guestIds: formData.guestIds.filter(id => id !== guestId),
    });
  };

  // Filter guests based on search query
  const filteredGuests = event.guests.filter(guest => {
    const fullName = getFullName(guest).toLowerCase();
    const query = searchQuery.toLowerCase();
    return fullName.includes(query) ||
           guest.group?.toLowerCase().includes(query) ||
           guest.company?.toLowerCase().includes(query);
  });

  // Selected guests for display
  const selectedGuests = formData.guestIds
    .map(id => event.guests.find(g => g.id === id))
    .filter(Boolean);

  const _currentConstraintType = constraintTypes.find(t => t.value === formData.type);
  const _currentPriority = priorityOptions.find(p => p.value === formData.priority);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="constraint-form-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{existingConstraint ? 'Edit Constraint' : 'Add Constraint'}</h2>
          <button className="close-btn" onClick={onClose}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-section">
            <h3>Constraint Type</h3>
            <div className="constraint-type-selector">
              {constraintTypes.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  className={`type-option ${formData.type === type.value ? 'selected' : ''}`}
                  onClick={() => setFormData({ ...formData, type: type.value })}
                >
                  <span className="type-label">{type.label}</span>
                  <span className="type-description">{type.description}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="form-section">
            <h3>Priority</h3>
            <div className="priority-selector">
              {priorityOptions.map((priority) => (
                <button
                  key={priority.value}
                  type="button"
                  className={`priority-option ${formData.priority === priority.value ? 'selected' : ''} ${priority.value}`}
                  onClick={() => setFormData({ ...formData, priority: priority.value })}
                >
                  <span className="priority-label">{priority.label}</span>
                  <span className="priority-description">{priority.description}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="form-section">
            <h3>Select Guests ({formData.guestIds.length} selected)</h3>

            {selectedGuests.length > 0 && (
              <div className="selected-guests">
                {selectedGuests.map((guest) => guest && (
                  <div key={guest.id} className="selected-guest-chip">
                    <span>{getFullName(guest)}</span>
                    <button
                      type="button"
                      className="remove-guest"
                      onClick={() => removeGuestFromSelection(guest.id)}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="guest-search">
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search guests by name, group, or company..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="guest-list">
              {filteredGuests.length === 0 ? (
                <p className="empty-message">No guests found</p>
              ) : (
                filteredGuests.map((guest) => (
                  <button
                    key={guest.id}
                    type="button"
                    className={`guest-item ${formData.guestIds.includes(guest.id) ? 'selected' : ''}`}
                    onClick={() => toggleGuest(guest.id)}
                  >
                    <div className="guest-info">
                      <span className="guest-name">{getFullName(guest)}</span>
                      {guest.group && <span className="guest-group">{guest.group}</span>}
                    </div>
                    <span className="check-indicator">
                      {formData.guestIds.includes(guest.id) ? '✓' : ''}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="form-section">
            <h3>Description (Optional)</h3>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Add a note about why this constraint is needed..."
              rows={2}
            />
          </div>

          {formData.guestIds.length < 2 && (
            <div className="validation-message">
              Please select at least 2 guests for this constraint
            </div>
          )}

          <div className="form-actions">
            {existingConstraint && (
              <button type="button" className="btn-danger" onClick={handleDelete}>
                Delete Constraint
              </button>
            )}
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={formData.guestIds.length < 2}
            >
              {existingConstraint ? 'Save Changes' : 'Add Constraint'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
