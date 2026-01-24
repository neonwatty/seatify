import { useRef, useCallback, useMemo } from 'react';
import QRCode from 'react-qr-code';
import { useStore } from '../store/useStore';
import { useSubscription } from '../hooks/useSubscription';
import type { Table, Guest } from '../types';
import {
  generateTableQRUrl,
  downloadQRCodeAsPng,
  copyToClipboard,
} from '../utils/qrCodeUtils';
import { showToast } from './toastStore';
import './QRCodeModal.css';

interface QRCodeModalProps {
  tableId: string;
  onClose: () => void;
}

export function QRCodeModal({ tableId, onClose }: QRCodeModalProps) {
  const qrRef = useRef<HTMLDivElement>(null);
  const { event } = useStore();
  const { limits } = useSubscription();

  const table = useMemo(
    () => event?.tables.find((t: Table) => t.id === tableId),
    [event?.tables, tableId]
  );

  const qrUrl = useMemo(
    () => (event && table ? generateTableQRUrl(event, table, { hideBranding: limits.canRemoveBranding }) : ''),
    [event, table, limits.canRemoveBranding]
  );

  const guestCount = useMemo(
    () =>
      event?.guests.filter(
        (g: Guest) => g.tableId === tableId && g.rsvpStatus === 'confirmed'
      ).length ?? 0,
    [event?.guests, tableId]
  );

  const handleDownload = useCallback(async () => {
    if (!table) return;
    const svgElement = qrRef.current?.querySelector('svg');
    if (svgElement) {
      try {
        await downloadQRCodeAsPng(svgElement, `${table.name}-qr-code`);
        showToast('QR code downloaded', 'success');
      } catch {
        showToast('Failed to download QR code', 'error');
      }
    }
  }, [table]);

  const handleCopyUrl = useCallback(async () => {
    if (!qrUrl) return;
    const success = await copyToClipboard(qrUrl);
    if (success) {
      showToast('URL copied to clipboard', 'success');
    } else {
      showToast('Failed to copy URL', 'error');
    }
  }, [qrUrl]);

  const handlePrint = useCallback(() => {
    if (!table || !event) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      showToast('Unable to open print window', 'error');
      return;
    }

    const svgElement = qrRef.current?.querySelector('svg');
    if (!svgElement) return;

    const svgData = new XMLSerializer().serializeToString(svgElement);

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>QR Code - ${table.name}</title>
          <style>
            body {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              padding: 2rem;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }
            .qr-container {
              text-align: center;
            }
            .qr-code {
              width: 250px;
              height: 250px;
              margin-bottom: 1.5rem;
            }
            .table-name {
              font-size: 2rem;
              font-weight: bold;
              margin: 0 0 0.5rem;
            }
            .event-name {
              font-size: 1.25rem;
              color: #666;
              margin: 0 0 0.5rem;
            }
            .event-date {
              font-size: 1rem;
              color: #888;
              margin: 0 0 1.5rem;
            }
            .scan-text {
              font-size: 0.875rem;
              color: #888;
              font-style: italic;
            }
            @media print {
              body {
                padding: 0;
              }
            }
          </style>
        </head>
        <body>
          <div class="qr-container">
            <div class="qr-code">${svgData}</div>
            <p class="table-name">${table.name}</p>
            <p class="event-name">${event.name}</p>
            ${event.date ? `<p class="event-date">${event.date}</p>` : ''}
            <p class="scan-text">Scan to view your tablemates</p>
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
    };
  }, [table, event]);

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    },
    [onClose]
  );

  // Early return after all hooks
  if (!event || !table) {
    return null;
  }

  return (
    <div className="modal-overlay qr-modal-overlay" onClick={handleOverlayClick}>
      <div className="qr-modal">
        <div className="qr-modal-header">
          <h2>QR Code for {table.name}</h2>
          <button className="close-btn" onClick={onClose} aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="qr-modal-content">
          <div className="qr-code-container" ref={qrRef}>
            <QRCode
              value={qrUrl}
              size={200}
              level="M"
              bgColor="#ffffff"
              fgColor="#000000"
            />
          </div>

          <div className="qr-table-info">
            <p className="qr-table-name">{table.name}</p>
            <p className="qr-table-meta">
              {guestCount} guest{guestCount !== 1 ? 's' : ''} assigned •{' '}
              {table.capacity} seats
            </p>
          </div>

          <div className="qr-actions">
            <button className="qr-action-btn" onClick={handleDownload}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Download PNG
            </button>
            <button className="qr-action-btn" onClick={handleCopyUrl}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
              Copy URL
            </button>
            <button className="qr-action-btn" onClick={handlePrint}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="6 9 6 2 18 2 18 9" />
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                <rect x="6" y="14" width="12" height="8" />
              </svg>
              Print
            </button>
          </div>

          <p className="qr-hint">
            Guests can scan this QR code to view their tablemates
          </p>
        </div>
      </div>
    </div>
  );
}
