import { useReducer, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useStore } from '../../store/useStore';
import { showToast } from '../toastStore';
import {
  importReducer,
  initialImportState,
  TABLE_SHAPE_DEFAULTS,
  type ImportWizardAction,
} from './types';
import { FileUploadStep } from './steps/FileUploadStep';
import { ColumnMappingStep } from './steps/ColumnMappingStep';
import { DataPreviewStep } from './steps/DataPreviewStep';
import { TableAssignmentStep } from './steps/TableAssignmentStep';
import { DuplicateReviewStep } from './steps/DuplicateReviewStep';
import { hasRequiredMappings } from './utils/columnDetector';
import { detectDuplicates, getDuplicateIndices } from './utils/duplicateDetector';
import {
  computeFinalTableAssignments,
  calculateTablePositions,
} from './utils/tableAssignment';
import { insertGuests, updateGuests, type GuestInput } from '../../actions/guests';
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
  { id: 'tables', title: 'Table Assignment' },
  { id: 'duplicates', title: 'Review Duplicates' },
];

export function ImportWizard({ isOpen, onClose }: ImportWizardProps) {
  const [state, dispatch] = useReducer(importReducer, initialImportState);
  const { event, importGuests, updateGuest, addTables, assignGuestToTable } = useStore();

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
      case 'preview': {
        // Can proceed if we have any guests to import (excluding validation errors that are critical)
        const includedGuests = state.parsedGuests.filter(
          (_, i) => !state.excludedRowIndices.has(i)
        );
        return includedGuests.length > 0;
      }
      case 'tables':
        // Can always proceed (table assignment is optional)
        // If enabled, validate table count > 0
        if (state.tableAssignment.enabled) {
          return state.tableAssignment.tableCount > 0;
        }
        return true;
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
      // Initialize table assignment with recommended count when entering tables step
      const includedGuests = state.parsedGuests.filter(
        (_, i) => !state.excludedRowIndices.has(i)
      );
      const defaultCapacity = TABLE_SHAPE_DEFAULTS['round'].capacity;
      const recommendedCount = Math.ceil(includedGuests.length / defaultCapacity);
      if (state.tableAssignment.tableCount === 0) {
        dispatch({ type: 'SET_TABLE_COUNT', payload: recommendedCount });
      }
    }

    if (currentStep?.id === 'tables') {
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
  }, [currentStep?.id, state.parsedGuests, state.excludedRowIndices, state.tableAssignment.tableCount, event.guests]);

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
  const handleImport = useCallback(async () => {
    dispatch({ type: 'SET_IMPORTING', payload: true });

    try {
      const includedGuests = state.parsedGuests.filter(
        (_, i) => !state.excludedRowIndices.has(i)
      );
      const duplicateIndices = getDuplicateIndices(state.duplicates);

      // Create tables if table assignment is enabled
      let createdTableIds: string[] = [];
      if (state.tableAssignment.enabled && state.tableAssignment.tableCount > 0) {
        const { tableShape, tableCount, tableCapacity } = state.tableAssignment;
        const defaults = TABLE_SHAPE_DEFAULTS[tableShape];
        const positions = calculateTablePositions(
          tableCount,
          defaults.width,
          defaults.height
        );

        // Create all tables at once and get their IDs
        const tableDefs = positions.map((pos) => ({
          shape: tableShape,
          x: pos.x,
          y: pos.y,
          capacity: tableCapacity,
        }));
        createdTableIds = addTables(tableDefs);
      }

      // Compute guest assignments if enabled and not skipping
      let guestAssignments = new Map<number, number>();
      if (
        state.tableAssignment.enabled &&
        state.tableAssignment.distributionStrategy !== 'skip' &&
        createdTableIds.length > 0
      ) {
        guestAssignments = computeFinalTableAssignments(
          includedGuests,
          state.tableAssignment.tableCount,
          state.tableAssignment.tableCapacity,
          state.tableAssignment.distributionStrategy
        );
      }

      // Build list of guests to add/merge with table assignments
      const guestsToAdd: Partial<Guest>[] = [];
      const guestsToMerge: { id: string; data: Partial<Guest> }[] = [];

      // Track which original index maps to which guest in guestsToAdd
      const addIndexToOriginalIndex: number[] = [];

      includedGuests.forEach((guest, i) => {
        if (duplicateIndices.has(i)) {
          const duplicate = state.duplicates.find((d) => d.newGuestIndex === i);
          const resolution = state.duplicateResolutions.get(i) || 'import';

          if (resolution === 'skip') {
            // Do nothing
          } else if (resolution === 'merge' && duplicate) {
            // For merged guests, also update table assignment if available
            const tableIndex = guestAssignments.get(i);
            const tableId = tableIndex !== undefined ? createdTableIds[tableIndex] : undefined;
            guestsToMerge.push({
              id: duplicate.existingGuest.id,
              data: tableId ? { ...guest, tableId } : guest,
            });
          } else {
            addIndexToOriginalIndex.push(i);
            guestsToAdd.push(guest);
          }
        } else {
          addIndexToOriginalIndex.push(i);
          guestsToAdd.push(guest);
        }
      });

      // Import new guests to local store
      if (guestsToAdd.length > 0) {
        importGuests(guestsToAdd);
      }

      // Merge existing guests (with table assignments already included)
      guestsToMerge.forEach(({ id, data }) => {
        updateGuest(id, data);
      });

      // Assign newly imported guests to tables
      // We need to get the IDs of the newly imported guests
      // importGuests adds them to the store, so we can find them by matching names
      if (createdTableIds.length > 0 && guestAssignments.size > 0) {
        // Get the current store state to find newly added guest IDs
        const currentGuests = useStore.getState().event.guests;

        // Match newly added guests by firstName + lastName
        guestsToAdd.forEach((addedGuest, addIdx) => {
          const originalIndex = addIndexToOriginalIndex[addIdx];
          const tableIndex = guestAssignments.get(originalIndex);

          if (tableIndex !== undefined && createdTableIds[tableIndex]) {
            // Find the guest in the store
            const storeGuest = currentGuests.find(
              (g) =>
                g.firstName === addedGuest.firstName &&
                g.lastName === addedGuest.lastName &&
                !g.tableId // Only match unassigned guests to avoid duplicates
            );

            if (storeGuest) {
              assignGuestToTable(storeGuest.id, createdTableIds[tableIndex]);
            }
          }
        });
      }

      // Persist to Supabase if we have an event ID (user is authenticated)
      const eventId = event.id;
      if (eventId && eventId !== 'default') {
        // Get the freshly imported guests from the store with their assigned IDs
        const currentGuests = useStore.getState().event.guests;

        // Prepare guests for database insertion
        const guestsForDb: GuestInput[] = guestsToAdd.map((addedGuest) => {
          // Find the guest in the store to get their generated ID and table assignment
          const storeGuest = currentGuests.find(
            (g) =>
              g.firstName === addedGuest.firstName &&
              g.lastName === addedGuest.lastName
          );

          return {
            id: storeGuest?.id,
            firstName: addedGuest.firstName || '',
            lastName: addedGuest.lastName || '',
            email: addedGuest.email,
            company: addedGuest.company,
            jobTitle: addedGuest.jobTitle,
            industry: addedGuest.industry,
            profileSummary: addedGuest.profileSummary,
            group: addedGuest.group,
            rsvpStatus: addedGuest.rsvpStatus as 'pending' | 'confirmed' | 'declined',
            notes: addedGuest.notes,
            tableId: storeGuest?.tableId,
            seatIndex: storeGuest?.seatIndex,
            interests: addedGuest.interests,
            dietaryRestrictions: addedGuest.dietaryRestrictions,
            accessibilityNeeds: addedGuest.accessibilityNeeds,
          };
        });

        // Insert new guests to database
        if (guestsForDb.length > 0) {
          const insertResult = await insertGuests(eventId, guestsForDb);
          if (insertResult.error) {
            console.error('Failed to persist guests to database:', insertResult.error);
            // Don't fail the entire import - local store already updated
            showToast('Guests imported locally but failed to sync to cloud', 'warning');
          }
        }

        // Update merged guests in database
        if (guestsToMerge.length > 0) {
          const mergeInputs: GuestInput[] = guestsToMerge.map(({ id, data }) => ({
            id,
            firstName: data.firstName || '',
            lastName: data.lastName || '',
            email: data.email,
            company: data.company,
            jobTitle: data.jobTitle,
            industry: data.industry,
            profileSummary: data.profileSummary,
            group: data.group,
            rsvpStatus: data.rsvpStatus as 'pending' | 'confirmed' | 'declined',
            notes: data.notes,
            tableId: data.tableId,
            seatIndex: data.seatIndex,
            interests: data.interests,
            dietaryRestrictions: data.dietaryRestrictions,
            accessibilityNeeds: data.accessibilityNeeds,
          }));

          const updateResult = await updateGuests(eventId, mergeInputs);
          if (updateResult.error) {
            console.error('Failed to update merged guests in database:', updateResult.error);
          }
        }
      }

      // Build success message
      const counts = getImportCounts();
      let message = `Imported ${counts.toAdd} new guest${counts.toAdd !== 1 ? 's' : ''}`;
      if (counts.toMerge > 0) {
        message += `, merged ${counts.toMerge}`;
      }
      if (state.tableAssignment.enabled && state.tableAssignment.tableCount > 0) {
        message += `, created ${state.tableAssignment.tableCount} table${state.tableAssignment.tableCount !== 1 ? 's' : ''}`;
      }
      showToast(message, 'success');

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
    state.tableAssignment,
    event.id,
    importGuests,
    updateGuest,
    addTables,
    assignGuestToTable,
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
          {currentStep?.id === 'tables' && (
            <TableAssignmentStep state={state} dispatch={dispatch} />
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
