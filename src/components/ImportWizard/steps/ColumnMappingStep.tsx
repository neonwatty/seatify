import { useCallback, useEffect } from 'react';
import type { ImportWizardState, ImportWizardAction, GuestField, ColumnMapping } from '../types';
import { GUEST_FIELD_LABELS } from '../types';
import { getMissingRequiredFields, splitFullName } from '../utils/columnDetector';
import type { EventType, Guest } from '../../../types';

interface ColumnMappingStepProps {
  state: ImportWizardState;
  dispatch: React.Dispatch<ImportWizardAction>;
  eventType: EventType;
}

const FIELD_OPTIONS: (GuestField | 'fullName' | null)[] = [
  null,
  'firstName',
  'lastName',
  'fullName',
  'email',
  'company',
  'jobTitle',
  'industry',
  'group',
  'dietaryRestrictions',
  'accessibilityNeeds',
  'rsvpStatus',
  'notes',
];

export function ColumnMappingStep({ state, dispatch }: ColumnMappingStepProps) {
  const missingFields = getMissingRequiredFields(state.columnMappings);

  // When mappings change, parse the data
  useEffect(() => {
    if (!state.parsedFile) return;

    const guests = parseRowsToGuests(state.parsedFile.rows, state.columnMappings);
    dispatch({ type: 'SET_PARSED_GUESTS', payload: guests });

    // Validate parsed guests
    const errors = validateGuests(guests);
    dispatch({ type: 'SET_VALIDATION_ERRORS', payload: errors });
  }, [state.columnMappings, state.parsedFile, dispatch]);

  const handleMappingChange = useCallback(
    (index: number, targetField: GuestField | 'fullName' | null) => {
      dispatch({
        type: 'UPDATE_COLUMN_MAPPING',
        payload: { index, mapping: { targetField, confidence: targetField ? 1 : 0 } },
      });
    },
    [dispatch]
  );

  const getConfidenceClass = (confidence: number) => {
    if (confidence >= 0.9) return 'high';
    if (confidence >= 0.7) return 'medium';
    return 'low';
  };

  return (
    <div className="column-mapping-step">
      <div className="step-description">
        <p>Map your file columns to guest fields. We've auto-detected some mappings for you.</p>
        {missingFields.length > 0 && (
          <p className="warning">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            Missing required: {missingFields.join(', ')}
          </p>
        )}
      </div>

      <div className="mapping-table">
        <div className="mapping-header">
          <span className="col-source">File Column</span>
          <span className="col-sample">Sample Values</span>
          <span className="col-target">Map To</span>
        </div>

        {state.columnMappings.map((mapping, index) => (
          <div key={index} className="mapping-row">
            <div className="col-source">
              <span className="column-name">{mapping.sourceColumn}</span>
              {mapping.confidence > 0 && (
                <span
                  className={`confidence-badge ${getConfidenceClass(mapping.confidence)}`}
                  title={`${Math.round(mapping.confidence * 100)}% confidence`}
                >
                  {mapping.confidence >= 0.9 ? '✓' : '?'}
                </span>
              )}
            </div>

            <div className="col-sample">
              {mapping.sampleValues.slice(0, 2).map((val, i) => (
                <span key={i} className="sample-value">
                  {val || <em className="empty">empty</em>}
                </span>
              ))}
            </div>

            <div className="col-target">
              <select
                value={mapping.targetField || ''}
                onChange={(e) =>
                  handleMappingChange(
                    index,
                    (e.target.value || null) as GuestField | 'fullName' | null
                  )
                }
                className={mapping.targetField ? '' : 'unmapped'}
              >
                <option value="">-- Skip --</option>
                {FIELD_OPTIONS.filter(Boolean).map((field) => (
                  <option key={field} value={field!}>
                    {GUEST_FIELD_LABELS[field!]}
                  </option>
                ))}
              </select>
            </div>
          </div>
        ))}
      </div>

      {state.columnMappings.some((m) => m.targetField === 'fullName') && (
        <div className="info-message">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
          Full names will be automatically split on the first space (e.g., "John Smith" → First: "John", Last: "Smith")
        </div>
      )}
    </div>
  );
}

/**
 * Parse rows into guest objects based on column mappings
 */
function parseRowsToGuests(
  rows: string[][],
  mappings: ColumnMapping[]
): Partial<Guest>[] {
  return rows.map((row) => {
    const guest: Partial<Guest> = {};

    mappings.forEach((mapping, colIndex) => {
      const value = row[colIndex]?.trim();
      if (!value || !mapping.targetField) return;

      if (mapping.targetField === 'fullName') {
        const { firstName, lastName } = splitFullName(value);
        guest.firstName = firstName;
        guest.lastName = lastName;
      } else if (mapping.targetField === 'rsvpStatus') {
        // Normalize RSVP status
        guest.rsvpStatus = normalizeRsvpStatus(value);
      } else if (
        mapping.targetField === 'dietaryRestrictions' ||
        mapping.targetField === 'accessibilityNeeds' ||
        mapping.targetField === 'interests'
      ) {
        // Split comma-separated values into array
        guest[mapping.targetField] = value.split(',').map((s) => s.trim()).filter(Boolean);
      } else {
        (guest as Record<string, string>)[mapping.targetField] = value;
      }
    });

    return guest;
  });
}

/**
 * Normalize RSVP status to valid enum values
 */
function normalizeRsvpStatus(value: string): 'pending' | 'confirmed' | 'declined' {
  const normalized = value.toLowerCase().trim();

  if (['confirmed', 'yes', 'attending', 'accepted', 'y', '1', 'true'].includes(normalized)) {
    return 'confirmed';
  }
  if (['declined', 'no', 'not attending', 'rejected', 'n', '0', 'false'].includes(normalized)) {
    return 'declined';
  }

  return 'pending';
}

/**
 * Validate parsed guests and return errors
 */
function validateGuests(guests: Partial<Guest>[]) {
  const errors: { rowIndex: number; field: string; message: string; severity: 'error' | 'warning' }[] = [];

  guests.forEach((guest, rowIndex) => {
    // Required field validation
    if (!guest.firstName?.trim()) {
      errors.push({
        rowIndex,
        field: 'firstName',
        message: 'Missing first name',
        severity: 'error',
      });
    }

    if (!guest.lastName?.trim()) {
      errors.push({
        rowIndex,
        field: 'lastName',
        message: 'Missing last name',
        severity: 'warning', // Warning because we can still import with just first name
      });
    }

    // Email format validation
    if (guest.email && !isValidEmail(guest.email)) {
      errors.push({
        rowIndex,
        field: 'email',
        message: 'Invalid email format',
        severity: 'warning',
      });
    }
  });

  return errors;
}

/**
 * Basic email format validation
 */
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
