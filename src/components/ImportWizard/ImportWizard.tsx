import { useReducer, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useStore } from '../../store/useStore';
import { showToast } from '../toastStore';
import {
  importReducer,
  initialImportState,
  type ImportWizardAction,
} from './types';
import { FileUploadStep } from './steps/FileUploadStep';
import { ColumnMappingStep } from './steps/ColumnMappingStep';
import { DataPreviewStep } from './steps/DataPreviewStep';
import { DuplicateReviewStep } from './steps/DuplicateReviewStep';
import { hasRequiredMappings } from './utils/columnDetector';
import { detectDuplicates, getDuplicateIndices } from './utils/duplicateDetector';
import type { Guest } from '../../types';
import './ImportWizard.css';

interface ImportWizardProps {
  isOpen: boolean;
  onClose: () => void;
}

const STEPS = [
  { id: 'upload', title: 'Upload File' },
  { id: 'mapping', title: 'Map Columns' },
  { id: 'preview', title: 'Preview Data' },
  { id: 'duplicates', title: 'Review Duplicates' },
];

export function ImportWizard({ isOpen, onClose }: ImportWizardProps) {
  const [state, dispatch] = useReducer(importReducer, initialImportState);
  const { event, importGuests, updateGuest } = useStore();

  // Determine active steps (skip duplicates if none found)
  const activeSteps = useMemo(() => {
    if (state.duplicates.length === 0) {
      return STEPS.filter((s) => s.id !== 'duplicates');
    }
    return STEPS;
  }, [state.duplicates.length]);

  // Current step index within active steps
  const [currentStepIndex, setCurrentStepIndex] = useReducer(
    (_: number, action: number | 'next' | 'back') => {
      if (action === 'next') return Math.min(_ + 1, activeSteps.length - 1);
      if (action === 'back') return Math.max(_ - 1, 0);
      return action;
    },
    0
  );

  const currentStep = activeSteps[currentStepIndex];

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Reset state when wizard closes
  useEffect(() => {
    if (!isOpen) {
      dispatch({ type: 'RESET' });
      setCurrentStepIndex(0);
    }
  }, [isOpen]);

  // Check if can proceed to next step
  const canProceed = useCallback(() => {
    switch (currentStep?.id) {
      case 'upload':
        return state.parsedFile !== null && state.fileError === null;
      case 'mapping':
        return hasRequiredMappings(state.columnMappings);
      case 'preview':
        // Can proceed if we have any guests to import (excluding validation errors that are critical)
        const includedGuests = state.parsedGuests.filter(
          (_, i) => !state.excludedRowIndices.has(i)
        );
        return includedGuests.length > 0;
      case 'duplicates':
        // Can always proceed from duplicates (resolutions have defaults)
        return true;
      default:
        return false;
    }
  }, [currentStep?.id, state]);

  // Handle next step (with processing for transitions)
  const handleNext = useCallback(() => {
    if (currentStep?.id === 'preview') {
      // Before going to duplicates/import, detect duplicates
      const includedGuests = state.parsedGuests.filter(
        (_, i) => !state.excludedRowIndices.has(i)
      );
      const duplicates = detectDuplicates(includedGuests, event.guests);
      dispatch({ type: 'SET_DUPLICATES', payload: duplicates });

      // Initialize all resolutions to 'import' by default
      dispatch({ type: 'SET_ALL_DUPLICATE_RESOLUTIONS', payload: 'import' });
    }

    setCurrentStepIndex('next');
  }, [currentStep?.id, state.parsedGuests, state.excludedRowIndices, event.guests]);

  // Handle back
  const handleBack = useCallback(() => {
    setCurrentStepIndex('back');
  }, []);

  // Calculate import counts
  const getImportCounts = useCallback(() => {
    const includedGuests = state.parsedGuests.filter(
      (_, i) => !state.excludedRowIndices.has(i)
    );
    const duplicateIndices = getDuplicateIndices(state.duplicates);

    let toAdd = 0;
    let toMerge = 0;
    let toSkip = 0;

    includedGuests.forEach((_, i) => {
      if (duplicateIndices.has(i)) {
        const resolution = state.duplicateResolutions.get(i) || 'import';
        if (resolution === 'skip') toSkip++;
        else if (resolution === 'merge') toMerge++;
        else toAdd++;
      } else {
        toAdd++;
      }
    });

    return { toAdd, toMerge, toSkip, total: includedGuests.length };
  }, [state.parsedGuests, state.excludedRowIndices, state.duplicates, state.duplicateResolutions]);

  // Handle final import
  const handleImport = useCallback(() => {
    dispatch({ type: 'SET_IMPORTING', payload: true });

    try {
      const includedGuests = state.parsedGuests.filter(
        (_, i) => !state.excludedRowIndices.has(i)
      );
      const duplicateIndices = getDuplicateIndices(state.duplicates);

      const guestsToAdd: Partial<Guest>[] = [];
      const guestsToMerge: { id: string; data: Partial<Guest> }[] = [];

      includedGuests.forEach((guest, i) => {
        if (duplicateIndices.has(i)) {
          const duplicate = state.duplicates.find((d) => d.newGuestIndex === i);
          const resolution = state.duplicateResolutions.get(i) || 'import';

          if (resolution === 'skip') {
            // Do nothing
          } else if (resolution === 'merge' && duplicate) {
            guestsToMerge.push({
              id: duplicate.existingGuest.id,
              data: guest,
            });
          } else {
            guestsToAdd.push(guest);
          }
        } else {
          guestsToAdd.push(guest);
        }
      });

      // Import new guests
      if (guestsToAdd.length > 0) {
        importGuests(guestsToAdd);
      }

      // Merge existing guests
      guestsToMerge.forEach(({ id, data }) => {
        updateGuest(id, data);
      });

      const counts = getImportCounts();
      showToast(
        `Imported ${counts.toAdd} new guest${counts.toAdd !== 1 ? 's' : ''}${
          counts.toMerge > 0 ? `, merged ${counts.toMerge}` : ''
        }`,
        'success'
      );

      onClose();
    } catch (error) {
      dispatch({
        type: 'SET_IMPORT_ERROR',
        payload: error instanceof Error ? error.message : 'Import failed',
      });
      showToast('Import failed. Please try again.', 'error');
    } finally {
      dispatch({ type: 'SET_IMPORTING', payload: false });
    }
  }, [
    state.parsedGuests,
    state.excludedRowIndices,
    state.duplicates,
    state.duplicateResolutions,
    importGuests,
    updateGuest,
    getImportCounts,
    onClose,
  ]);

  // Check if on last step
  const isLastStep = currentStepIndex === activeSteps.length - 1;

  if (!isOpen) return null;

  const counts = getImportCounts();

  return createPortal(
    <div className="modal-overlay import-wizard-overlay" onClick={onClose}>
      <div className="import-wizard-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="wizard-header">
          <h2>Import Guests</h2>
          <button className="close-btn" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        {/* Progress indicator */}
        <div className="wizard-progress">
          {activeSteps.map((step, i) => (
            <div
              key={step.id}
              className={`progress-step ${i === currentStepIndex ? 'active' : ''} ${
                i < currentStepIndex ? 'completed' : ''
              }`}
            >
              <span className="step-number">{i + 1}</span>
              <span className="step-title">{step.title}</span>
            </div>
          ))}
        </div>

        {/* Step content */}
        <div className="wizard-content">
          {currentStep?.id === 'upload' && (
            <FileUploadStep state={state} dispatch={dispatch} />
          )}
          {currentStep?.id === 'mapping' && (
            <ColumnMappingStep
              state={state}
              dispatch={dispatch}
              eventType={state.detectedEventType || event.eventType}
            />
          )}
          {currentStep?.id === 'preview' && (
            <DataPreviewStep state={state} dispatch={dispatch} />
          )}
          {currentStep?.id === 'duplicates' && (
            <DuplicateReviewStep state={state} dispatch={dispatch} />
          )}
        </div>

        {/* Footer */}
        <div className="wizard-footer">
          <button
            className="btn-secondary"
            onClick={handleBack}
            disabled={currentStepIndex === 0}
          >
            Back
          </button>

          <div className="footer-spacer" />

          {!isLastStep ? (
            <button className="btn-primary" onClick={handleNext} disabled={!canProceed()}>
              Next
            </button>
          ) : (
            <button
              className="btn-primary"
              onClick={handleImport}
              disabled={state.isImporting || counts.total === 0}
            >
              {state.isImporting
                ? 'Importing...'
                : `Import ${counts.toAdd} Guest${counts.toAdd !== 1 ? 's' : ''}`}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

// Export dispatch type for steps
export type ImportDispatch = React.Dispatch<ImportWizardAction>;
