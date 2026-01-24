'use client';

import { useMemo, useState, useRef } from 'react';
import type { ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import { decodeShareableUrl, importEventDataFile, type ExpandedShareableData } from '@/utils/shareableEventUtils';
import { ReadOnlyCanvas } from '@/components/ReadOnlyCanvas';
import '@/components/ShareableViewPage.css';

interface ShareableViewPageClientProps {
  encodedData: string;
}

export function ShareableViewPageClient({ encodedData }: ShareableViewPageClientProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [importedEvent, setImportedEvent] = useState<ExpandedShareableData | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  // Decode event data from URL
  const { eventData, error, hideBranding } = useMemo(() => {
    if (!encodedData) {
      return { eventData: null, error: false, hideBranding: false };
    }
    const data = decodeShareableUrl(encodedData);
    if (data) {
      return { eventData: data, error: false, hideBranding: data.hideBranding || false };
    }
    return { eventData: null, error: true, hideBranding: false };
  }, [encodedData]);

  // Use imported event if available, otherwise use URL data
  const displayEvent = importedEvent || eventData;
  const showBranding = !(importedEvent?.hideBranding ?? hideBranding);

  const handleNavigateToApp = () => {
    router.push('/');
  };

  const handleImportFile = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const data = await importEventDataFile(file);
      if (data) {
        setImportedEvent(data);
      } else {
        alert('Unable to read the seating file. Make sure it\'s a valid Seatify export.');
      }
    } catch {
      alert('Error reading file.');
    } finally {
      setIsImporting(false);
      // Reset input so same file can be re-selected
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // No URL data and no imported file - show upload prompt
  if (!encodedData && !importedEvent) {
    return (
      <div className="shareable-page">
        <div className="shareable-container">
          <div className="shareable-header">
            <h1 className="shareable-brand">
              <span className="logo-seat">Seat</span>
              <span className="logo-ify">ify</span>
            </h1>
          </div>

          <div className="shareable-upload-prompt">
            <div className="upload-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </div>
            <h2>View a Seating Chart</h2>
            <p>Upload a Seatify export file to view the seating arrangement.</p>

            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />

            <button
              className="upload-button"
              onClick={handleImportFile}
              disabled={isImporting}
            >
              {isImporting ? 'Loading...' : 'Upload Seating File'}
            </button>

            <div className="shareable-divider">
              <span>or</span>
            </div>

            <button className="cta-button secondary" onClick={handleNavigateToApp}>
              Create Your Own Seating Chart
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Error decoding URL data
  if (error && !importedEvent) {
    return (
      <div className="shareable-page">
        <div className="shareable-container">
          <div className="shareable-header">
            <h1 className="shareable-brand">
              <span className="logo-seat">Seat</span>
              <span className="logo-ify">ify</span>
            </h1>
          </div>
          <div className="shareable-error">
            <div className="error-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <h2>Unable to load seating chart</h2>
            <p>The shared link may be outdated or damaged.</p>

            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />

            <button
              className="upload-button"
              onClick={handleImportFile}
              disabled={isImporting}
            >
              {isImporting ? 'Loading...' : 'Upload Seating File Instead'}
            </button>

            <button className="cta-button" onClick={handleNavigateToApp}>
              Go to Seatify
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Display event data
  if (displayEvent) {
    return (
      <div className="shareable-page has-canvas">
        <div className={`shareable-header-bar ${!showBranding ? 'no-branding' : ''}`}>
          {showBranding ? (
            <h1 className="shareable-brand-small">
              <span className="logo-seat">Seat</span>
              <span className="logo-ify">ify</span>
            </h1>
          ) : (
            <div className="event-brand-placeholder" />
          )}
          {displayEvent.name && <span className="event-title">{displayEvent.name}</span>}
          {showBranding && (
            <button className="header-cta" onClick={handleNavigateToApp}>
              Create Your Own
            </button>
          )}
        </div>

        <div className="shareable-canvas-wrapper">
          <ReadOnlyCanvas
            tables={displayEvent.tables || []}
            guests={displayEvent.guests || []}
            venueElements={displayEvent.venueElements}
            constraints={displayEvent.constraints}
            eventName={displayEvent.name}
          />
        </div>

        <div className="shareable-stats-bar">
          <div className="stat">
            <span className="stat-value">{displayEvent.tables?.length || 0}</span>
            <span className="stat-label">Tables</span>
          </div>
          <div className="stat">
            <span className="stat-value">{displayEvent.guests?.length || 0}</span>
            <span className="stat-label">Guests</span>
          </div>
          <div className="stat">
            <span className="stat-value">
              {displayEvent.guests?.filter(g => g.tableId).length || 0}
            </span>
            <span className="stat-label">Seated</span>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
