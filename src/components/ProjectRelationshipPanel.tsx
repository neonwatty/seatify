'use client';

import { useState, useEffect, useTransition } from 'react';
import {
  getProjectGuests,
  getProjectRelationships,
  addProjectRelationship,
  deleteProjectRelationship,
} from '@/actions/projects';
import { trackProjectRelationshipAdded } from '@/utils/analytics';
import type { ProjectGuest, ProjectGuestRelationship } from '@/types';
import './ProjectRelationshipPanel.css';

interface ProjectRelationshipPanelProps {
  projectId: string;
  projectName: string;
  isOpen: boolean;
  onClose: () => void;
}

type RelationshipType = ProjectGuestRelationship['relationshipType'];

const RELATIONSHIP_LABELS: Record<RelationshipType, { label: string; color: string; icon: string }> = {
  family: { label: 'Family', color: '#dc2626', icon: '❤️' },
  partner: { label: 'Partner/Spouse', color: '#ea580c', icon: '💑' },
  friend: { label: 'Friend', color: '#16a34a', icon: '👋' },
  colleague: { label: 'Colleague', color: '#2563eb', icon: '💼' },
  acquaintance: { label: 'Acquaintance', color: '#737373', icon: '🤝' },
  prefer: { label: 'Prefer Together', color: '#7c3aed', icon: '✓' },
  avoid: { label: 'Keep Apart', color: '#be123c', icon: '✗' },
};

export function ProjectRelationshipPanel({
  projectId,
  projectName,
  isOpen,
  onClose,
}: ProjectRelationshipPanelProps) {
  const [guests, setGuests] = useState<ProjectGuest[]>([]);
  const [relationships, setRelationships] = useState<ProjectGuestRelationship[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Add relationship form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [guest1Id, setGuest1Id] = useState('');
  const [guest2Id, setGuest2Id] = useState('');
  const [relationshipType, setRelationshipType] = useState<RelationshipType>('friend');
  const [strength, setStrength] = useState(3);

  // Filter
  const [filterType, setFilterType] = useState<RelationshipType | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const loadData = async () => {
    setLoading(true);
    setError(null);

    const [guestsResult, relationshipsResult] = await Promise.all([
      getProjectGuests(projectId),
      getProjectRelationships(projectId),
    ]);

    if (guestsResult.error) {
      setError(guestsResult.error);
    } else if (guestsResult.data) {
      setGuests(guestsResult.data);
    }

    if (relationshipsResult.error) {
      setError(relationshipsResult.error);
    } else if (relationshipsResult.data) {
      setRelationships(relationshipsResult.data);
    }

    setLoading(false);
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, projectId]);

  const handleAddRelationship = () => {
    if (!guest1Id || !guest2Id || guest1Id === guest2Id) return;

    startTransition(async () => {
      const result = await addProjectRelationship(projectId, {
        guestId: guest1Id,
        relatedGuestId: guest2Id,
        relationshipType,
        strength,
      });

      if (result.error) {
        setError(result.error);
        return;
      }

      if (result.data) {
        setRelationships([...relationships, result.data]);
        trackProjectRelationshipAdded(relationshipType);
      }

      // Reset form
      setShowAddForm(false);
      setGuest1Id('');
      setGuest2Id('');
      setRelationshipType('friend');
      setStrength(3);
    });
  };

  const handleDeleteRelationship = (relationshipId: string) => {
    startTransition(async () => {
      const result = await deleteProjectRelationship(relationshipId);

      if (result.error) {
        setError(result.error);
        return;
      }

      setRelationships(relationships.filter((r) => r.id !== relationshipId));
    });
  };

  const getGuestName = (guestId: string) => {
    const guest = guests.find((g) => g.id === guestId);
    return guest ? `${guest.firstName} ${guest.lastName}` : 'Unknown';
  };

  // Filter relationships
  const filteredRelationships = relationships.filter((rel) => {
    const guest1Name = getGuestName(rel.guestId).toLowerCase();
    const guest2Name = getGuestName(rel.relatedGuestId).toLowerCase();
    const matchesSearch =
      searchTerm === '' ||
      guest1Name.includes(searchTerm.toLowerCase()) ||
      guest2Name.includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || rel.relationshipType === filterType;
    return matchesSearch && matchesType;
  });

  // Group relationships by type for summary
  const relationshipCounts = relationships.reduce(
    (acc, rel) => {
      acc[rel.relationshipType] = (acc[rel.relationshipType] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  if (!isOpen) return null;

  return (
    <div className="panel-overlay" onClick={onClose}>
      <div className="relationship-panel" onClick={(e) => e.stopPropagation()}>
        <div className="panel-header">
          <div>
            <h2>Relationships</h2>
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
            {error}
            <button onClick={() => setError(null)}>Dismiss</button>
          </div>
        )}

        <div className="panel-controls">
          <input
            type="text"
            placeholder="Search by guest name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as RelationshipType | 'all')}
            className="filter-select"
          >
            <option value="all">All Types</option>
            {Object.entries(RELATIONSHIP_LABELS).map(([type, { label }]) => (
              <option key={type} value={type}>
                {label}
              </option>
            ))}
          </select>

          <button className="add-btn" onClick={() => setShowAddForm(true)}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M7 1v12M1 7h12" />
            </svg>
            Add
          </button>
        </div>

        {/* Relationship Summary */}
        <div className="relationship-summary">
          {Object.entries(RELATIONSHIP_LABELS).map(([type, { label, color, icon }]) => (
            <div
              key={type}
              className={`summary-chip ${filterType === type ? 'active' : ''}`}
              onClick={() => setFilterType(filterType === type ? 'all' : (type as RelationshipType))}
              style={{ '--chip-color': color } as React.CSSProperties}
            >
              <span className="chip-icon">{icon}</span>
              <span className="chip-label">{label}</span>
              <span className="chip-count">{relationshipCounts[type] || 0}</span>
            </div>
          ))}
        </div>

        <div className="relationship-list">
          {loading ? (
            <div className="loading-state">Loading relationships...</div>
          ) : filteredRelationships.length === 0 ? (
            <div className="empty-state">
              {relationships.length === 0 ? (
                <>
                  <p>No relationships defined yet.</p>
                  <p className="hint">Define how guests relate to each other to improve seating optimization.</p>
                  <button className="add-btn-large" onClick={() => setShowAddForm(true)}>
                    Add First Relationship
                  </button>
                </>
              ) : (
                <p>No relationships match your filter.</p>
              )}
            </div>
          ) : (
            filteredRelationships.map((rel) => {
              const typeInfo = RELATIONSHIP_LABELS[rel.relationshipType];
              return (
                <div key={rel.id} className="relationship-row">
                  <div className="relationship-guests">
                    <span className="guest-name">{getGuestName(rel.guestId)}</span>
                    <span
                      className="relationship-badge"
                      style={{ background: typeInfo.color }}
                    >
                      {typeInfo.icon} {typeInfo.label}
                    </span>
                    <span className="guest-name">{getGuestName(rel.relatedGuestId)}</span>
                  </div>
                  <div className="relationship-meta">
                    <span className="strength-indicator">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <span
                          key={n}
                          className={`strength-dot ${n <= rel.strength ? 'filled' : ''}`}
                        />
                      ))}
                    </span>
                    <button
                      className="delete-btn"
                      onClick={() => handleDeleteRelationship(rel.id)}
                      disabled={isPending}
                    >
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M3 4H13M6 4V3C6 2.44772 6.44772 2 7 2H9C9.55228 2 10 2.44772 10 3V4M12 4V13C12 13.5523 11.5523 14 11 14H5C4.44772 14 4 13.5523 4 13V4H12Z" />
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Add Relationship Modal */}
        {showAddForm && (
          <div className="nested-modal-overlay" onClick={() => setShowAddForm(false)}>
            <div className="nested-modal" onClick={(e) => e.stopPropagation()}>
              <h3>Add Relationship</h3>

              <div className="form-group">
                <label>First Guest</label>
                <select
                  value={guest1Id}
                  onChange={(e) => setGuest1Id(e.target.value)}
                  className="guest-select"
                >
                  <option value="">Select a guest...</option>
                  {guests
                    .filter((g) => g.id !== guest2Id)
                    .map((guest) => (
                      <option key={guest.id} value={guest.id}>
                        {guest.firstName} {guest.lastName}
                        {guest.groupName && ` (${guest.groupName})`}
                      </option>
                    ))}
                </select>
              </div>

              <div className="form-group">
                <label>Relationship Type</label>
                <div className="type-grid">
                  {Object.entries(RELATIONSHIP_LABELS).map(([type, { label, icon, color }]) => (
                    <button
                      key={type}
                      type="button"
                      className={`type-option ${relationshipType === type ? 'selected' : ''}`}
                      onClick={() => setRelationshipType(type as RelationshipType)}
                      style={{ '--type-color': color } as React.CSSProperties}
                    >
                      <span className="type-icon">{icon}</span>
                      <span className="type-label">{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label>Second Guest</label>
                <select
                  value={guest2Id}
                  onChange={(e) => setGuest2Id(e.target.value)}
                  className="guest-select"
                >
                  <option value="">Select a guest...</option>
                  {guests
                    .filter((g) => g.id !== guest1Id)
                    .map((guest) => (
                      <option key={guest.id} value={guest.id}>
                        {guest.firstName} {guest.lastName}
                        {guest.groupName && ` (${guest.groupName})`}
                      </option>
                    ))}
                </select>
              </div>

              <div className="form-group">
                <label>Strength: {strength}</label>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={strength}
                  onChange={(e) => setStrength(Number(e.target.value))}
                  className="strength-slider"
                />
                <div className="strength-labels">
                  <span>Weak</span>
                  <span>Strong</span>
                </div>
              </div>

              <div className="modal-actions">
                <button className="btn-secondary" onClick={() => setShowAddForm(false)}>
                  Cancel
                </button>
                <button
                  className="btn-primary"
                  onClick={handleAddRelationship}
                  disabled={isPending || !guest1Id || !guest2Id || guest1Id === guest2Id}
                >
                  {isPending ? 'Adding...' : 'Add Relationship'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
