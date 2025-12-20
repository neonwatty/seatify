import { useEffect } from 'react';
import { ToastContainer } from './components/Toast';
import { showToast } from './components/toastStore';
import { AppRouter } from './router';
import { useStore } from './store/useStore';
import './App.css';

function App() {
  const {
    undo,
    redo,
    canUndo,
    canRedo,
    canvas,
    batchRemoveTables,
    batchRemoveGuests,
    nudgeSelectedTables,
    pushHistory,
    recenterCanvas,
    setZoom,
    selectAllTables,
    duplicateTable,
    toggleGrid,
    toggleSidebar,
    event,
  } = useStore();

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      // Undo (Cmd/Ctrl+Z)
      if (e.key === 'z' && (e.metaKey || e.ctrlKey) && !e.shiftKey) {
        e.preventDefault();
        if (canUndo()) {
          undo();
          showToast('Undo', 'info', { label: 'Redo', onClick: redo });
        }
        return;
      }

      // Redo (Cmd/Ctrl+Shift+Z or Cmd/Ctrl+Y)
      if ((e.key === 'z' && (e.metaKey || e.ctrlKey) && e.shiftKey) ||
          (e.key === 'y' && (e.metaKey || e.ctrlKey))) {
        e.preventDefault();
        if (canRedo()) {
          redo();
          showToast('Redo', 'info', { label: 'Undo', onClick: undo });
        }
        return;
      }

      // Delete/Backspace to remove selected items
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const hasSelectedTables = canvas.selectedTableIds.length > 0;
        const hasSelectedGuests = canvas.selectedGuestIds.length > 0;

        if (hasSelectedTables || hasSelectedGuests) {
          e.preventDefault();
          const itemCount = canvas.selectedTableIds.length + canvas.selectedGuestIds.length;
          const confirmMessage = itemCount === 1
            ? 'Delete selected item?'
            : `Delete ${itemCount} selected items?`;

          if (confirm(confirmMessage)) {
            pushHistory('Delete selected items');
            if (hasSelectedTables) {
              batchRemoveTables(canvas.selectedTableIds);
            }
            if (hasSelectedGuests) {
              batchRemoveGuests(canvas.selectedGuestIds);
            }
            showToast(`Deleted ${itemCount} item${itemCount > 1 ? 's' : ''}`, 'success');
          }
        }
        return;
      }

      // Arrow keys to nudge selected tables
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        if (canvas.selectedTableIds.length > 0) {
          e.preventDefault();
          const amount = e.shiftKey ? 1 : 10; // Fine nudge with Shift
          let dx = 0, dy = 0;

          switch (e.key) {
            case 'ArrowUp': dy = -amount; break;
            case 'ArrowDown': dy = amount; break;
            case 'ArrowLeft': dx = -amount; break;
            case 'ArrowRight': dx = amount; break;
          }

          nudgeSelectedTables(dx, dy);
        }
        return;
      }

      // Re-center canvas (0 or c)
      if (e.key === '0' || e.key === 'c') {
        e.preventDefault();
        recenterCanvas(window.innerWidth - 300, window.innerHeight - 150); // Approximate canvas size
        return;
      }

      // Zoom in (+/=)
      if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        setZoom(Math.min(2, canvas.zoom + 0.1));
        return;
      }

      // Zoom out (-)
      if (e.key === '-') {
        e.preventDefault();
        setZoom(Math.max(0.25, canvas.zoom - 0.1));
        return;
      }

      // Select all tables (Cmd/Ctrl+A)
      if (e.key === 'a' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        selectAllTables();
        const tableCount = event.tables.length;
        if (tableCount > 0) {
          showToast(`Selected ${tableCount} table${tableCount > 1 ? 's' : ''}`, 'info');
        }
        return;
      }

      // Duplicate selected table (Cmd/Ctrl+D)
      if (e.key === 'd' && (e.metaKey || e.ctrlKey)) {
        if (canvas.selectedTableIds.length === 1) {
          e.preventDefault();
          pushHistory('Duplicate table');
          duplicateTable(canvas.selectedTableIds[0]);
          showToast('Table duplicated', 'success');
        }
        return;
      }

      // Toggle grid (G)
      if (e.key === 'g') {
        e.preventDefault();
        toggleGrid();
        return;
      }

      // Toggle sidebar (S)
      if (e.key === 's' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        toggleSidebar();
        return;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, canUndo, canRedo, canvas.selectedTableIds, canvas.selectedGuestIds, canvas.zoom, batchRemoveTables, batchRemoveGuests, nudgeSelectedTables, pushHistory, recenterCanvas, setZoom, selectAllTables, duplicateTable, toggleGrid, toggleSidebar, event.tables.length]);

  return (
    <>
      <AppRouter />
      <ToastContainer />
    </>
  );
}

export default App;
