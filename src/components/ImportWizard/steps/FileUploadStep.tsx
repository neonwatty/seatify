import { useCallback, useState } from 'react';
import type { ImportWizardState, ImportWizardAction } from '../types';
import { parseFile, formatFileSize } from '../utils/fileParser';
import {
  autoDetectMappings,
  detectEventType,
  detectSourcePlatform,
  PLATFORM_DISPLAY_NAMES,
} from '../utils/columnDetector';

interface FileUploadStepProps {
  state: ImportWizardState;
  dispatch: React.Dispatch<ImportWizardAction>;
}

export function FileUploadStep({ state, dispatch }: FileUploadStepProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = useCallback(
    async (file: File) => {
      const result = await parseFile(file);

      if (!result.success) {
        dispatch({ type: 'SET_FILE_ERROR', payload: result.error });
        return;
      }

      dispatch({ type: 'SET_FILE', payload: { file, parsedFile: result.data } });

      // Detect source platform (e.g., Zola, RSVPify, The Knot, Joy)
      const platformInfo = detectSourcePlatform(result.data.headers);
      dispatch({ type: 'SET_DETECTED_PLATFORM', payload: platformInfo });

      // Detect event type from headers
      const eventType = detectEventType(result.data.headers);
      dispatch({ type: 'SET_DETECTED_EVENT_TYPE', payload: eventType });

      // Auto-detect column mappings using platform-specific patterns
      const mappings = autoDetectMappings(
        result.data.headers,
        result.data.rows,
        eventType,
        platformInfo.platform
      );
      dispatch({ type: 'SET_COLUMN_MAPPINGS', payload: mappings });
    },
    [dispatch]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const file = e.dataTransfer.files[0];
      if (file) {
        handleFile(file);
      }
    },
    [handleFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFile(file);
      }
    },
    [handleFile]
  );

  const handleClear = useCallback(() => {
    dispatch({ type: 'CLEAR_FILE' });
  }, [dispatch]);

  return (
    <div className="file-upload-step">
      <div className="step-description">
        <p>Upload a CSV or Excel file containing your guest list.</p>
        <p className="hint">Supported formats: .csv, .xlsx, .xls (max 5MB, 10,000 rows)</p>
        <p className="hint platforms-hint">
          Works with exports from <strong>Zola</strong>, <strong>RSVPify</strong>, and CSV/Excel.{' '}
          <span className="coming-soon-platforms">Joy, The Knot, Eventbrite coming soon.</span>
        </p>
      </div>

      {!state.parsedFile ? (
        <div
          className={`drop-zone ${isDragging ? 'dragging' : ''} ${state.fileError ? 'error' : ''}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <div className="drop-zone-content">
            <div className="drop-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </div>
            <p className="drop-text">Drag and drop your file here</p>
            <p className="drop-or">or</p>
            <label className="file-input-label">
              <span className="btn-secondary">Browse Files</span>
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleInputChange}
                className="file-input"
              />
            </label>
          </div>
        </div>
      ) : (
        <div className="file-info">
          <div className="file-icon">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
          </div>
          <div className="file-details">
            <p className="file-name">{state.parsedFile.fileName}</p>
            <p className="file-meta">
              {formatFileSize(state.parsedFile.fileSize)} • {state.parsedFile.rowCount} rows •{' '}
              {state.parsedFile.headers.length} columns
            </p>
            {state.detectedEventType && (
              <p className="event-type-hint">
                Detected event type: <strong>{state.detectedEventType}</strong>
              </p>
            )}
            {state.detectedPlatform && state.detectedPlatform.platform !== 'generic' && (
              <p className="platform-hint">
                Source detected:{' '}
                <strong>{PLATFORM_DISPLAY_NAMES[state.detectedPlatform.platform]}</strong>
                {state.detectedPlatform.confidence !== 'high' && (
                  <span className="confidence-indicator" title={`${state.detectedPlatform.confidence} confidence`}>
                    {' '}({state.detectedPlatform.confidence})
                  </span>
                )}
              </p>
            )}
            {state.detectedPlatform?.note && (
              <p className="platform-note">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="16" x2="12" y2="12" />
                  <line x1="12" y1="8" x2="12.01" y2="8" />
                </svg>
                {state.detectedPlatform.note}
              </p>
            )}
          </div>
          <button className="btn-icon clear-file" onClick={handleClear} aria-label="Remove file">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      )}

      {state.fileError && (
        <div className="error-message">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {state.fileError}
        </div>
      )}
    </div>
  );
}
