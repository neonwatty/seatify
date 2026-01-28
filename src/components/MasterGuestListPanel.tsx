'use client';

import { useState, useEffect, useTransition } from 'react';
import {
  getProjectGuests,
  addProjectGuest,
  updateProjectGuest,
  deleteProjectGuest,
} from '@/actions/projects';
import { trackProjectGuestAdded } from '@/utils/analytics';
import type { ProjectGuest } from '@/types';
import './MasterGuestListPanel.css';

interface MasterGuestListPanelProps {
  projectId: string;
  projectName: string;
  isOpen: boolean;
  onClose: () => void;
}

export function MasterGuestListPanel({
  projectId,
  projectName,
  isOpen,
  onClose,
}: MasterGuestListPanelProps) {
  const [guests, setGuests] = useState<ProjectGuest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Search and filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [filterGroup, setFilterGroup] = useState('all');

  // Edit/Add modal state
  const [showGuestModal, setShowGuestModal] = useState(false);
  const [editingGuest, setEditingGuest] = useState<ProjectGuest | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  // Guest form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [groupName, setGroupName] = useState('');
  const [notes, setNotes] = useState('');
  const [dietaryRestrictions, setDietaryRestrictions] = useState('');
  const [accessibilityNeeds, setAccessibilityNeeds] = useState('');

  const loadGuests = async () => {
    setLoading(true);
    setError(null);
    const result = await getProjectGuests(projectId);
    if (result.error) {
      setError(result.error);
    } else if (result.data) {
      setGuests(result.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (isOpen) {
      loadGuests();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, projectId]);

  const clearForm = () => {
    setFirstName('');
    setLastName('');
    setEmail('');
    setPhone('');
    setCompany('');
    setJobTitle('');
    setGroupName('');
    setNotes('');
    setDietaryRestrictions('');
    setAccessibilityNeeds('');
    setEditingGuest(null);
  };

  const openAddModal = () => {
    clearForm();
    setShowGuestModal(true);
  };

  const openEditModal = (guest: ProjectGuest) => {
    setEditingGuest(guest);
    setFirstName(guest.firstName);
    setLastName(guest.lastName);
    setEmail(guest.email || '');
    setPhone(guest.phone || '');
    setCompany(guest.company || '');
    setJobTitle(guest.jobTitle || '');
    setGroupName(guest.groupName || '');
    setNotes(guest.notes || '');
    setDietaryRestrictions(guest.dietaryRestrictions || '');
    setAccessibilityNeeds(guest.accessibilityNeeds || '');
    setShowGuestModal(true);
  };

  const handleSaveGuest = () => {
    if (!firstName.trim() || !lastName.trim()) return;

    startTransition(async () => {
      const guestData = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        company: company.trim() || undefined,
        jobTitle: jobTitle.trim() || undefined,
        groupName: groupName.trim() || undefined,
        notes: notes.trim() || undefined,
        dietaryRestrictions: dietaryRestrictions.trim() || undefined,
        accessibilityNeeds: accessibilityNeeds.trim() || undefined,
      };

      if (editingGuest) {
        const result = await updateProjectGuest(editingGuest.id, guestData);
        if (result.error) {
          setError(result.error);
          return;
        }
        if (result.data) {
          setGuests(guests.map((g) => (g.id === editingGuest.id ? result.data! : g)));
        }
      } else {
        const result = await addProjectGuest(projectId, guestData);
        if (result.error) {
          setError(result.error);
          return;
        }
        if (result.data) {
          const newGuests = [...guests, result.data];
          setGuests(newGuests);
          trackProjectGuestAdded(newGuests.length);
        }
      }

      setShowGuestModal(false);
      clearForm();
    });
  };

  const handleDeleteGuest = (guestId: string) => {
    startTransition(async () => {
      const result = await deleteProjectGuest(guestId);
      if (result.error) {
        setError(result.error);
        return;
      }
      setGuests(guests.filter((g) => g.id !== guestId));
      setShowDeleteConfirm(null);
    });
  };

  // Filter guests
  const groups = [...new Set(guests.map((g) => g.groupName).filter(Boolean))];
  const filteredGuests = guests.filter((guest) => {
    const fullName = `${guest.firstName} ${guest.lastName}`.toLowerCase();
    const matchesSearch =
      fullName.includes(searchTerm.toLowerCase()) ||
      guest.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      guest.company?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesGroup = filterGroup === 'all' || guest.groupName === filterGroup;
    return matchesSearch && matchesGroup;
  });

  if (!isOpen) return null;

  return (
    <div className="panel-overlay" onClick={onClose}>
      <div className="master-guest-panel" onClick={(e) => e.stopPropagation()}>
        <div className="panel-header">
          <div>
            <h2>Master Guest List</h2>
            <p className="panel-subtitle">{projectName}</p>
          </div>
          <button className="close-btn" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="error-banner">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v4M12 16h.01" />
            </svg>
            {error}
            <button onClick={() => setError(null)}>Dismiss</button>
          </div>
        )}

        <div className="panel-controls">
          <input
            type="text"
            placeholder="Search guests..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />

          <select
            value={filterGroup}
            onChange={(e) => setFilterGroup(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Groups</option>
            {groups.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>

          <button className="add-guest-btn" onClick={openAddModal}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M7 1v12M1 7h12" />
            </svg>
            Add Guest
          </button>
        </div>

        <div className="panel-stats">
          <div className="stat">
            <span className="stat-value">{guests.length}</span>
            <span className="stat-label">Total Guests</span>
          </div>
          <div className="stat">
            <span className="stat-value">{groups.length}</span>
            <span className="stat-label">Groups</span>
          </div>
          <div className="stat">
            <span className="stat-value">{filteredGuests.length}</span>
            <span className="stat-label">Showing</span>
          </div>
        </div>

        <div className="guest-list">
          {loading ? (
            <div className="loading-state">Loading guests...</div>
          ) : filteredGuests.length === 0 ? (
            <div className="empty-state">
              {guests.length === 0 ? (
                <>
                  <p>No guests in the master list yet.</p>
                  <button className="add-guest-btn" onClick={openAddModal}>
                    Add First Guest
                  </button>
                </>
              ) : (
                <p>No guests match your search.</p>
              )}
            </div>
          ) : (
            filteredGuests.map((guest) => (
              <div key={guest.id} className="guest-row">
                <div className="guest-info">
                  <div className="guest-name">
                    {guest.firstName} {guest.lastName}
                    {guest.groupName && (
                      <span className="guest-group">{guest.groupName}</span>
                    )}
                  </div>
                  <div className="guest-details">
                    {guest.email && <span>{guest.email}</span>}
                    {guest.company && <span>{guest.company}</span>}
                  </div>
                </div>
                <div className="guest-actions">
                  <button
                    className="action-btn edit"
                    onClick={() => openEditModal(guest)}
                    title="Edit"
                  >
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M11.5 2.5L13.5 4.5M2 14L2.5 11.5L11 3L13 5L4.5 13.5L2 14Z" />
                    </svg>
                  </button>
                  <button
                    className="action-btn delete"
                    onClick={() => setShowDeleteConfirm(guest.id)}
                    title="Delete"
                  >
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M3 4H13M6 4V3C6 2.44772 6.44772 2 7 2H9C9.55228 2 10 2.44772 10 3V4M12 4V13C12 13.5523 11.5523 14 11 14H5C4.44772 14 4 13.5523 4 13V4H12Z" />
                    </svg>
                  </button>
                </div>

                {/* Delete Confirmation */}
                {showDeleteConfirm === guest.id && (
                  <div className="delete-confirm-inline">
                    <span>Delete this guest?</span>
                    <button onClick={() => handleDeleteGuest(guest.id)} disabled={isPending}>
                      {isPending ? 'Deleting...' : 'Yes, delete'}
                    </button>
                    <button onClick={() => setShowDeleteConfirm(null)}>Cancel</button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Add/Edit Guest Modal */}
        {showGuestModal && (
          <div className="nested-modal-overlay" onClick={() => setShowGuestModal(false)}>
            <div className="nested-modal" onClick={(e) => e.stopPropagation()}>
              <h3>{editingGuest ? 'Edit Guest' : 'Add Guest'}</h3>

              <div className="form-row">
                <div className="form-group">
                  <label>First Name *</label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="First name"
                    autoFocus
                  />
                </div>
                <div className="form-group">
                  <label>Last Name *</label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Last name"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@example.com"
                  />
                </div>
                <div className="form-group">
                  <label>Phone</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 555-1234"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Company</label>
                  <input
                    type="text"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="Company name"
                  />
                </div>
                <div className="form-group">
                  <label>Job Title</label>
                  <input
                    type="text"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    placeholder="Job title"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Group</label>
                <input
                  type="text"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="e.g., VIP, Sponsors, Speakers"
                  list="groups-datalist"
                />
                <datalist id="groups-datalist">
                  {groups.map((g) => (
                    <option key={g} value={g} />
                  ))}
                </datalist>
              </div>

              <div className="form-group">
                <label>Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any additional notes..."
                  rows={2}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Dietary Restrictions</label>
                  <input
                    type="text"
                    value={dietaryRestrictions}
                    onChange={(e) => setDietaryRestrictions(e.target.value)}
                    placeholder="e.g., Vegetarian, Gluten-free"
                  />
                </div>
                <div className="form-group">
                  <label>Accessibility Needs</label>
                  <input
                    type="text"
                    value={accessibilityNeeds}
                    onChange={(e) => setAccessibilityNeeds(e.target.value)}
                    placeholder="e.g., Wheelchair access"
                  />
                </div>
              </div>

              <div className="modal-actions">
                <button
                  className="btn-secondary"
                  onClick={() => {
                    setShowGuestModal(false);
                    clearForm();
                  }}
                >
                  Cancel
                </button>
                <button
                  className="btn-primary"
                  onClick={handleSaveGuest}
                  disabled={isPending || !firstName.trim() || !lastName.trim()}
                >
                  {isPending ? 'Saving...' : editingGuest ? 'Save Changes' : 'Add Guest'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
