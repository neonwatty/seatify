import { useMemo, useEffect, useCallback } from 'react';
import type { TableShape } from '../../../types';
import type {
  ImportWizardState,
  ImportWizardAction,
  DistributionStrategy,
} from '../types';
import {
  TABLE_SHAPE_DEFAULTS,
  TABLE_SHAPE_LABELS,
  DISTRIBUTION_STRATEGY_INFO,
} from '../types';
import { computeTableAssignmentPreview } from '../utils/tableAssignment';

interface TableAssignmentStepProps {
  state: ImportWizardState;
  dispatch: React.Dispatch<ImportWizardAction>;
}

export function TableAssignmentStep({ state, dispatch }: TableAssignmentStepProps) {
  // Get included guests (not excluded in preview step)
  const includedGuests = useMemo(() => {
    return state.parsedGuests.filter((_, i) => !state.excludedRowIndices.has(i));
  }, [state.parsedGuests, state.excludedRowIndices]);

  const guestCount = includedGuests.length;

  // Detect unique groups
  const detectedGroups = useMemo(() => {
    const groups = new Set<string>();
    includedGuests.forEach((g) => {
      if (g.group) groups.add(g.group);
    });
    return Array.from(groups);
  }, [includedGuests]);

  // Calculate recommended table count based on capacity
  const recommendedTableCount = useMemo(() => {
    if (guestCount === 0 || state.tableAssignment.tableCapacity === 0) return 1;
    return Math.ceil(guestCount / state.tableAssignment.tableCapacity);
  }, [guestCount, state.tableAssignment.tableCapacity]);

  // Auto-update table count when enabled and count is 0
  useEffect(() => {
    if (state.tableAssignment.enabled && state.tableAssignment.tableCount === 0) {
      dispatch({ type: 'SET_TABLE_COUNT', payload: recommendedTableCount });
    }
  }, [
    state.tableAssignment.enabled,
    state.tableAssignment.tableCount,
    recommendedTableCount,
    dispatch,
  ]);

  // Compute preview whenever settings change
  useEffect(() => {
    if (
      !state.tableAssignment.enabled ||
      state.tableAssignment.distributionStrategy === 'skip'
    ) {
      dispatch({ type: 'SET_TABLE_ASSIGNMENT_PREVIEW', payload: new Map() });
      return;
    }

    const preview = computeTableAssignmentPreview(
      includedGuests,
      state.tableAssignment.tableCount,
      state.tableAssignment.tableCapacity,
      state.tableAssignment.distributionStrategy
    );
    dispatch({ type: 'SET_TABLE_ASSIGNMENT_PREVIEW', payload: preview });
  }, [
    includedGuests,
    state.tableAssignment.enabled,
    state.tableAssignment.tableCount,
    state.tableAssignment.tableCapacity,
    state.tableAssignment.distributionStrategy,
    dispatch,
  ]);

  const handleToggleEnabled = useCallback(
    (enabled: boolean) => {
      dispatch({ type: 'SET_TABLE_ASSIGNMENT_ENABLED', payload: enabled });
      if (enabled && state.tableAssignment.tableCount === 0) {
        dispatch({ type: 'SET_TABLE_COUNT', payload: recommendedTableCount });
      }
    },
    [dispatch, state.tableAssignment.tableCount, recommendedTableCount]
  );

  const handleShapeChange = useCallback(
    (shape: TableShape) => {
      dispatch({ type: 'SET_TABLE_SHAPE', payload: shape });
      // Recalculate table count based on new capacity
      const newCapacity = TABLE_SHAPE_DEFAULTS[shape].capacity;
      if (newCapacity > 0 && guestCount > 0) {
        const newCount = Math.ceil(guestCount / newCapacity);
        dispatch({ type: 'SET_TABLE_COUNT', payload: newCount });
      }
    },
    [dispatch, guestCount]
  );

  const handleCapacityChange = useCallback(
    (capacity: number) => {
      dispatch({ type: 'SET_TABLE_CAPACITY', payload: capacity });
      if (capacity > 0 && guestCount > 0) {
        const newCount = Math.ceil(guestCount / capacity);
        dispatch({ type: 'SET_TABLE_COUNT', payload: newCount });
      }
    },
    [dispatch, guestCount]
  );

  const tableShapes = Object.keys(TABLE_SHAPE_LABELS) as TableShape[];
  const strategies = Object.keys(DISTRIBUTION_STRATEGY_INFO) as DistributionStrategy[];

  return (
    <div className="table-assignment-step">
      <div className="step-description">
        <p>Optionally create tables and assign imported guests to them.</p>
      </div>

      {/* Summary Stats */}
      <div className="assignment-stats">
        <div className="stat">
          <span className="stat-value">{guestCount}</span>
          <span className="stat-label">guests to import</span>
        </div>
        {detectedGroups.length > 0 && (
          <div className="stat">
            <span className="stat-value">{detectedGroups.length}</span>
            <span className="stat-label">groups detected</span>
          </div>
        )}
      </div>

      {/* Skip/Enable Toggle */}
      <div className="assignment-toggle">
        <label className="toggle-option">
          <input
            type="radio"
            name="assignment-mode"
            checked={!state.tableAssignment.enabled}
            onChange={() => handleToggleEnabled(false)}
          />
          <div className="toggle-content">
            <span className="toggle-label">Skip table assignment</span>
            <span className="toggle-desc">Import guests without creating tables</span>
          </div>
        </label>
        <label className="toggle-option">
          <input
            type="radio"
            name="assignment-mode"
            checked={state.tableAssignment.enabled}
            onChange={() => handleToggleEnabled(true)}
          />
          <div className="toggle-content">
            <span className="toggle-label">Create tables and assign guests</span>
            <span className="toggle-desc">Configure tables and distribution below</span>
          </div>
        </label>
      </div>

      {state.tableAssignment.enabled && (
        <>
          {/* Table Configuration */}
          <div className="config-section">
            <h4>Table Configuration</h4>
            <div className="config-grid">
              <div className="config-field">
                <label htmlFor="table-shape">Table Shape</label>
                <select
                  id="table-shape"
                  value={state.tableAssignment.tableShape}
                  onChange={(e) => handleShapeChange(e.target.value as TableShape)}
                >
                  {tableShapes.map((shape) => (
                    <option key={shape} value={shape}>
                      {TABLE_SHAPE_LABELS[shape]} ({TABLE_SHAPE_DEFAULTS[shape].capacity}{' '}
                      seats)
                    </option>
                  ))}
                </select>
              </div>

              <div className="config-field">
                <label htmlFor="table-capacity">Seats per Table</label>
                <input
                  id="table-capacity"
                  type="number"
                  min="1"
                  max="20"
                  value={state.tableAssignment.tableCapacity}
                  onChange={(e) => handleCapacityChange(Number(e.target.value))}
                />
              </div>

              <div className="config-field">
                <label htmlFor="table-count">Number of Tables</label>
                <div className="input-with-hint">
                  <input
                    id="table-count"
                    type="number"
                    min="1"
                    max="100"
                    value={state.tableAssignment.tableCount}
                    onChange={(e) =>
                      dispatch({
                        type: 'SET_TABLE_COUNT',
                        payload: Number(e.target.value),
                      })
                    }
                  />
                  <span className="field-hint">Recommended: {recommendedTableCount}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Distribution Strategy */}
          <div className="config-section">
            <h4>Distribution Strategy</h4>
            <div className="strategy-options">
              {strategies.map((strategy) => (
                <label
                  key={strategy}
                  className={`strategy-option ${
                    state.tableAssignment.distributionStrategy === strategy
                      ? 'selected'
                      : ''
                  }`}
                >
                  <input
                    type="radio"
                    name="distribution-strategy"
                    value={strategy}
                    checked={state.tableAssignment.distributionStrategy === strategy}
                    onChange={() =>
                      dispatch({
                        type: 'SET_DISTRIBUTION_STRATEGY',
                        payload: strategy,
                      })
                    }
                  />
                  <div className="strategy-content">
                    <span className="strategy-label">
                      {DISTRIBUTION_STRATEGY_INFO[strategy].label}
                    </span>
                    <span className="strategy-desc">
                      {DISTRIBUTION_STRATEGY_INFO[strategy].description}
                    </span>
                  </div>
                </label>
              ))}
            </div>

            {/* Warning for groups strategy when no groups detected */}
            {state.tableAssignment.distributionStrategy === 'groups' &&
              detectedGroups.length === 0 && (
                <div className="warning-message">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                  No group data found. Make sure you mapped a "Group" column, or use a
                  different strategy.
                </div>
              )}
          </div>

          {/* Assignment Preview */}
          {state.tableAssignment.distributionStrategy !== 'skip' &&
            state.tableAssignmentPreview.size > 0 && (
              <div className="config-section">
                <h4>Assignment Preview</h4>
                <div className="assignment-preview">
                  {Array.from(state.tableAssignmentPreview.entries()).map(
                    ([tableIndex, guestNames]) => (
                      <div key={tableIndex} className="preview-table">
                        <div className="preview-table-header">
                          <span className="preview-table-name">
                            Table {tableIndex + 1}
                          </span>
                          <span className="preview-table-count">
                            {guestNames.length}/{state.tableAssignment.tableCapacity}
                          </span>
                        </div>
                        <div className="preview-guests">
                          {guestNames.slice(0, 5).map((name, i) => (
                            <span key={i} className="preview-guest">
                              {name}
                            </span>
                          ))}
                          {guestNames.length > 5 && (
                            <span className="preview-more">
                              +{guestNames.length - 5} more
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>
            )}
        </>
      )}
    </div>
  );
}
