import { useState, useRef } from 'react';
import { useStore } from '../store/useStore';
import './Header.css';

export function Header() {
  const { event, setEventName, setEventType, activeView, setActiveView, resetEvent, exportEvent, importEvent, importGuests } = useStore();
  const [showImportModal, setShowImportModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    const data = exportEvent();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${event.name.replace(/\s+/g, '-').toLowerCase()}-seating.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportEvent = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        try {
          importEvent(content);
          setShowImportModal(false);
        } catch (err) {
          alert('Failed to import event file');
        }
      };
      reader.readAsText(file);
    }
  };

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        try {
          const lines = content.split('\n').filter(line => line.trim());
          const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
          const guests = lines.slice(1).map(line => {
            const values = line.split(',').map(v => v.trim());
            const guest: Record<string, string> = {};
            headers.forEach((header, idx) => {
              guest[header] = values[idx] || '';
            });
            return {
              name: guest.name || `${guest.firstname || ''} ${guest.lastname || ''}`.trim(),
              email: guest.email,
              company: guest.company || guest.organization,
              jobTitle: guest.jobtitle || guest.title || guest.role,
              group: guest.group || guest.category,
            };
          }).filter(g => g.name);

          importGuests(guests);
          setShowImportModal(false);
          alert(`Imported ${guests.length} guests`);
        } catch (err) {
          alert('Failed to parse CSV file');
        }
      };
      reader.readAsText(file);
    }
  };

  const handleReset = () => {
    if (confirm('Are you sure you want to reset? All data will be lost.')) {
      resetEvent();
    }
  };

  return (
    <header className="header">
      <div className="header-left">
        <h1 className="logo">SeatOptima</h1>
        <div className="event-info">
          <input
            type="text"
            value={event.name}
            onChange={(e) => setEventName(e.target.value)}
            className="event-name-input"
          />
          <select
            value={event.type}
            onChange={(e) => setEventType(e.target.value as typeof event.type)}
            className="event-type-select"
          >
            <option value="wedding">Wedding</option>
            <option value="corporate">Corporate</option>
            <option value="social">Social</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>

      <nav className="header-nav">
        <button
          className={`nav-btn ${activeView === 'canvas' ? 'active' : ''}`}
          onClick={() => setActiveView('canvas')}
        >
          Floor Plan
        </button>
        <button
          className={`nav-btn ${activeView === 'optimize' ? 'active' : ''}`}
          onClick={() => setActiveView('optimize')}
        >
          Optimize
        </button>
      </nav>

      <div className="header-right">
        <button className="action-btn" onClick={() => setShowImportModal(true)}>
          Import
        </button>
        <button className="action-btn" onClick={handleExport}>
          Export
        </button>
        <button className="action-btn danger" onClick={handleReset}>
          Reset
        </button>
      </div>

      {showImportModal && (
        <div className="modal-overlay" onClick={() => setShowImportModal(false)}>
          <div className="import-modal" onClick={(e) => e.stopPropagation()}>
            <h2>Import Data</h2>

            <div className="import-option">
              <h3>Import Guest List (CSV)</h3>
              <p>Upload a CSV file with columns: name, email, company, group, etc.</p>
              <input
                type="file"
                accept=".csv"
                onChange={handleImportCSV}
              />
            </div>

            <div className="import-option">
              <h3>Import Full Event (JSON)</h3>
              <p>Restore a previously exported event file.</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleImportEvent}
              />
            </div>

            <button className="close-modal" onClick={() => setShowImportModal(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
