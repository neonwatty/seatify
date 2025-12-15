import { useState, useMemo, useCallback } from 'react';
import { useStore } from '../store/useStore';
import { GuestForm } from './GuestForm';
import { RelationshipMatrix } from './RelationshipMatrix';
import { MainToolbar } from './MainToolbar';
import { EmptyState } from './EmptyState';
import { ImportWizard } from './ImportWizard/ImportWizard';
import type { Guest } from '../types';
import { getFullName } from '../types';
import './GuestManagementView.css';

type SortColumn = 'name' | 'group' | 'rsvpStatus' | 'table';
type SortDirection = 'asc' | 'desc';
type ViewMode = 'list' | 'relationships';

export function GuestManagementView() {
  const {
    event,
    removeGuest,
    updateGuest,
    assignGuestToTable,
  } = useStore();

  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGuests, setSelectedGuests] = useState<Set<string>>(new Set());
  const [sortColumn, setSortColumn] = useState<SortColumn>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterAssigned, setFilterAssigned] = useState<string>('all');
  const [showAddGuest, setShowAddGuest] = useState(false);
  const [editingGuest, setEditingGuest] = useState<Guest | null>(null);
  const [selectedGuestDetail, setSelectedGuestDetail] = useState<string | null>(null);
  const [showImportWizard, setShowImportWizard] = useState(false);

  // Get table name by ID (for render usage)
  const getTableName = useCallback((tableId: string | undefined) => {
    if (!tableId) return null;
    const table = event.tables.find(t => t.id === tableId);
    return table?.name || null;
  }, [event.tables]);

  // Filter and sort guests
  const filteredGuests = useMemo(() => {
    // Helper to get table name by ID (local to useMemo for correct memoization)
    const lookupTableName = (tableId: string | undefined) => {
      if (!tableId) return null;
      const table = event.tables.find(t => t.id === tableId);
      return table?.name || null;
    };

    let guests = [...event.guests];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      guests = guests.filter(g =>
        getFullName(g).toLowerCase().includes(query) ||
        g.email?.toLowerCase().includes(query) ||
        g.company?.toLowerCase().includes(query) ||
        g.group?.toLowerCase().includes(query)
      );
    }

    // Status filter
    if (filterStatus !== 'all') {
      guests = guests.filter(g => g.rsvpStatus === filterStatus);
    }

    // Assigned filter
    if (filterAssigned === 'assigned') {
      guests = guests.filter(g => g.tableId);
    } else if (filterAssigned === 'unassigned') {
      guests = guests.filter(g => !g.tableId);
    }

    // Sort
    guests.sort((a, b) => {
      let aVal: string = '';
      let bVal: string = '';

      switch (sortColumn) {
        case 'name':
          aVal = getFullName(a);
          bVal = getFullName(b);
          break;
        case 'group':
          aVal = a.group || '';
          bVal = b.group || '';
          break;
        case 'rsvpStatus':
          aVal = a.rsvpStatus;
          bVal = b.rsvpStatus;
          break;
        case 'table':
          aVal = lookupTableName(a.tableId) || 'zzz';
          bVal = lookupTableName(b.tableId) || 'zzz';
          break;
      }

      const comparison = aVal.localeCompare(bVal);
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return guests;
  }, [event.guests, event.tables, searchQuery, filterStatus, filterAssigned, sortColumn, sortDirection]);

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const toggleGuestSelection = (id: string) => {
    const newSelected = new Set(selectedGuests);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedGuests(newSelected);
  };

  const selectAll = () => {
    if (selectedGuests.size === filteredGuests.length) {
      setSelectedGuests(new Set());
    } else {
      setSelectedGuests(new Set(filteredGuests.map(g => g.id)));
    }
  };

  const handleBulkDelete = () => {
    if (confirm(`Delete ${selectedGuests.size} selected guests?`)) {
      selectedGuests.forEach(id => removeGuest(id));
      setSelectedGuests(new Set());
    }
  };

  const handleBulkAssign = (tableId: string) => {
    selectedGuests.forEach(id => assignGuestToTable(id, tableId));
    setSelectedGuests(new Set());
  };

  const handleBulkStatusChange = (status: Guest['rsvpStatus']) => {
    selectedGuests.forEach(id => updateGuest(id, { rsvpStatus: status }));
    setSelectedGuests(new Set());
  };

  const selectedGuestData = selectedGuestDetail
    ? event.guests.find(g => g.id === selectedGuestDetail)
    : null;

  return (
    <div className="guest-management-view">
      <MainToolbar
        onAddGuest={() => setShowAddGuest(true)}
        onImport={() => setShowImportWizard(true)}
        showRelationships={viewMode === 'relationships'}
        onToggleRelationships={() => setViewMode(viewMode === 'relationships' ? 'list' : 'relationships')}
      >
        {/* Search and filters */}
        <input
          type="text"
          placeholder="Search guests..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-input"
        />

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="filter-select"
        >
          <option value="all">All Status</option>
          <option value="confirmed">Confirmed</option>
          <option value="pending">Pending</option>
          <option value="declined">Declined</option>
        </select>

        <select
          value={filterAssigned}
          onChange={(e) => setFilterAssigned(e.target.value)}
          className="filter-select"
        >
          <option value="all">All Guests</option>
          <option value="assigned">Assigned</option>
          <option value="unassigned">Unassigned</option>
        </select>

        <span className="guest-count">{filteredGuests.length} guests</span>
      </MainToolbar>

      {/* Bulk Actions */}
      {selectedGuests.size > 0 && (
        <div className="bulk-actions-bar">
          <span className="selection-count">{selectedGuests.size} selected</span>

          <select
            onChange={(e) => {
              if (e.target.value) {
                handleBulkAssign(e.target.value);
                e.target.value = '';
              }
            }}
            className="bulk-select"
            defaultValue=""
          >
            <option value="" disabled>Assign to table...</option>
            {event.tables.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>

          <select
            onChange={(e) => {
              if (e.target.value) {
                handleBulkStatusChange(e.target.value as Guest['rsvpStatus']);
                e.target.value = '';
              }
            }}
            className="bulk-select"
            defaultValue=""
          >
            <option value="" disabled>Change status...</option>
            <option value="confirmed">Confirmed</option>
            <option value="pending">Pending</option>
            <option value="declined">Declined</option>
          </select>

          <button className="bulk-btn danger" onClick={handleBulkDelete}>
            Delete
          </button>

          <button
            className="bulk-btn clear"
            onClick={() => setSelectedGuests(new Set())}
          >
            Clear
          </button>
        </div>
      )}

      <div className="gm-content">
        <div className="guest-table-container">
          {filteredGuests.length === 0 ? (
            <EmptyState
              variant={searchQuery || filterStatus !== 'all' || filterAssigned !== 'all' ? 'search' : 'guests'}
              title={searchQuery || filterStatus !== 'all' || filterAssigned !== 'all' ? 'No guests match your filters' : 'No guests yet'}
              description={searchQuery || filterStatus !== 'all' || filterAssigned !== 'all'
                ? 'Try adjusting your search or filter criteria.'
                : 'Start by adding your first guest to the event.'}
              action={{
                label: '+ Add Guest',
                onClick: () => setShowAddGuest(true)
              }}
            />
          ) : (
            <table className="guest-table">
              <thead>
                <tr>
                  <th className="checkbox-col">
                    <input
                      type="checkbox"
                      checked={selectedGuests.size === filteredGuests.length && filteredGuests.length > 0}
                      onChange={selectAll}
                    />
                  </th>
                  <th
                    className="sortable"
                    onClick={() => handleSort('name')}
                  >
                    Name {sortColumn === 'name' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th
                    className="sortable"
                    onClick={() => handleSort('group')}
                  >
                    Group {sortColumn === 'group' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th
                    className="sortable"
                    onClick={() => handleSort('rsvpStatus')}
                  >
                    RSVP {sortColumn === 'rsvpStatus' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th
                    className="sortable"
                    onClick={() => handleSort('table')}
                  >
                    Table {sortColumn === 'table' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredGuests.map((guest) => (
                  <tr
                    key={guest.id}
                    className={`${selectedGuests.has(guest.id) ? 'selected' : ''} ${selectedGuestDetail === guest.id ? 'highlighted' : ''}`}
                    onClick={() => setSelectedGuestDetail(guest.id)}
                  >
                    <td className="checkbox-col" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedGuests.has(guest.id)}
                        onChange={() => toggleGuestSelection(guest.id)}
                      />
                    </td>
                    <td>
                      <div className="guest-name-cell">
                        <div className="guest-avatar">
                          {getFullName(guest).split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </div>
                        <div>
                          <span className="guest-name">{getFullName(guest)}</span>
                          {guest.company && (
                            <span className="guest-company">{guest.company}</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      {guest.group ? (
                        <span className="group-chip">{guest.group}</span>
                      ) : (
                        <span className="no-group">—</span>
                      )}
                    </td>
                    <td>
                      <span className={`rsvp-badge ${guest.rsvpStatus}`}>
                        {guest.rsvpStatus}
                      </span>
                    </td>
                    <td>
                      {guest.tableId ? (
                        <span className="table-badge">{getTableName(guest.tableId)}</span>
                      ) : (
                        <span className="unassigned">Unassigned</span>
                      )}
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <div className="row-actions">
                        <button
                          className="action-icon-btn"
                          onClick={() => setEditingGuest(guest)}
                        >
                          Edit
                        </button>
                        <button
                          className="action-icon-btn danger"
                          onClick={() => {
                            if (confirm(`Delete ${getFullName(guest)}?`)) {
                              removeGuest(guest.id);
                            }
                          }}
                        >
                          Del
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Detail Panel */}
        {selectedGuestData && (
          <div className="guest-detail-panel">
            <div className="detail-header">
              <h3>Guest Details</h3>
              <button className="close-btn" onClick={() => setSelectedGuestDetail(null)}>×</button>
            </div>
            <div className="detail-content">
              <div className="detail-avatar">
                {getFullName(selectedGuestData).split(' ').map(n => n[0]).join('').slice(0, 2)}
              </div>
              <h2>{getFullName(selectedGuestData)}</h2>
              {selectedGuestData.email && (
                <p className="detail-email">{selectedGuestData.email}</p>
              )}
              {selectedGuestData.company && (
                <p className="detail-company">{selectedGuestData.company}</p>
              )}

              <div className="detail-badges">
                <span className={`rsvp-badge ${selectedGuestData.rsvpStatus}`}>
                  {selectedGuestData.rsvpStatus}
                </span>
                {selectedGuestData.group && (
                  <span className="group-chip">{selectedGuestData.group}</span>
                )}
              </div>

              {selectedGuestData.interests && selectedGuestData.interests.length > 0 && (
                <div className="detail-section">
                  <h4>Interests</h4>
                  <div className="tag-list">
                    {selectedGuestData.interests.map(i => (
                      <span key={i} className="tag">{i}</span>
                    ))}
                  </div>
                </div>
              )}

              {selectedGuestData.dietaryRestrictions && selectedGuestData.dietaryRestrictions.length > 0 && (
                <div className="detail-section">
                  <h4>Dietary Restrictions</h4>
                  <div className="tag-list">
                    {selectedGuestData.dietaryRestrictions.map(d => (
                      <span key={d} className="tag warning">{d}</span>
                    ))}
                  </div>
                </div>
              )}

              {selectedGuestData.relationships.length > 0 && (
                <div className="detail-section">
                  <h4>Relationships</h4>
                  <div className="relationships-list">
                    {selectedGuestData.relationships.map(rel => {
                      const relatedGuest = event.guests.find(g => g.id === rel.guestId);
                      return relatedGuest ? (
                        <div key={rel.guestId} className={`relationship-item ${rel.type}`}>
                          <span className="rel-name">{getFullName(relatedGuest)}</span>
                          <span className="rel-type">{rel.type}</span>
                        </div>
                      ) : null;
                    })}
                  </div>
                </div>
              )}

              {selectedGuestData.notes && (
                <div className="detail-section">
                  <h4>Notes</h4>
                  <p className="notes-text">{selectedGuestData.notes}</p>
                </div>
              )}

              <div className="detail-actions">
                <button
                  className="detail-btn"
                  onClick={() => setEditingGuest(selectedGuestData)}
                >
                  Edit Guest
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Relationships Panel */}
      {viewMode === 'relationships' && (
        <div className="relationships-panel">
          <div className="relationships-panel-header">
            <h3>Guest Relationships</h3>
            <button className="close-btn" onClick={() => setViewMode('list')}>×</button>
          </div>
          <RelationshipMatrix />
        </div>
      )}

      {/* Add/Edit Guest Modal */}
      {(showAddGuest || editingGuest) && (
        <GuestForm
          guestId={editingGuest?.id}
          onClose={() => {
            setShowAddGuest(false);
            setEditingGuest(null);
          }}
        />
      )}

      {/* Import Wizard */}
      {showImportWizard && (
        <ImportWizard
          isOpen={showImportWizard}
          onClose={() => setShowImportWizard(false)}
        />
      )}
    </div>
  );
}
