import { useState } from 'react';
import { useStore } from '../store/useStore';
import { AnimatedCounter } from './AnimatedCounter';
import { EmptyState } from './EmptyState';
import { QRCodePrintView } from './QRCodePrintView';
import { PDFPreviewModal, type PlaceCardOptions, type TableCardOptions } from './PDFPreviewModal';
import { ShareLinkModal } from './ShareLinkModal';
import { OnboardingWizard } from './OnboardingWizard';
import { QR_TOUR_STEPS } from '../data/onboardingSteps';
import {
  downloadTableCards,
  downloadPlaceCards,
  previewTableCards,
  previewPlaceCards
} from '../utils/pdfUtils';
import { showToast } from './toastStore';
import './DashboardView.css';

export function DashboardView() {
  const {
    event,
    setActiveView,
    setEventName,
    setEventType,
    exportEvent
  } = useStore();
  const [showQRPrintView, setShowQRPrintView] = useState(false);
  const [showQRTour, setShowQRTour] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [isGeneratingTableCards, setIsGeneratingTableCards] = useState(false);
  const [isGeneratingPlaceCards, setIsGeneratingPlaceCards] = useState(false);

  // PDF Preview state
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState<'table' | 'place'>('table');
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  const [currentPlaceOptions, setCurrentPlaceOptions] = useState<PlaceCardOptions | undefined>();
  const [currentTableOptions, setCurrentTableOptions] = useState<TableCardOptions | undefined>();

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

  const handlePreviewTableCards = async () => {
    if (totalTables === 0) {
      showToast('Add tables first to preview table cards', 'warning');
      return;
    }

    setPreviewType('table');
    setShowPreviewModal(true);
    setIsGeneratingPreview(true);

    try {
      const url = await previewTableCards(event);
      setPreviewUrl(url);
    } catch (error) {
      console.error('Failed to generate preview:', error);
      showToast('Failed to generate preview. Please try again.', 'error');
      setShowPreviewModal(false);
    } finally {
      setIsGeneratingPreview(false);
    }
  };

  const handlePreviewPlaceCards = async () => {
    const seatedConfirmed = event.guests.filter(
      g => g.tableId && g.rsvpStatus === 'confirmed'
    ).length;

    if (seatedConfirmed === 0) {
      showToast('Assign confirmed guests to tables first', 'warning');
      return;
    }

    setPreviewType('place');
    setShowPreviewModal(true);
    setIsGeneratingPreview(true);

    try {
      const url = await previewPlaceCards(event);
      setPreviewUrl(url);
    } catch (error) {
      console.error('Failed to generate preview:', error);
      showToast('Failed to generate preview. Please try again.', 'error');
      setShowPreviewModal(false);
    } finally {
      setIsGeneratingPreview(false);
    }
  };

  const handleClosePreview = () => {
    // Clean up blob URL
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setShowPreviewModal(false);
    setCurrentPlaceOptions(undefined);
    setCurrentTableOptions(undefined);
  };

  const handleOptionsChange = async (placeOptions?: PlaceCardOptions, tableOptions?: TableCardOptions) => {
    // Store current options for download
    if (placeOptions) setCurrentPlaceOptions(placeOptions);
    if (tableOptions) setCurrentTableOptions(tableOptions);

    // Clean up old blob URL
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setIsGeneratingPreview(true);
    try {
      let url: string | null = null;
      if (previewType === 'table' && tableOptions) {
        url = await previewTableCards(event, {
          fontSize: tableOptions.fontSize,
          fontFamily: tableOptions.fontFamily,
          showGuestCount: tableOptions.showGuestCount,
          showEventName: tableOptions.showEventName,
          colorTheme: tableOptions.colorTheme,
          cardSize: tableOptions.cardSize,
        });
      } else if (previewType === 'place' && placeOptions) {
        url = await previewPlaceCards(event, {
          includeTableName: placeOptions.includeTableName,
          includeDietary: placeOptions.includeDietary,
          fontSize: placeOptions.fontSize,
          fontFamily: placeOptions.fontFamily,
          colorTheme: placeOptions.colorTheme,
          cardSize: placeOptions.cardSize,
        });
      }
      setPreviewUrl(url);
    } catch (error) {
      console.error('Failed to regenerate preview:', error);
    } finally {
      setIsGeneratingPreview(false);
    }
  };

  const handleDownloadFromPreview = (placeOptions?: PlaceCardOptions, tableOptions?: TableCardOptions) => {
    if (previewType === 'table') {
      // Use passed options or stored options
      handleDownloadTableCardsWithOptions(tableOptions ?? currentTableOptions);
    } else {
      // Use passed options or stored options
      handleDownloadPlaceCardsWithOptions(placeOptions ?? currentPlaceOptions);
    }
    handleClosePreview();
  };

  const handleDownloadTableCardsWithOptions = async (options?: TableCardOptions) => {
    if (totalTables === 0) {
      showToast('Add tables first to generate table cards', 'warning');
      return;
    }

    setIsGeneratingTableCards(true);
    try {
      await downloadTableCards(event, {
        fontSize: options?.fontSize ?? 'medium',
        fontFamily: options?.fontFamily ?? 'helvetica',
        showGuestCount: options?.showGuestCount ?? true,
        showEventName: options?.showEventName ?? true,
        colorTheme: options?.colorTheme ?? 'classic',
        cardSize: options?.cardSize ?? 'standard',
      });
      showToast('Table cards PDF downloaded', 'success');
    } catch (error) {
      console.error('Failed to generate table cards:', error);
      showToast('Failed to generate PDF. Please try again.', 'error');
    } finally {
      setIsGeneratingTableCards(false);
    }
  };

  const handleDownloadPlaceCardsWithOptions = async (options?: PlaceCardOptions) => {
    const seatedConfirmed = event.guests.filter(
      g => g.tableId && g.rsvpStatus === 'confirmed'
    ).length;

    if (seatedConfirmed === 0) {
      showToast('Assign confirmed guests to tables first', 'warning');
      return;
    }

    setIsGeneratingPlaceCards(true);
    try {
      await downloadPlaceCards(event, {
        includeTableName: options?.includeTableName ?? true,
        includeDietary: options?.includeDietary ?? true,
        fontSize: options?.fontSize ?? 'medium',
        fontFamily: options?.fontFamily ?? 'helvetica',
        colorTheme: options?.colorTheme ?? 'classic',
        cardSize: options?.cardSize ?? 'standard',
      });
      showToast('Place cards PDF downloaded', 'success');
    } catch (error) {
      console.error('Failed to generate place cards:', error);
      showToast('Failed to generate PDF. Please try again.', 'error');
    } finally {
      setIsGeneratingPlaceCards(false);
    }
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
            <button
              className="action-btn secondary"
              onClick={() => setShowShareModal(true)}
              disabled={totalGuests === 0 && totalTables === 0}
            >
              <span className="action-icon">↗</span>
              <span>Share View</span>
            </button>
          </div>
        </div>

        {/* Print Materials */}
        <div className="dashboard-card print-materials">
          <h3>Print Materials</h3>
          <p className="print-materials-description">
            Generate printable PDFs for your event
          </p>
          <div className="print-materials-grid">
            <button
              className="print-material-btn"
              onClick={handlePreviewTableCards}
              disabled={totalTables === 0 || isGeneratingTableCards}
            >
              <div className="print-material-icon">
                {isGeneratingTableCards ? (
                  <div className="btn-loading-spinner" />
                ) : (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <path d="M12 8v8M8 12h8" />
                  </svg>
                )}
              </div>
              <div className="print-material-info">
                <span className="print-material-title">
                  {isGeneratingTableCards ? 'Loading preview...' : 'Table Cards'}
                </span>
                <span className="print-material-desc">Tent cards for each table</span>
              </div>
              <span className="print-material-count">{totalTables} cards</span>
            </button>
            <button
              className="print-material-btn"
              onClick={handlePreviewPlaceCards}
              disabled={assignedGuests === 0 || confirmedGuests === 0 || isGeneratingPlaceCards}
            >
              <div className="print-material-icon">
                {isGeneratingPlaceCards ? (
                  <div className="btn-loading-spinner" />
                ) : (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                )}
              </div>
              <div className="print-material-info">
                <span className="print-material-title">
                  {isGeneratingPlaceCards ? 'Loading preview...' : 'Place Cards'}
                </span>
                <span className="print-material-desc">Name cards for seated guests</span>
              </div>
              <span className="print-material-count">
                {event.guests.filter(g => g.tableId && g.rsvpStatus === 'confirmed').length} cards
              </span>
            </button>
          </div>
        </div>

        {/* Table Summary */}
        <div className="dashboard-card tables-summary">
          <div className="card-header-with-action">
            <h3>Tables</h3>
            {event.tables.length > 0 && (
              <div className="tables-header-actions">
                <button
                  className="qr-print-btn"
                  onClick={() => setShowQRPrintView(true)}
                  title="Print all table QR codes"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 11h8V3H3v8zm2-6h4v4H5V5zm8-2v8h8V3h-8zm6 6h-4V5h4v4zM3 21h8v-8H3v8zm2-6h4v4H5v-4z" />
                  </svg>
                  Print QR Codes
                </button>
                <button
                  className="qr-help-btn"
                  onClick={() => setShowQRTour(true)}
                  title="Learn about QR codes"
                >
                  ?
                </button>
              </div>
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

      {/* QR Code Print View */}
      {showQRPrintView && (
        <QRCodePrintView onClose={() => setShowQRPrintView(false)} />
      )}

      {/* PDF Preview Modal */}
      <PDFPreviewModal
        isOpen={showPreviewModal}
        onClose={handleClosePreview}
        pdfUrl={previewUrl}
        title={previewType === 'table' ? 'Table Cards Preview' : 'Place Cards Preview'}
        onDownload={handleDownloadFromPreview}
        isGenerating={isGeneratingPreview}
        type={previewType}
        onOptionsChange={handleOptionsChange}
      />

      {/* QR Code Tour */}
      <OnboardingWizard
        isOpen={showQRTour}
        onClose={() => setShowQRTour(false)}
        onComplete={() => setShowQRTour(false)}
        customSteps={QR_TOUR_STEPS}
      />

      {/* Share Link Modal */}
      <ShareLinkModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        event={event}
      />
    </div>
  );
}
