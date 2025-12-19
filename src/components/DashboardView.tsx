import { useState } from 'react';
import { useStore } from '../store/useStore';
import { AnimatedCounter } from './AnimatedCounter';
import { EmptyState } from './EmptyState';
import { QRCodePrintView } from './QRCodePrintView';
import './DashboardView.css';

export function DashboardView() {
  const [showQRPrint, setShowQRPrint] = useState(false);
  const {
    event,
    setActiveView,
    setEventName,
    setEventType,
    exportEvent
  } = useStore();

  // Computed statistics from real data
  const totalGuests = event.guests.length;
  const totalTables = event.tables.length;
  const confirmedGuests = event.guests.filter(g => g.rsvpStatus === 'confirmed').length;
  const pendingGuests = event.guests.filter(g => g.rsvpStatus === 'pending').length;
  const declinedGuests = event.guests.filter(g => g.rsvpStatus === 'declined').length;
  const assignedGuests = event.guests.filter(g => g.tableId).length;
  const unassignedGuests = totalGuests - assignedGuests;
  const seatingPercentage = totalGuests > 0 ? Math.round((assignedGuests / totalGuests) * 100) : 0;
  const totalCapacity = event.tables.reduce((sum, t) => sum + t.capacity, 0);

  const handleExport = () => {
    const json = exportEvent();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${event.name.replace(/\s+/g, '-').toLowerCase()}-seating.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="dashboard-view">
      <div className="dashboard-grid">
        {/* Event Summary Card */}
        <div className="dashboard-card event-summary">
          <h3>Event Details</h3>
          <div className="event-info">
            <input
              type="text"
              className="event-name-input"
              value={event.name}
              onChange={(e) => setEventName(e.target.value)}
              placeholder="Event name..."
            />
            <div className="event-meta">
              <select
                className="event-type-select"
                value={event.eventType}
                onChange={(e) => setEventType(e.target.value as typeof event.eventType)}
              >
                <option value="wedding">Wedding</option>
                <option value="corporate">Corporate</option>
                <option value="social">Social</option>
                <option value="other">Other</option>
              </select>
              {event.date && (
                <span className="event-date">{event.date}</span>
              )}
            </div>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="dashboard-card stats-overview">
          <h3>Overview</h3>
          <div className="stats-grid">
            <div className="stat-item">
              <AnimatedCounter value={totalGuests} className="stat-value" />
              <span className="stat-label">Total Guests</span>
            </div>
            <div className="stat-item">
              <AnimatedCounter value={totalTables} className="stat-value" />
              <span className="stat-label">Tables</span>
            </div>
            <div className="stat-item confirmed">
              <AnimatedCounter value={confirmedGuests} className="stat-value" />
              <span className="stat-label">Confirmed</span>
            </div>
            <div className="stat-item warning">
              <AnimatedCounter value={pendingGuests} className="stat-value" />
              <span className="stat-label">Pending</span>
            </div>
            <div className="stat-item error">
              <AnimatedCounter value={declinedGuests} className="stat-value" />
              <span className="stat-label">Declined</span>
            </div>
            <div className="stat-item">
              <AnimatedCounter value={unassignedGuests} className="stat-value" />
              <span className="stat-label">Unassigned</span>
            </div>
          </div>
        </div>

        {/* Progress Ring */}
        <div className="dashboard-card progress-card">
          <h3>Seating Progress</h3>
          <div className="progress-ring-container">
            <svg className="progress-ring" viewBox="0 0 120 120">
              <circle
                className="progress-ring-bg"
                cx="60"
                cy="60"
                r="52"
                fill="none"
                strokeWidth="12"
              />
              <circle
                className="progress-ring-fill"
                cx="60"
                cy="60"
                r="52"
                fill="none"
                strokeWidth="12"
                strokeDasharray={`${(seatingPercentage / 100) * 327} 327`}
                strokeLinecap="round"
              />
            </svg>
            <div className="progress-text">
              <span className="progress-percentage"><AnimatedCounter value={seatingPercentage} />%</span>
              <span className="progress-label">Complete</span>
            </div>
          </div>
          <div className="progress-detail">
            {assignedGuests} / {totalGuests} guests seated
          </div>
          {totalCapacity > 0 && (
            <div className="capacity-info">
              Total capacity: {totalCapacity} seats
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="dashboard-card quick-actions">
          <h3>Quick Actions</h3>
          <div className="actions-grid">
            <button
              className="action-btn primary"
              onClick={() => setActiveView('canvas')}
            >
              <span className="action-icon">+</span>
              <span>Add Tables</span>
            </button>
            <button
              className="action-btn primary"
              onClick={() => setActiveView('guests')}
            >
              <span className="action-icon">+</span>
              <span>Manage Guests</span>
            </button>
            <button
              className="action-btn outline"
              onClick={handleExport}
            >
              <span className="action-icon">↓</span>
              <span>Export Event</span>
            </button>
          </div>
        </div>

        {/* Table Summary */}
        <div className="dashboard-card tables-summary">
          <div className="tables-header">
            <h3>Tables</h3>
            {event.tables.length > 0 && (
              <button
                className="qr-print-btn"
                onClick={() => setShowQRPrint(true)}
              >
                🖨️ Print QR Codes
              </button>
            )}
          </div>
          {event.tables.length === 0 ? (
            <EmptyState
              variant="tables"
              title="No tables yet"
              description="Create your floor plan to start arranging seating."
              action={{
                label: 'Create Floor Plan',
                onClick: () => setActiveView('canvas')
              }}
            />
          ) : (
            <div className="tables-grid">
              {event.tables.map((table) => {
                const seatedGuests = event.guests.filter(g => g.tableId === table.id).length;
                return (
                  <div key={table.id} className="table-summary-item">
                    <div className="table-info">
                      <span className="table-name">{table.name}</span>
                      <span className={`table-shape ${table.shape}`}>{table.shape}</span>
                    </div>
                    <div className="table-occupancy">
                      <div
                        className="occupancy-bar"
                        style={{ width: `${(seatedGuests / table.capacity) * 100}%` }}
                      />
                      <span className="occupancy-text">{seatedGuests}/{table.capacity}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* QR Code Print View Modal */}
      {showQRPrint && (
        <QRCodePrintView onClose={() => setShowQRPrint(false)} />
      )}
    </div>
  );
}
