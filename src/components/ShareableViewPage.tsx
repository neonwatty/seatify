import { useMemo, useState, useRef } from 'react';
import type { ChangeEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { decodeShareableUrl, importEventDataFile } from '../utils/shareableEventUtils';
import { ReadOnlyCanvas } from './ReadOnlyCanvas';
import type { Event } from '../types';
import './ShareableViewPage.css';

export function ShareableViewPage() {
  const { encodedData } = useParams<{ encodedData: string }>();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [importedEvent, setImportedEvent] = useState<Partial<Event> | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  // Decode event data from URL
  const { eventData, error } = useMemo(() => {
    if (!encodedData) {
      return { eventData: null, error: false };
    }
    const data = decodeShareableUrl(encodedData);
    if (data) {
      return { eventData: data, error: false };
    }
    return { eventData: null, error: true };
  }, [encodedData]);

  // Use imported event if available, otherwise use URL data
  const displayEvent = importedEvent || eventData;

  const handleNavigateToApp = () => {
    navigate('/events');
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
            <h2>View Shared Seating Chart</h2>
            <p>Upload a Seatify seating file to view the arrangement.</p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
            <button
              className="upload-btn"
              onClick={handleImportFile}
              disabled={isImporting}
            >
              {isImporting ? 'Loading...' : 'Upload Seating File'}
            </button>
            <button className="secondary-btn" onClick={handleNavigateToApp}>
              Or create your own event
            </button>
          </div>
        </div>
      </div>
    );
  }

  // URL decode error
  if (error) {
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
            <p>The link may be corrupted or outdated. Try asking for a new share link.</p>
            <div className="error-actions">
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
              <button className="upload-btn" onClick={handleImportFile}>
                Upload a file instead
              </button>
              <button className="secondary-btn" onClick={handleNavigateToApp}>
                Go to Seatify
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Display the seating chart
  return (
    <div className="shareable-page shareable-page-full">
      <div className="shareable-topbar">
        <div className="shareable-topbar-left">
          <h1 className="shareable-brand-small">
            <span className="logo-table">Table</span>
            <span className="logo-craft">Craft</span>
          </h1>
          <span className="shareable-badge">Shared View</span>
        </div>
        <div className="shareable-topbar-right">
          <button className="topbar-btn" onClick={handleNavigateToApp}>
            Create your own event
          </button>
        </div>
      </div>

      <div className="shareable-canvas-wrapper">
        <ReadOnlyCanvas
          tables={displayEvent?.tables || []}
          guests={displayEvent?.guests || []}
          venueElements={displayEvent?.venueElements}
          constraints={displayEvent?.constraints}
          eventName={displayEvent?.name}
        />
      </div>

      {/* Hidden file input for importing */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
    </div>
  );
}
