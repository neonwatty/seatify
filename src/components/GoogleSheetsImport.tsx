'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  checkGoogleConnection,
  getGoogleAuthorizationUrl,
  disconnectGoogle,
  listGoogleSpreadsheets,
  getSpreadsheetTabs,
  previewGoogleSheet,
  importFromGoogleSheet,
  type ColumnMapping,
  type ImportResult,
} from '@/actions/googleSheets';
import type { Spreadsheet, Sheet, SheetData } from '@/lib/google/sheets';
import { showToast } from './toastStore';
import './GoogleSheetsImport.css';

interface GoogleSheetsImportProps {
  eventId: string;
  onImportComplete: () => void;
  onClose: () => void;
}

type Step = 'connect' | 'select' | 'mapping' | 'importing' | 'complete';

export function GoogleSheetsImport({ eventId, onImportComplete, onClose }: GoogleSheetsImportProps) {
  const [step, setStep] = useState<Step>('connect');
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);

  // Spreadsheet selection
  const [spreadsheets, setSpreadsheets] = useState<Spreadsheet[]>([]);
  const [selectedSpreadsheet, setSelectedSpreadsheet] = useState<Spreadsheet | null>(null);
  const [sheets, setSheets] = useState<Sheet[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<Sheet | null>(null);

  // Preview and mapping
  const [previewData, setPreviewData] = useState<SheetData | null>(null);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({
    firstName: '',
    lastName: '',
  });
  const [duplicateHandling, setDuplicateHandling] = useState<'skip' | 'update' | 'create'>('skip');

  // Import results
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  const loadSpreadsheets = useCallback(async () => {
    setIsLoading(true);
    const result = await listGoogleSpreadsheets();
    if (result.error === 'NOT_CONNECTED') {
      setIsConnected(false);
      setStep('connect');
    } else if (result.data) {
      setSpreadsheets(result.data);
    } else {
      showToast(result.error || 'Failed to load spreadsheets', 'error');
    }
    setIsLoading(false);
  }, []);

  // Check connection status on mount
  useEffect(() => {
    async function checkConnection() {
      const result = await checkGoogleConnection();
      if (result.data?.connected) {
        setIsConnected(true);
        setStep('select');
        loadSpreadsheets();
      } else {
        setIsConnected(false);
        setStep('connect');
      }
      setIsLoading(false);
    }
    checkConnection();
  }, [loadSpreadsheets]);

  const handleConnect = async () => {
    setIsLoading(true);
    const result = await getGoogleAuthorizationUrl(eventId);
    if (result.url) {
      window.location.href = result.url;
    } else {
      showToast(result.error || 'Failed to connect', 'error');
      setIsLoading(false);
    }
  };

  const handleDisconnect = async () => {
    const result = await disconnectGoogle();
    if (result.success) {
      setIsConnected(false);
      setStep('connect');
      setSpreadsheets([]);
      setSelectedSpreadsheet(null);
      showToast('Google disconnected', 'success');
    } else {
      showToast(result.error || 'Failed to disconnect', 'error');
    }
  };

  const handleSpreadsheetSelect = async (spreadsheet: Spreadsheet) => {
    setSelectedSpreadsheet(spreadsheet);
    setIsLoading(true);

    const result = await getSpreadsheetTabs(spreadsheet.id);
    if (result.data) {
      setSheets(result.data);
      // Auto-select first sheet
      if (result.data.length > 0) {
        handleSheetSelect(result.data[0], spreadsheet.id);
      }
    } else {
      showToast(result.error || 'Failed to load sheets', 'error');
    }
    setIsLoading(false);
  };

  const handleSheetSelect = async (sheet: Sheet, spreadsheetId?: string) => {
    setSelectedSheet(sheet);
    setIsLoading(true);

    const id = spreadsheetId || selectedSpreadsheet?.id;
    if (!id) return;

    const result = await previewGoogleSheet(id, sheet.title);
    if (result.data) {
      setPreviewData(result.data.sheet);
      // Apply auto-detected mappings
      setColumnMapping({
        firstName: result.data.mappings.firstName || '',
        lastName: result.data.mappings.lastName || '',
        email: result.data.mappings.email,
        company: result.data.mappings.company,
        jobTitle: result.data.mappings.jobTitle,
        group: result.data.mappings.group,
        notes: result.data.mappings.notes,
      });
      setStep('mapping');
    } else {
      showToast(result.error || 'Failed to preview sheet', 'error');
    }
    setIsLoading(false);
  };

  const handleMappingChange = useCallback((field: keyof ColumnMapping, value: string | undefined) => {
    setColumnMapping(prev => ({ ...prev, [field]: value || undefined }));
  }, []);

  const handleImport = async () => {
    if (!selectedSpreadsheet || !selectedSheet) return;

    // Validate required mappings
    if (!columnMapping.firstName && !columnMapping.lastName) {
      showToast('Please map at least First Name or Last Name', 'error');
      return;
    }

    setStep('importing');

    const result = await importFromGoogleSheet(
      eventId,
      selectedSpreadsheet.id,
      selectedSheet.title,
      columnMapping,
      duplicateHandling
    );

    if (result.data) {
      setImportResult(result.data);
      setStep('complete');
      onImportComplete();
    } else {
      showToast(result.error || 'Import failed', 'error');
      setStep('mapping');
    }
  };

  if (isLoading && step === 'connect') {
    return (
      <div className="gsheets-import">
        <div className="gsheets-loading">
          <div className="loading-spinner" />
          <p>Checking connection...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="gsheets-import">
      <div className="gsheets-header">
        <h2>Import from Google Sheets</h2>
        <button className="gsheets-close" onClick={onClose} aria-label="Close">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Step indicator */}
      <div className="gsheets-steps">
        <div className={`gsheets-step ${step === 'connect' ? 'active' : isConnected ? 'complete' : ''}`}>
          <span className="step-number">1</span>
          <span className="step-label">Connect</span>
        </div>
        <div className={`gsheets-step ${step === 'select' ? 'active' : ['mapping', 'importing', 'complete'].includes(step) ? 'complete' : ''}`}>
          <span className="step-number">2</span>
          <span className="step-label">Select</span>
        </div>
        <div className={`gsheets-step ${step === 'mapping' ? 'active' : ['importing', 'complete'].includes(step) ? 'complete' : ''}`}>
          <span className="step-number">3</span>
          <span className="step-label">Map</span>
        </div>
        <div className={`gsheets-step ${step === 'complete' ? 'active complete' : ''}`}>
          <span className="step-number">4</span>
          <span className="step-label">Import</span>
        </div>
      </div>

      <div className="gsheets-content">
        {/* Connect Step */}
        {step === 'connect' && (
          <div className="gsheets-connect">
            <div className="gsheets-icon">
              <svg width="64" height="64" viewBox="0 0 64 64">
                <rect width="64" height="64" rx="8" fill="#0F9D58" />
                <path d="M20 18h24a2 2 0 0 1 2 2v24a2 2 0 0 1-2 2H20a2 2 0 0 1-2-2V20a2 2 0 0 1 2-2z" fill="#fff" />
                <path d="M18 28h28M18 36h28M30 18v28" stroke="#0F9D58" strokeWidth="2" />
              </svg>
            </div>
            <h3>Connect Google Sheets</h3>
            <p>
              Import your guest list directly from a Google Spreadsheet.
              We&apos;ll only request read-only access to your files.
            </p>
            <button
              className="gsheets-connect-btn"
              onClick={handleConnect}
              disabled={isLoading}
            >
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Connect with Google
            </button>
          </div>
        )}

        {/* Select Spreadsheet Step */}
        {step === 'select' && (
          <div className="gsheets-select">
            <div className="gsheets-select-header">
              <h3>Select a Spreadsheet</h3>
              <button className="gsheets-disconnect" onClick={handleDisconnect}>
                Disconnect
              </button>
            </div>

            {isLoading ? (
              <div className="gsheets-loading">
                <div className="loading-spinner" />
                <p>Loading spreadsheets...</p>
              </div>
            ) : spreadsheets.length === 0 ? (
              <div className="gsheets-empty">
                <p>No spreadsheets found in your Google Drive.</p>
                <button className="gsheets-btn secondary" onClick={loadSpreadsheets}>
                  Refresh
                </button>
              </div>
            ) : (
              <>
                <div className="spreadsheet-list">
                  {spreadsheets.map((spreadsheet) => (
                    <button
                      key={spreadsheet.id}
                      className={`spreadsheet-item ${selectedSpreadsheet?.id === spreadsheet.id ? 'selected' : ''}`}
                      onClick={() => handleSpreadsheetSelect(spreadsheet)}
                    >
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="#0F9D58">
                        <rect width="24" height="24" rx="4" />
                        <path d="M6 6h12a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1z" fill="#fff" />
                        <path d="M5 10h14M5 14h14M11 6v12" stroke="#0F9D58" strokeWidth="1" />
                      </svg>
                      <span className="spreadsheet-name">{spreadsheet.name}</span>
                    </button>
                  ))}
                </div>

                {selectedSpreadsheet && sheets.length > 1 && (
                  <div className="sheet-tabs">
                    <p className="sheet-tabs-label">Select sheet:</p>
                    <div className="sheet-tab-list">
                      {sheets.map((sheet) => (
                        <button
                          key={sheet.id}
                          className={`sheet-tab ${selectedSheet?.id === sheet.id ? 'active' : ''}`}
                          onClick={() => handleSheetSelect(sheet)}
                        >
                          {sheet.title}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Mapping Step */}
        {step === 'mapping' && previewData && (
          <div className="gsheets-mapping">
            <h3>Map Columns</h3>
            <p className="mapping-hint">
              Match your spreadsheet columns to guest fields. First Name or Last Name is required.
            </p>

            <div className="mapping-grid">
              <div className="mapping-row required">
                <label>First Name *</label>
                <select
                  value={columnMapping.firstName}
                  onChange={(e) => handleMappingChange('firstName', e.target.value)}
                >
                  <option value="">-- Select --</option>
                  {previewData.headers.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>
              <div className="mapping-row required">
                <label>Last Name *</label>
                <select
                  value={columnMapping.lastName}
                  onChange={(e) => handleMappingChange('lastName', e.target.value)}
                >
                  <option value="">-- Select --</option>
                  {previewData.headers.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>
              <div className="mapping-row">
                <label>Email</label>
                <select
                  value={columnMapping.email || ''}
                  onChange={(e) => handleMappingChange('email', e.target.value || undefined)}
                >
                  <option value="">-- Skip --</option>
                  {previewData.headers.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>
              <div className="mapping-row">
                <label>Company</label>
                <select
                  value={columnMapping.company || ''}
                  onChange={(e) => handleMappingChange('company', e.target.value || undefined)}
                >
                  <option value="">-- Skip --</option>
                  {previewData.headers.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>
              <div className="mapping-row">
                <label>Job Title</label>
                <select
                  value={columnMapping.jobTitle || ''}
                  onChange={(e) => handleMappingChange('jobTitle', e.target.value || undefined)}
                >
                  <option value="">-- Skip --</option>
                  {previewData.headers.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>
              <div className="mapping-row">
                <label>Group</label>
                <select
                  value={columnMapping.group || ''}
                  onChange={(e) => handleMappingChange('group', e.target.value || undefined)}
                >
                  <option value="">-- Skip --</option>
                  {previewData.headers.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Preview */}
            <div className="preview-section">
              <h4>Preview ({previewData.totalRows} rows)</h4>
              <div className="preview-table-wrapper">
                <table className="preview-table">
                  <thead>
                    <tr>
                      {previewData.headers.map((h) => (
                        <th key={h}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.rows.slice(0, 5).map((row, i) => (
                      <tr key={i}>
                        {previewData.headers.map((h) => (
                          <td key={h}>{row[h] || ''}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Duplicate handling */}
            <div className="duplicate-section">
              <h4>Duplicate Handling</h4>
              <div className="duplicate-options">
                <label className="duplicate-option">
                  <input
                    type="radio"
                    name="duplicates"
                    value="skip"
                    checked={duplicateHandling === 'skip'}
                    onChange={() => setDuplicateHandling('skip')}
                  />
                  <span>Skip duplicates</span>
                </label>
                <label className="duplicate-option">
                  <input
                    type="radio"
                    name="duplicates"
                    value="update"
                    checked={duplicateHandling === 'update'}
                    onChange={() => setDuplicateHandling('update')}
                  />
                  <span>Update existing</span>
                </label>
                <label className="duplicate-option">
                  <input
                    type="radio"
                    name="duplicates"
                    value="create"
                    checked={duplicateHandling === 'create'}
                    onChange={() => setDuplicateHandling('create')}
                  />
                  <span>Create new anyway</span>
                </label>
              </div>
            </div>

            <div className="gsheets-actions">
              <button className="gsheets-btn secondary" onClick={() => setStep('select')}>
                Back
              </button>
              <button
                className="gsheets-btn primary"
                onClick={handleImport}
                disabled={!columnMapping.firstName && !columnMapping.lastName}
              >
                Import {previewData.totalRows} Guests
              </button>
            </div>
          </div>
        )}

        {/* Importing Step */}
        {step === 'importing' && (
          <div className="gsheets-importing">
            <div className="loading-spinner large" />
            <h3>Importing Guests...</h3>
            <p>Please wait while we import your guest list.</p>
          </div>
        )}

        {/* Complete Step */}
        {step === 'complete' && importResult && (
          <div className="gsheets-complete">
            <div className="success-icon">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22,4 12,14.01 9,11.01" />
              </svg>
            </div>
            <h3>Import Complete!</h3>
            <div className="import-stats">
              <div className="import-stat">
                <span className="stat-value success">{importResult.imported}</span>
                <span className="stat-label">Imported</span>
              </div>
              <div className="import-stat">
                <span className="stat-value">{importResult.skipped}</span>
                <span className="stat-label">Skipped</span>
              </div>
              {importResult.errors.length > 0 && (
                <div className="import-stat">
                  <span className="stat-value error">{importResult.errors.length}</span>
                  <span className="stat-label">Errors</span>
                </div>
              )}
            </div>

            {importResult.errors.length > 0 && (
              <div className="import-errors">
                <h4>Errors:</h4>
                <ul>
                  {importResult.errors.slice(0, 5).map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                  {importResult.errors.length > 5 && (
                    <li>...and {importResult.errors.length - 5} more</li>
                  )}
                </ul>
              </div>
            )}

            <button className="gsheets-btn primary" onClick={onClose}>
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
