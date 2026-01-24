'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import type { QRTableData } from '@/types';
import { decodeTableData, getGuestCountText } from '@/utils/qrCodeUtils';
import '@/components/QRTableInfoPage.css';

interface QRTableInfoPageClientProps {
  encodedData: string;
}

export function QRTableInfoPageClient({ encodedData }: QRTableInfoPageClientProps) {
  const router = useRouter();

  // Decode table data synchronously using useMemo
  const { tableData, error, showBranding } = useMemo(() => {
    if (!encodedData) {
      return { tableData: null, error: true, showBranding: true };
    }
    const data = decodeTableData(encodedData);
    if (data) {
      return {
        tableData: data as QRTableData,
        error: false,
        showBranding: data.b !== 0, // Show branding unless explicitly hidden
      };
    }
    return { tableData: null, error: true, showBranding: true };
  }, [encodedData]);

  const handleNavigateToApp = () => {
    router.push('/');
  };

  if (error || !tableData) {
    return (
      <div className="qr-info-page">
        <div className="qr-info-container">
          <div className="qr-info-header">
            <h1 className="qr-brand">
              <span className="logo-seat">Seat</span>
              <span className="logo-ify">ify</span>
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
          {showBranding && (
            <h1 className="qr-brand">
              <span className="logo-seat">Seat</span>
              <span className="logo-ify">ify</span>
            </h1>
          )}
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
            <h3>Guests at this table</h3>
            <ul>
              {tableData.g.map((guest, index) => (
                <li key={index} className="guest-item">
                  <span className="guest-avatar">
                    {guest.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </span>
                  <span className="guest-name">{guest}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {showBranding && (
          <div className="qr-footer">
            <p>Seating chart powered by</p>
            <button className="footer-cta" onClick={handleNavigateToApp}>
              Seatify
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
