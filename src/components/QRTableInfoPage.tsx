import { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { QRTableData } from '../types';
import { decodeTableData, getGuestCountText } from '../utils/qrCodeUtils';
import './QRTableInfoPage.css';

export function QRTableInfoPage() {
  const { encodedData } = useParams<{ encodedData: string }>();
  const navigate = useNavigate();

  // Decode table data synchronously using useMemo
  const { tableData, error } = useMemo(() => {
    if (!encodedData) {
      return { tableData: null, error: true };
    }
    const data = decodeTableData(encodedData);
    if (data) {
      return { tableData: data as QRTableData, error: false };
    }
    return { tableData: null, error: true };
  }, [encodedData]);

  const handleNavigateToApp = () => {
    navigate('/events');
  };

  if (error || !tableData) {
    return (
      <div className="qr-info-page">
        <div className="qr-info-container">
          <div className="qr-info-header">
            <h1 className="qr-brand">
              <span className="logo-table">Table</span>
              <span className="logo-craft">Craft</span>
            </h1>
          </div>
          <div className="qr-info-error">
            <div className="error-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <h2>Unable to load table information</h2>
            <p>The QR code may be outdated or damaged.</p>
            <button className="cta-button" onClick={handleNavigateToApp}>
              Go to Seatify
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="qr-info-page">
      <div className="qr-info-container">
        <div className="qr-info-header">
          <h1 className="qr-brand">
            <span className="logo-seat">Seat</span>
            <span className="logo-ify">ify</span>
          </h1>
          {tableData.e && <p className="event-name">{tableData.e}</p>}
          {tableData.d && <p className="event-date">{tableData.d}</p>}
        </div>

        <div className="qr-table-card">
          <div className="table-badge">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
            </svg>
          </div>
          <h2 className="table-name">{tableData.t}</h2>
          <p className="table-capacity">{getGuestCountText(tableData)}</p>
        </div>

        {tableData.g.length > 0 && (
          <div className="qr-guest-list">
            <h3>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              Guests at this table
            </h3>
            <ul>
              {tableData.g.map((guest, index) => (
                <li key={index}>{guest}</li>
              ))}
            </ul>
          </div>
        )}

        {tableData.g.length === 0 && (
          <div className="qr-no-guests">
            <p>No guests have been assigned to this table yet.</p>
          </div>
        )}

        <div className="qr-info-footer">
          <button className="cta-button-secondary" onClick={handleNavigateToApp}>
            Plan your own event with Seatify
          </button>
        </div>
      </div>
    </div>
  );
}
