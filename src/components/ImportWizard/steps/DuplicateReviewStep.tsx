import type { ImportWizardState, ImportWizardAction, DuplicateResolution } from '../types';
import { getFullName } from '../../../types';

interface DuplicateReviewStepProps {
  state: ImportWizardState;
  dispatch: React.Dispatch<ImportWizardAction>;
}

export function DuplicateReviewStep({ state, dispatch }: DuplicateReviewStepProps) {
  const handleResolutionChange = (index: number, resolution: DuplicateResolution) => {
    dispatch({ type: 'SET_DUPLICATE_RESOLUTION', payload: { index, resolution } });
  };

  const handleApplyToAll = (resolution: DuplicateResolution) => {
    dispatch({ type: 'SET_ALL_DUPLICATE_RESOLUTIONS', payload: resolution });
  };

  if (state.duplicates.length === 0) {
    return (
      <div className="duplicate-review-step">
        <div className="no-duplicates">
          <div className="success-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <h3>No Duplicates Found</h3>
          <p>All guests in your import file appear to be new.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="duplicate-review-step">
      <div className="step-description">
        <p>
          We found <strong>{state.duplicates.length}</strong> potential duplicate
          {state.duplicates.length === 1 ? '' : 's'}. Choose how to handle each one.
        </p>
      </div>

      <div className="bulk-actions">
        <span>Apply to all:</span>
        <button
          className="btn-small"
          onClick={() => handleApplyToAll('import')}
        >
          Import All as New
        </button>
        <button
          className="btn-small"
          onClick={() => handleApplyToAll('merge')}
        >
          Merge All
        </button>
        <button
          className="btn-small"
          onClick={() => handleApplyToAll('skip')}
        >
          Skip All
        </button>
      </div>

      <div className="duplicates-list">
        {state.duplicates.map((duplicate, index) => {
          const resolution = state.duplicateResolutions.get(index) || 'import';

          return (
            <div key={index} className={`duplicate-card ${resolution}`}>
              <div className="duplicate-header">
                <div className="match-info">
                  <span className="match-score">
                    {Math.round(duplicate.matchScore * 100)}% match
                  </span>
                  <span className="match-reasons">
                    {duplicate.matchReasons.join(' • ')}
                  </span>
                </div>
              </div>

              <div className="duplicate-comparison">
                <div className="guest-card new">
                  <h4>New Guest (from file)</h4>
                  <div className="guest-info">
                    <p className="guest-name">
                      {getFullName({
                        firstName: duplicate.newGuest.firstName || '',
                        lastName: duplicate.newGuest.lastName || '',
                      })}
                    </p>
                    {duplicate.newGuest.email && (
                      <p className="guest-detail">{duplicate.newGuest.email}</p>
                    )}
                    {duplicate.newGuest.company && (
                      <p className="guest-detail">{duplicate.newGuest.company}</p>
                    )}
                    {duplicate.newGuest.group && (
                      <p className="guest-detail">Group: {duplicate.newGuest.group}</p>
                    )}
                  </div>
                </div>

                <div className="vs-divider">
                  <span>vs</span>
                </div>

                <div className="guest-card existing">
                  <h4>Existing Guest</h4>
                  <div className="guest-info">
                    <p className="guest-name">{getFullName(duplicate.existingGuest)}</p>
                    {duplicate.existingGuest.email && (
                      <p className="guest-detail">{duplicate.existingGuest.email}</p>
                    )}
                    {duplicate.existingGuest.company && (
                      <p className="guest-detail">{duplicate.existingGuest.company}</p>
                    )}
                    {duplicate.existingGuest.group && (
                      <p className="guest-detail">Group: {duplicate.existingGuest.group}</p>
                    )}
                    {duplicate.existingGuest.tableId && (
                      <p className="guest-detail assigned">Already assigned to a table</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="resolution-actions">
                <label className={`resolution-option ${resolution === 'skip' ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name={`resolution-${index}`}
                    value="skip"
                    checked={resolution === 'skip'}
                    onChange={() => handleResolutionChange(index, 'skip')}
                  />
                  <span className="option-label">Skip</span>
                  <span className="option-desc">Don't import this guest</span>
                </label>

                <label className={`resolution-option ${resolution === 'merge' ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name={`resolution-${index}`}
                    value="merge"
                    checked={resolution === 'merge'}
                    onChange={() => handleResolutionChange(index, 'merge')}
                  />
                  <span className="option-label">Merge</span>
                  <span className="option-desc">Update existing with new data</span>
                </label>

                <label className={`resolution-option ${resolution === 'import' ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name={`resolution-${index}`}
                    value="import"
                    checked={resolution === 'import'}
                    onChange={() => handleResolutionChange(index, 'import')}
                  />
                  <span className="option-label">Import as New</span>
                  <span className="option-desc">Create separate guest record</span>
                </label>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
