import { useState, useMemo } from 'react';
import type { ImportWizardState, ImportWizardAction } from '../types';
import { getFullName } from '../../../types';

interface DataPreviewStepProps {
  state: ImportWizardState;
  dispatch: React.Dispatch<ImportWizardAction>;
}

const ROWS_PER_PAGE = 20;

export function DataPreviewStep({ state, dispatch }: DataPreviewStepProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const [showOnlyErrors, setShowOnlyErrors] = useState(false);

  // Get errors by row index
  const errorsByRow = useMemo(() => {
    const map = new Map<number, typeof state.validationErrors>();
    state.validationErrors.forEach((error) => {
      const existing = map.get(error.rowIndex) || [];
      map.set(error.rowIndex, [...existing, error]);
    });
    return map;
  }, [state.validationErrors]);

  // Filter and paginate rows
  const filteredGuests = useMemo(() => {
    if (showOnlyErrors) {
      return state.parsedGuests
        .map((guest, index) => ({ guest, index }))
        .filter(({ index }) => errorsByRow.has(index));
    }
    return state.parsedGuests.map((guest, index) => ({ guest, index }));
  }, [state.parsedGuests, showOnlyErrors, errorsByRow]);

  const totalPages = Math.ceil(filteredGuests.length / ROWS_PER_PAGE);
  const paginatedGuests = filteredGuests.slice(
    currentPage * ROWS_PER_PAGE,
    (currentPage + 1) * ROWS_PER_PAGE
  );

  const handleToggleExclude = (index: number) => {
    dispatch({ type: 'TOGGLE_EXCLUDE_ROW', payload: index });
  };

  const errorCount = state.validationErrors.filter((e) => e.severity === 'error').length;
  const warningCount = state.validationErrors.filter((e) => e.severity === 'warning').length;
  const includedCount = state.parsedGuests.length - state.excludedRowIndices.size;

  return (
    <div className="data-preview-step">
      <div className="step-description">
        <p>Review your data before importing. Uncheck rows you want to exclude.</p>
      </div>

      <div className="preview-stats">
        <div className="stat">
          <span className="stat-value">{includedCount}</span>
          <span className="stat-label">guests to import</span>
        </div>
        {errorCount > 0 && (
          <div className="stat error">
            <span className="stat-value">{errorCount}</span>
            <span className="stat-label">errors</span>
          </div>
        )}
        {warningCount > 0 && (
          <div className="stat warning">
            <span className="stat-value">{warningCount}</span>
            <span className="stat-label">warnings</span>
          </div>
        )}
        {state.excludedRowIndices.size > 0 && (
          <div className="stat excluded">
            <span className="stat-value">{state.excludedRowIndices.size}</span>
            <span className="stat-label">excluded</span>
          </div>
        )}
      </div>

      {(errorCount > 0 || warningCount > 0) && (
        <div className="filter-bar">
          <label className="filter-checkbox">
            <input
              type="checkbox"
              checked={showOnlyErrors}
              onChange={(e) => {
                setShowOnlyErrors(e.target.checked);
                setCurrentPage(0);
              }}
            />
            Show only rows with issues
          </label>
        </div>
      )}

      <div className="preview-table-container">
        <table className="preview-table">
          <thead>
            <tr>
              <th className="col-include">Include</th>
              <th className="col-row">#</th>
              <th className="col-name">Name</th>
              <th className="col-email">Email</th>
              <th className="col-group">Group</th>
              <th className="col-status">Issues</th>
            </tr>
          </thead>
          <tbody>
            {paginatedGuests.map(({ guest, index }) => {
              const rowErrors = errorsByRow.get(index) || [];
              const isExcluded = state.excludedRowIndices.has(index);
              const hasErrors = rowErrors.some((e) => e.severity === 'error');
              const hasWarnings = rowErrors.some((e) => e.severity === 'warning');

              return (
                <tr
                  key={index}
                  className={`
                    ${isExcluded ? 'excluded' : ''}
                    ${hasErrors ? 'has-error' : ''}
                    ${hasWarnings && !hasErrors ? 'has-warning' : ''}
                  `}
                >
                  <td className="col-include">
                    <input
                      type="checkbox"
                      checked={!isExcluded}
                      onChange={() => handleToggleExclude(index)}
                      aria-label={`Include row ${index + 1}`}
                    />
                  </td>
                  <td className="col-row">{index + 1}</td>
                  <td className="col-name">
                    {guest.firstName || guest.lastName ? (
                      getFullName({ firstName: guest.firstName || '', lastName: guest.lastName || '' })
                    ) : (
                      <em className="empty">No name</em>
                    )}
                  </td>
                  <td className="col-email">
                    {guest.email || <em className="empty">—</em>}
                  </td>
                  <td className="col-group">
                    {guest.group || <em className="empty">—</em>}
                  </td>
                  <td className="col-status">
                    {rowErrors.length > 0 ? (
                      <div className="issues">
                        {rowErrors.map((error, i) => (
                          <span
                            key={i}
                            className={`issue-badge ${error.severity}`}
                            title={error.message}
                          >
                            {error.message}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="ok-badge">OK</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="pagination">
          <button
            className="btn-icon"
            onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
            disabled={currentPage === 0}
            aria-label="Previous page"
          >
            ←
          </button>
          <span className="page-info">
            Page {currentPage + 1} of {totalPages}
          </span>
          <button
            className="btn-icon"
            onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={currentPage === totalPages - 1}
            aria-label="Next page"
          >
            →
          </button>
        </div>
      )}
    </div>
  );
}
