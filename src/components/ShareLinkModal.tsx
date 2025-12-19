import { useState, useEffect, useMemo } from 'react';
import QRCode from 'react-qr-code';
import {
  generateShareUrl,
  isShareUrlTooLarge,
  getShareUrlLength,
  downloadEventDataFile,
} from '../utils/shareableEventUtils';
import { copyToClipboard } from '../utils/qrCodeUtils';
import type { Event } from '../types';
import './ShareLinkModal.css';

interface ShareLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: Event;
}

export function ShareLinkModal({ isOpen, onClose, event }: ShareLinkModalProps) {
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);

  // Generate URL and check size
  const { shareUrl, isTooLarge, dataLength } = useMemo(() => {
    const url = generateShareUrl(event);
    const length = getShareUrlLength(event);
    return {
      shareUrl: url,
      isTooLarge: isShareUrlTooLarge(event),
      dataLength: length,
    };
  }, [event]);

  // Reset copied state when modal closes
  useEffect(() => {
    if (!isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state reset on modal close
      setCopied(false);
      setShowQR(false);
    }
  }, [isOpen]);

  // Close on escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleCopyLink = async () => {
    const success = await copyToClipboard(shareUrl);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownloadFile = () => {
    downloadEventDataFile(event);
  };

  const guestCount = event.guests.filter(g => g.rsvpStatus !== 'declined').length;
  const tableCount = event.tables.length;

  return (
    <div className="share-modal-overlay" onClick={handleOverlayClick}>
      <div className="share-modal">
        <div className="share-modal-header">
          <h2>Share Seating Chart</h2>
          <button className="share-modal-close" onClick={onClose}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="share-modal-content">
          {/* Event summary */}
          <div className="share-event-summary">
            <div className="share-event-name">{event.name}</div>
            <div className="share-event-stats">
              {tableCount} table{tableCount !== 1 ? 's' : ''} &bull; {guestCount} guest{guestCount !== 1 ? 's' : ''}
            </div>
          </div>

          {/* URL too large warning */}
          {isTooLarge && (
            <div className="share-warning">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              <div>
                <strong>Event is too large for URL sharing</strong>
                <p>With {guestCount} guests and {tableCount} tables, the URL would be too long for most browsers. Use the download option instead.</p>
              </div>
            </div>
          )}

          {/* Share URL section */}
          {!isTooLarge && (
            <div className="share-url-section">
              <label className="share-label">Shareable Link</label>
              <div className="share-url-container">
                <input
                  type="text"
                  className="share-url-input"
                  value={shareUrl}
                  readOnly
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                />
                <button
                  className={`share-copy-btn ${copied ? 'copied' : ''}`}
                  onClick={handleCopyLink}
                >
                  {copied ? (
                    <>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      Copied!
                    </>
                  ) : (
                    <>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                      </svg>
                      Copy
                    </>
                  )}
                </button>
              </div>
              <p className="share-url-hint">
                Anyone with this link can view your seating arrangement (read-only).
                <br />
                <span className="share-data-size">Data size: {(dataLength / 1024).toFixed(1)} KB</span>
              </p>

              {/* QR Code toggle */}
              <button
                className="share-qr-toggle"
                onClick={() => setShowQR(!showQR)}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="7" height="7" />
                  <rect x="14" y="3" width="7" height="7" />
                  <rect x="3" y="14" width="7" height="7" />
                  <rect x="14" y="14" width="7" height="7" />
                </svg>
                {showQR ? 'Hide QR Code' : 'Show QR Code'}
              </button>

              {/* QR Code */}
              {showQR && (
                <div className="share-qr-container">
                  <QRCode
                    value={shareUrl}
                    size={200}
                    level="M"
                    className="share-qr-code"
                  />
                  <p className="share-qr-hint">Scan to view on mobile</p>
                </div>
              )}
            </div>
          )}

          {/* Download file section */}
          <div className="share-download-section">
            <label className="share-label">
              {isTooLarge ? 'Share via File' : 'Alternative: Download File'}
            </label>
            <button className="share-download-btn" onClick={handleDownloadFile}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Download Seating Data
            </button>
            <p className="share-download-hint">
              Download a file to share via email or messaging. Recipients can upload the file to view.
            </p>
          </div>
        </div>

        <div className="share-modal-footer">
          <p className="share-footer-note">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4" />
              <path d="M12 8h.01" />
            </svg>
            Shared views are read-only and do not sync with your changes.
          </p>
        </div>
      </div>
    </div>
  );
}
