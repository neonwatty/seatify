import { useStore } from '../store/useStore';
import './LayoutToolbar.css';

export function LayoutToolbar() {
  const {
    canvas,
    pushHistory,
    alignTables,
    distributeTables,
    autoArrangeTables,
  } = useStore();

  const selectedTableCount = canvas.selectedTableIds.length;

  // Only show when 2+ tables are selected
  if (selectedTableCount < 2) return null;

  const handleAlign = (alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => {
    pushHistory(`Align tables ${alignment}`);
    alignTables(canvas.selectedTableIds, alignment);
  };

  const handleDistribute = (direction: 'horizontal' | 'vertical') => {
    pushHistory(`Distribute tables ${direction}`);
    distributeTables(canvas.selectedTableIds, direction);
  };

  const handleAutoArrange = () => {
    pushHistory('Auto-arrange tables');
    autoArrangeTables(canvas.selectedTableIds);
  };

  return (
    <div className="layout-toolbar">
      <div className="layout-toolbar-section">
        <span className="section-label">Align</span>
        <div className="layout-buttons">
          <button
            onClick={() => handleAlign('left')}
            title="Align Left"
            className="layout-btn"
          >
            <svg viewBox="0 0 24 24" width="16" height="16">
              <path fill="currentColor" d="M4 22H2V2h2v20zM22 7H6v3h16V7zm-6 7H6v3h10v-3z"/>
            </svg>
          </button>
          <button
            onClick={() => handleAlign('center')}
            title="Align Center (Horizontal)"
            className="layout-btn"
          >
            <svg viewBox="0 0 24 24" width="16" height="16">
              <path fill="currentColor" d="M8 19h3v4h2v-4h3l-4-4-4 4zm8-14h-3V1h-2v4H8l4 4 4-4zM4 11v2h16v-2H4z"/>
            </svg>
          </button>
          <button
            onClick={() => handleAlign('right')}
            title="Align Right"
            className="layout-btn"
          >
            <svg viewBox="0 0 24 24" width="16" height="16">
              <path fill="currentColor" d="M20 2h2v20h-2V2zM2 10h16V7H2v3zm6 7h10v-3H8v3z"/>
            </svg>
          </button>
          <span className="separator" />
          <button
            onClick={() => handleAlign('top')}
            title="Align Top"
            className="layout-btn"
          >
            <svg viewBox="0 0 24 24" width="16" height="16">
              <path fill="currentColor" d="M22 2v2H2V2h20zM7 22h3V6H7v16zm7 0h3V6h-3v16z"/>
            </svg>
          </button>
          <button
            onClick={() => handleAlign('middle')}
            title="Align Middle (Vertical)"
            className="layout-btn"
          >
            <svg viewBox="0 0 24 24" width="16" height="16">
              <path fill="currentColor" d="M19 8l-4 4h3v4h-3l4 4 4-4h-3v-4h3l-4-4zM1 8l4 4H2v4h3l-4 4-4-4h3v-4H-3L1 8zm10 3v2h2v-2h-2z"/>
            </svg>
          </button>
          <button
            onClick={() => handleAlign('bottom')}
            title="Align Bottom"
            className="layout-btn"
          >
            <svg viewBox="0 0 24 24" width="16" height="16">
              <path fill="currentColor" d="M22 22v-2H2v2h20zM7 2h3v16H7V2zm7 0h3v16h-3V2z"/>
            </svg>
          </button>
        </div>
      </div>

      <div className="layout-toolbar-section">
        <span className="section-label">Distribute</span>
        <div className="layout-buttons">
          <button
            onClick={() => handleDistribute('horizontal')}
            title="Distribute Horizontally"
            className="layout-btn"
            disabled={selectedTableCount < 3}
          >
            <svg viewBox="0 0 24 24" width="16" height="16">
              <path fill="currentColor" d="M4 5v14h2V5H4zm14 0v14h2V5h-2zM9 5h2v14H9V5zm4 0h2v14h-2V5z"/>
            </svg>
          </button>
          <button
            onClick={() => handleDistribute('vertical')}
            title="Distribute Vertically"
            className="layout-btn"
            disabled={selectedTableCount < 3}
          >
            <svg viewBox="0 0 24 24" width="16" height="16">
              <path fill="currentColor" d="M5 4h14v2H5V4zm0 14h14v2H5v-2zM5 9h14v2H5V9zm0 4h14v2H5v-2z"/>
            </svg>
          </button>
        </div>
      </div>

      <div className="layout-toolbar-section">
        <span className="section-label">Arrange</span>
        <div className="layout-buttons">
          <button
            onClick={handleAutoArrange}
            title="Auto-Arrange in Grid"
            className="layout-btn auto-arrange"
          >
            <svg viewBox="0 0 24 24" width="16" height="16">
              <path fill="currentColor" d="M3 3h8v8H3V3zm0 10h8v8H3v-8zm10-10h8v8h-8V3zm0 10h8v8h-8v-8z"/>
            </svg>
            <span>Grid</span>
          </button>
        </div>
      </div>
    </div>
  );
}
