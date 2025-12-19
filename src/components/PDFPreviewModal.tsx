import { useEffect, useRef, useState } from 'react';
import './PDFPreviewModal.css';

export type FontFamily = 'helvetica' | 'times' | 'courier';
export type ColorTheme = 'classic' | 'elegant' | 'modern' | 'nature' | 'romantic';
export type CardSize = 'compact' | 'standard' | 'large';

// Theme labels and accent colors for UI display
const THEME_OPTIONS: { value: ColorTheme; label: string; color: string }[] = [
  { value: 'classic', label: 'Classic', color: '#F97066' },
  { value: 'elegant', label: 'Elegant', color: '#B8860B' },
  { value: 'modern', label: 'Modern', color: '#3B82F6' },
  { value: 'nature', label: 'Nature', color: '#059669' },
  { value: 'romantic', label: 'Romantic', color: '#EC4899' },
];

// Card size options
const SIZE_OPTIONS: { value: CardSize; label: string; description: string }[] = [
  { value: 'compact', label: 'Compact', description: 'More cards per page' },
  { value: 'standard', label: 'Standard', description: 'Balanced size' },
  { value: 'large', label: 'Large', description: 'High visibility' },
];

export interface PlaceCardOptions {
  includeTableName: boolean;
  includeDietary: boolean;
  fontSize: 'small' | 'medium' | 'large';
  fontFamily: FontFamily;
  colorTheme: ColorTheme;
  cardSize: CardSize;
}

export interface TableCardOptions {
  fontSize: 'small' | 'medium' | 'large';
  fontFamily: FontFamily;
  showGuestCount: boolean;
  showEventName: boolean;
  colorTheme: ColorTheme;
  cardSize: CardSize;
}

interface PDFPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  pdfUrl: string | null;
  title: string;
  onDownload: (placeOptions?: PlaceCardOptions, tableOptions?: TableCardOptions) => void;
  isGenerating?: boolean;
  type: 'table' | 'place';
  onOptionsChange?: (placeOptions?: PlaceCardOptions, tableOptions?: TableCardOptions) => void;
}

const defaultPlaceOptions: PlaceCardOptions = {
  includeTableName: true,
  includeDietary: true,
  fontSize: 'medium',
  fontFamily: 'helvetica',
  colorTheme: 'classic',
  cardSize: 'standard',
};

const defaultTableOptions: TableCardOptions = {
  fontSize: 'medium',
  fontFamily: 'helvetica',
  showGuestCount: true,
  showEventName: true,
  colorTheme: 'classic',
  cardSize: 'standard',
};

export function PDFPreviewModal({
  isOpen,
  onClose,
  pdfUrl,
  title,
  onDownload,
  isGenerating = false,
  type,
  onOptionsChange,
}: PDFPreviewModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const [placeOptions, setPlaceOptions] = useState<PlaceCardOptions>(defaultPlaceOptions);
  const [tableOptions, setTableOptions] = useState<TableCardOptions>(defaultTableOptions);
  const [showOptions, setShowOptions] = useState(true); // Open by default so users see options

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

  // Clean up blob URL when modal closes
  useEffect(() => {
    return () => {
      if (pdfUrl && pdfUrl.startsWith('blob:')) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [pdfUrl]);

  // Reset options when modal opens - intentional state reset on modal open
  useEffect(() => {
    if (isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state reset on modal open
      setPlaceOptions(defaultPlaceOptions);
      setTableOptions(defaultTableOptions);
      setShowOptions(true); // Keep options visible by default
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handlePlaceOptionChange = <K extends keyof PlaceCardOptions>(
    key: K,
    value: PlaceCardOptions[K]
  ) => {
    const newOptions = { ...placeOptions, [key]: value };
    setPlaceOptions(newOptions);
    onOptionsChange?.(newOptions, undefined);
  };

  const handleTableOptionChange = <K extends keyof TableCardOptions>(
    key: K,
    value: TableCardOptions[K]
  ) => {
    const newOptions = { ...tableOptions, [key]: value };
    setTableOptions(newOptions);
    onOptionsChange?.(undefined, newOptions);
  };

  const handleDownload = () => {
    onDownload(type === 'place' ? placeOptions : undefined, type === 'table' ? tableOptions : undefined);
  };

  return (
    <div className="pdf-preview-overlay" onClick={handleOverlayClick}>
      <div className="pdf-preview-modal" ref={modalRef}>
        <div className="pdf-preview-header">
          <h2>{title}</h2>
          <div className="pdf-preview-actions">
            <button
              className={`pdf-preview-btn options ${showOptions ? 'active' : ''}`}
              onClick={() => setShowOptions(!showOptions)}
              title="Customize options"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </button>
            <button
              className="pdf-preview-btn download"
              onClick={handleDownload}
              disabled={isGenerating || !pdfUrl}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Download PDF
            </button>
            <button className="pdf-preview-btn close" onClick={onClose}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {/* Options Panel */}
        {showOptions && (
          <div className="pdf-options-panel">
            {/* Place card specific options */}
            {type === 'place' && (
              <div className="pdf-option-group">
                <label className="pdf-option-label">
                  <input
                    type="checkbox"
                    checked={placeOptions.includeTableName}
                    onChange={(e) => handlePlaceOptionChange('includeTableName', e.target.checked)}
                  />
                  <span>Show table name</span>
                </label>
                <label className="pdf-option-label">
                  <input
                    type="checkbox"
                    checked={placeOptions.includeDietary}
                    onChange={(e) => handlePlaceOptionChange('includeDietary', e.target.checked)}
                  />
                  <span>Show dietary icons</span>
                </label>
              </div>
            )}
            {/* Table card specific options */}
            {type === 'table' && (
              <div className="pdf-option-group">
                <label className="pdf-option-label">
                  <input
                    type="checkbox"
                    checked={tableOptions.showGuestCount}
                    onChange={(e) => handleTableOptionChange('showGuestCount', e.target.checked)}
                  />
                  <span>Show guest count</span>
                </label>
                <label className="pdf-option-label">
                  <input
                    type="checkbox"
                    checked={tableOptions.showEventName}
                    onChange={(e) => handleTableOptionChange('showEventName', e.target.checked)}
                  />
                  <span>Show event name</span>
                </label>
              </div>
            )}
            {/* Font size - shared between both types */}
            <div className="pdf-option-group">
              <span className="pdf-option-title">Font Size</span>
              <div className="pdf-font-size-options">
                {(['small', 'medium', 'large'] as const).map((size) => (
                  <label key={size} className="pdf-font-option">
                    <input
                      type="radio"
                      name="fontSize"
                      value={size}
                      checked={type === 'place' ? placeOptions.fontSize === size : tableOptions.fontSize === size}
                      onChange={() => type === 'place'
                        ? handlePlaceOptionChange('fontSize', size)
                        : handleTableOptionChange('fontSize', size)
                      }
                    />
                    <span className={`pdf-font-label pdf-font-${size}`}>
                      {size.charAt(0).toUpperCase() + size.slice(1)}
                    </span>
                  </label>
                ))}
              </div>
            </div>
            {/* Font family - shared between both types */}
            <div className="pdf-option-group">
              <span className="pdf-option-title">Font Style</span>
              <div className="pdf-font-size-options">
                {([
                  { value: 'helvetica', label: 'Sans-serif' },
                  { value: 'times', label: 'Serif' },
                  { value: 'courier', label: 'Monospace' },
                ] as const).map((font) => (
                  <label key={font.value} className="pdf-font-option">
                    <input
                      type="radio"
                      name="fontFamily"
                      value={font.value}
                      checked={type === 'place' ? placeOptions.fontFamily === font.value : tableOptions.fontFamily === font.value}
                      onChange={() => type === 'place'
                        ? handlePlaceOptionChange('fontFamily', font.value)
                        : handleTableOptionChange('fontFamily', font.value)
                      }
                    />
                    <span className={`pdf-font-label pdf-font-family-${font.value}`}>
                      {font.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>
            {/* Color theme - shared between both types */}
            <div className="pdf-option-group">
              <span className="pdf-option-title">Color Theme</span>
              <div className="pdf-theme-options">
                {THEME_OPTIONS.map((theme) => (
                  <label key={theme.value} className="pdf-theme-option">
                    <input
                      type="radio"
                      name="colorTheme"
                      value={theme.value}
                      checked={type === 'place' ? placeOptions.colorTheme === theme.value : tableOptions.colorTheme === theme.value}
                      onChange={() => type === 'place'
                        ? handlePlaceOptionChange('colorTheme', theme.value)
                        : handleTableOptionChange('colorTheme', theme.value)
                      }
                    />
                    <span className="pdf-theme-swatch" style={{ backgroundColor: theme.color }} />
                    <span className="pdf-theme-label">{theme.label}</span>
                  </label>
                ))}
              </div>
            </div>
            {/* Card size - shared between both types */}
            <div className="pdf-option-group">
              <span className="pdf-option-title">Card Size</span>
              <div className="pdf-size-options">
                {SIZE_OPTIONS.map((size) => (
                  <label key={size.value} className="pdf-size-option" title={size.description}>
                    <input
                      type="radio"
                      name="cardSize"
                      value={size.value}
                      checked={type === 'place' ? placeOptions.cardSize === size.value : tableOptions.cardSize === size.value}
                      onChange={() => type === 'place'
                        ? handlePlaceOptionChange('cardSize', size.value)
                        : handleTableOptionChange('cardSize', size.value)
                      }
                    />
                    <span className="pdf-size-label">{size.label}</span>
                  </label>
                ))}
              </div>
            </div>
            <p className="pdf-options-note">
              Changes will apply when you download
            </p>
          </div>
        )}

        <div className="pdf-preview-content">
          {isGenerating ? (
            <div className="pdf-preview-loading">
              <div className="pdf-preview-spinner" />
              <p>Generating preview...</p>
            </div>
          ) : pdfUrl ? (
            <iframe
              src={pdfUrl}
              className="pdf-preview-iframe"
              title="PDF Preview"
            />
          ) : (
            <div className="pdf-preview-empty">
              <p>Unable to generate preview</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
