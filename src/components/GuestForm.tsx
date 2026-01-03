import { useState, useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';
import { DIETARY_OPTIONS, ACCESSIBILITY_OPTIONS } from '../constants/dietaryIcons';
import type { Guest, RelationshipType } from '../types';
import { getFullName } from '../types';
import { trackGuestAdded, trackFunnelStep, trackMilestone, setUserProperties } from '../utils/analytics';
import './GuestForm.css';

interface GuestFormProps {
  guestId?: string;
  onClose: () => void;
}

const relationshipTypes: { value: RelationshipType; label: string }[] = [
  { value: 'family', label: 'Family' },
  { value: 'friend', label: 'Friend' },
  { value: 'colleague', label: 'Colleague' },
  { value: 'partner', label: 'Partner/Spouse' },
  { value: 'acquaintance', label: 'Acquaintance' },
  { value: 'avoid', label: 'Keep Apart' },
];

export function GuestForm({ guestId, onClose }: GuestFormProps) {
  const { event, addGuest, updateGuest, removeGuest, addRelationship, removeRelationship, assignGuestToTable } = useStore();
  const existingGuest = guestId ? event.guests.find((g) => g.id === guestId) : null;

  const firstNameInputRef = useRef<HTMLInputElement>(null);
  const [showSuccessFlash, setShowSuccessFlash] = useState(false);

  const getInitialFormData = () => {
    if (existingGuest) {
      return {
        firstName: existingGuest.firstName,
        lastName: existingGuest.lastName,
        email: existingGuest.email || '',
        company: existingGuest.company || '',
        jobTitle: existingGuest.jobTitle || '',
        industry: existingGuest.industry || '',
        interests: existingGuest.interests?.join(', ') || '',
        group: existingGuest.group || '',
        dietaryRestrictions: existingGuest.dietaryRestrictions || [],
        accessibilityNeeds: existingGuest.accessibilityNeeds || [],
        rsvpStatus: existingGuest.rsvpStatus,
        notes: existingGuest.notes || '',
      };
    }
    return {
      firstName: '',
      lastName: '',
      email: '',
      company: '',
      jobTitle: '',
      industry: '',
      interests: '',
      group: '',
      dietaryRestrictions: [] as string[],
      accessibilityNeeds: [] as string[],
      rsvpStatus: 'pending' as Guest['rsvpStatus'],
      notes: '',
    };
  };

  const [formData, setFormData] = useState(getInitialFormData);

  const [newRelation, setNewRelation] = useState({
    guestId: '',
    type: 'friend' as RelationshipType,
    strength: 3,
  });

  // Auto-focus first name field on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      firstNameInputRef.current?.focus();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = (e: React.FormEvent, addAnother = false) => {
    e.preventDefault();
    const guestData = {
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email || undefined,
      company: formData.company || undefined,
      jobTitle: formData.jobTitle || undefined,
      industry: formData.industry || undefined,
      interests: formData.interests ? formData.interests.split(',').map((s) => s.trim()) : undefined,
      group: formData.group || undefined,
      dietaryRestrictions: formData.dietaryRestrictions.length > 0 ? formData.dietaryRestrictions : undefined,
      accessibilityNeeds: formData.accessibilityNeeds.length > 0 ? formData.accessibilityNeeds : undefined,
      rsvpStatus: formData.rsvpStatus,
      notes: formData.notes || undefined,
    };

    if (existingGuest) {
      updateGuest(existingGuest.id, guestData);
      onClose();
    } else {
      addGuest(guestData);
      const newGuestCount = event.guests.length + 1;
      trackGuestAdded(newGuestCount);
      // Track first guest milestone
      if (newGuestCount === 1) {
        trackFunnelStep('first_guest');
        trackMilestone('first_guest');
        setUserProperties({ hasAddedGuests: true });
      }

      if (addAnother) {
        // Reset form for next guest, keep group for convenience
        const currentGroup = formData.group;
        setFormData({
          firstName: '',
          lastName: '',
          email: '',
          company: '',
          jobTitle: '',
          industry: '',
          interests: '',
          group: currentGroup,
          dietaryRestrictions: [],
          accessibilityNeeds: [],
          rsvpStatus: 'pending',
          notes: '',
        });
        // Show success flash
        setShowSuccessFlash(true);
        setTimeout(() => setShowSuccessFlash(false), 300);
        // Focus first name field
        setTimeout(() => firstNameInputRef.current?.focus(), 50);
      } else {
        onClose();
      }
    }
  };

  const handleDelete = () => {
    if (existingGuest && confirm(`Delete ${getFullName(existingGuest)}?`)) {
      removeGuest(existingGuest.id);
      onClose();
    }
  };

  const handleAddRelationship = () => {
    if (existingGuest && newRelation.guestId) {
      addRelationship(existingGuest.id, newRelation.guestId, newRelation.type, newRelation.strength);
      addRelationship(newRelation.guestId, existingGuest.id, newRelation.type, newRelation.strength);
      setNewRelation({ guestId: '', type: 'friend', strength: 3 });
    }
  };

  const handleRemoveRelationship = (targetId: string) => {
    if (existingGuest) {
      removeRelationship(existingGuest.id, targetId);
      removeRelationship(targetId, existingGuest.id);
    }
  };

  const handleUnassign = () => {
    if (existingGuest) {
      assignGuestToTable(existingGuest.id, undefined);
    }
  };

  const otherGuests = event.guests.filter(
    (g) => g.id !== guestId && !existingGuest?.relationships.some((r) => r.guestId === g.id)
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className={`guest-form-modal ${showSuccessFlash ? 'success-flash' : ''}`} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{existingGuest ? 'Edit Guest' : 'Add Guest'}</h2>
          <button className="close-btn" onClick={onClose}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-section">
            <h3>Basic Info</h3>
            <div className="form-row">
              <label>
                First Name *
                <input
                  ref={firstNameInputRef}
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  required
                />
              </label>
              <label>
                Last Name *
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  required
                />
              </label>
            </div>
            <div className="form-row">
              <label>
                Email
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </label>
              <label>
                Group
                <input
                  type="text"
                  value={formData.group}
                  onChange={(e) => setFormData({ ...formData, group: e.target.value })}
                  placeholder="e.g., Bride's Family, Marketing Team"
                  list="group-suggestions"
                />
                <datalist id="group-suggestions">
                  {[...new Set(event.guests.map((g) => g.group).filter(Boolean))].map((g) => (
                    <option key={g} value={g} />
                  ))}
                </datalist>
              </label>
            </div>
            <div className="form-row">
              <label>
                RSVP Status
                <select
                  value={formData.rsvpStatus}
                  onChange={(e) => setFormData({ ...formData, rsvpStatus: e.target.value as Guest['rsvpStatus'] })}
                >
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="declined">Declined</option>
                </select>
              </label>
            </div>
          </div>

          <div className="form-section">
            <h3>Professional Info</h3>
            <div className="form-row">
              <label>
                Company
                <input
                  type="text"
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                />
              </label>
              <label>
                Job Title
                <input
                  type="text"
                  value={formData.jobTitle}
                  onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
                />
              </label>
            </div>
            <label>
              Industry
              <input
                type="text"
                value={formData.industry}
                onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
              />
            </label>
          </div>

          <div className="form-section">
            <h3>Interests & Preferences</h3>
            <label>
              Interests (comma-separated)
              <input
                type="text"
                value={formData.interests}
                onChange={(e) => setFormData({ ...formData, interests: e.target.value })}
                placeholder="e.g., hiking, photography, wine"
              />
            </label>
            <label>
              Dietary Restrictions
              <div className="checkbox-group">
                {DIETARY_OPTIONS.map((opt) => (
                  <label key={opt} className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={formData.dietaryRestrictions.includes(opt)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData({
                            ...formData,
                            dietaryRestrictions: [...formData.dietaryRestrictions, opt],
                          });
                        } else {
                          setFormData({
                            ...formData,
                            dietaryRestrictions: formData.dietaryRestrictions.filter((d) => d !== opt),
                          });
                        }
                      }}
                    />
                    {opt}
                  </label>
                ))}
              </div>
            </label>
            <label>
              Accessibility Needs
              <div className="checkbox-group">
                {ACCESSIBILITY_OPTIONS.map((opt) => (
                  <label key={opt} className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={formData.accessibilityNeeds.includes(opt)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData({
                            ...formData,
                            accessibilityNeeds: [...formData.accessibilityNeeds, opt],
                          });
                        } else {
                          setFormData({
                            ...formData,
                            accessibilityNeeds: formData.accessibilityNeeds.filter((a) => a !== opt),
                          });
                        }
                      }}
                    />
                    {opt}
                  </label>
                ))}
              </div>
            </label>
          </div>

          {existingGuest && (
            <div className="form-section">
              <h3>Relationships</h3>
              {existingGuest.relationships.length > 0 && (
                <div className="relationship-list">
                  {existingGuest.relationships.map((rel) => {
                    const targetGuest = event.guests.find((g) => g.id === rel.guestId);
                    return (
                      <div key={rel.guestId} className="relationship-item">
                        <span className={`rel-type ${rel.type}`}>
                          {relationshipTypes.find((t) => t.value === rel.type)?.label}
                        </span>
                        <span className="rel-name">{targetGuest ? getFullName(targetGuest) : 'Unknown'}</span>
                        <span className="rel-strength">{'★'.repeat(rel.strength)}</span>
                        <button
                          type="button"
                          className="rel-remove"
                          onClick={() => handleRemoveRelationship(rel.guestId)}
                        >
                          ×
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {otherGuests.length > 0 && (
                <div className="add-relationship">
                  <select
                    value={newRelation.guestId}
                    onChange={(e) => setNewRelation({ ...newRelation, guestId: e.target.value })}
                  >
                    <option value="">Select guest...</option>
                    {otherGuests.map((g) => (
                      <option key={g.id} value={g.id}>
                        {getFullName(g)}
                      </option>
                    ))}
                  </select>
                  <select
                    value={newRelation.type}
                    onChange={(e) => setNewRelation({ ...newRelation, type: e.target.value as RelationshipType })}
                  >
                    {relationshipTypes.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    value={newRelation.strength}
                    onChange={(e) => setNewRelation({ ...newRelation, strength: parseInt(e.target.value) })}
                    title={`Strength: ${newRelation.strength}`}
                  />
                  <button type="button" onClick={handleAddRelationship} disabled={!newRelation.guestId}>
                    Add
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="form-section">
            <label>
              Notes
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
              />
            </label>
          </div>

          <div className="form-actions">
            {existingGuest && (
              <>
                {existingGuest.tableId && (
                  <button type="button" className="btn-secondary" onClick={handleUnassign}>
                    Unassign from Table
                  </button>
                )}
                <button type="button" className="btn-danger" onClick={handleDelete}>
                  Delete Guest
                </button>
              </>
            )}
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            {!existingGuest && (
              <button
                type="button"
                className="btn-accent"
                onClick={(e) => handleSubmit(e, true)}
              >
                Save & Add Another
              </button>
            )}
            <button type="submit" className="btn-primary">
              {existingGuest ? 'Save Changes' : 'Add Guest'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
