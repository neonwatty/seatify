import { useState } from 'react';
import { useStore } from '../store/useStore';
import { useIsMobile } from '../hooks/useResponsive';
import { GuestChip } from './GuestChip';
import { GuestForm } from './GuestForm';
import { GroupLegend } from './GroupLegend';
import './Sidebar.css';

export function Sidebar() {
  const {
    event,
    sidebarOpen,
    toggleSidebar,
    selectGuest,
    visibleGroups,
    toggleGroupVisibility,
    showAllGroups,
    hideAllGroups,
  } = useStore();
  const isMobile = useIsMobile();
  const [showAddGuest, setShowAddGuest] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterGroup, setFilterGroup] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const groups = [...new Set(event.guests.map((g) => g.group).filter(Boolean))];

  const filteredGuests = event.guests.filter((guest) => {
    const matchesSearch =
      guest.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      guest.company?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesGroup = filterGroup === 'all' || guest.group === filterGroup;
    const matchesStatus = filterStatus === 'all' || guest.rsvpStatus === filterStatus;
    return matchesSearch && matchesGroup && matchesStatus;
  });

  const unassignedGuests = filteredGuests.filter((g) => !g.tableId);
  const assignedGuests = filteredGuests.filter((g) => g.tableId);

  const stats = {
    total: event.guests.length,
    confirmed: event.guests.filter((g) => g.rsvpStatus === 'confirmed').length,
    pending: event.guests.filter((g) => g.rsvpStatus === 'pending').length,
    declined: event.guests.filter((g) => g.rsvpStatus === 'declined').length,
    assigned: event.guests.filter((g) => g.tableId).length,
  };

  if (!sidebarOpen) {
    return (
      <button className="sidebar-toggle-collapsed" onClick={toggleSidebar}>
        <span className="toggle-icon">◀</span>
        <span className="toggle-label">Guests</span>
        <span className="toggle-count">{stats.total}</span>
        <span className="toggle-stats">
          {stats.total - stats.assigned} unassigned
        </span>
      </button>
    );
  }

  return (
    <>
      {/* Mobile backdrop overlay */}
      {isMobile && sidebarOpen && (
        <div className="sidebar-backdrop" onClick={toggleSidebar} />
      )}
      <div className={`sidebar ${isMobile && sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
        <h2>Guests</h2>
        <button className="sidebar-toggle" onClick={toggleSidebar}>
          ▶
        </button>
      </div>

      <div className="sidebar-stats">
        <div className="stat">
          <span className="stat-value">{stats.total}</span>
          <span className="stat-label">Total</span>
        </div>
        <div className="stat confirmed">
          <span className="stat-value">{stats.confirmed}</span>
          <span className="stat-label">Confirmed</span>
        </div>
        <div className="stat pending">
          <span className="stat-value">{stats.pending}</span>
          <span className="stat-label">Pending</span>
        </div>
        <div className="stat">
          <span className="stat-value">{stats.assigned}</span>
          <span className="stat-label">Seated</span>
        </div>
      </div>

      <div className="sidebar-controls">
        <input
          type="text"
          placeholder="Search guests..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />

        <div className="filter-row">
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
        </div>

        <button className="add-guest-btn" onClick={() => setShowAddGuest(true)}>
          + Add Guest
        </button>
      </div>

      <div className="guest-lists">
        <div className="guest-list-section">
          <h3>Unassigned ({unassignedGuests.length})</h3>
          {unassignedGuests.length > 0 && (
            <p className="drag-hint">Drag guests to tables to assign seats</p>
          )}
          <div className="guest-list">
            {unassignedGuests.map((guest) => (
              <GuestChip
                key={guest.id}
                guest={guest}
                onClick={() => selectGuest(guest.id)}
              />
            ))}
            {unassignedGuests.length === 0 && (
              <p className="empty-message">
                {filteredGuests.length === 0
                  ? 'No guests match your filters'
                  : 'All guests are assigned!'}
              </p>
            )}
          </div>
        </div>

        <div className="guest-list-section">
          <h3>Assigned ({assignedGuests.length})</h3>
          <div className="guest-list">
            {assignedGuests.map((guest) => {
              const table = event.tables.find((t) => t.id === guest.tableId);
              return (
                <div key={guest.id} className="assigned-guest-row">
                  <GuestChip guest={guest} onClick={() => selectGuest(guest.id)} />
                  <span className="table-badge">{table?.name}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <GroupLegend
        guests={event.guests}
        visibleGroups={visibleGroups}
        onToggleGroup={toggleGroupVisibility}
        onShowAll={showAllGroups}
        onHideAll={hideAllGroups}
      />

      {showAddGuest && <GuestForm onClose={() => setShowAddGuest(false)} />}
      </div>
    </>
  );
}
