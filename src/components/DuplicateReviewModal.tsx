'use client';

import { useState, useEffect, useMemo } from 'react';
import type { DuplicateGuestMatch, Guest, ProjectGuest } from '@/types';
import './DuplicateReviewModal.css';

type MergeAction = 'merge' | 'keep_both' | 'skip';

interface DuplicateDecision {
  matchIndex: number;
  action: MergeAction;
}

interface DuplicateReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  exactMatches: DuplicateGuestMatch[];
  fuzzyMatches: DuplicateGuestMatch[];
  newGuests: Array<Guest | ProjectGuest>;
  onConfirm: (decisions: {
    exactMatchDecisions: DuplicateDecision[];
    fuzzyMatchDecisions: DuplicateDecision[];
  }) => void;
  projectName: string;
}

function getGuestFullName(guest: Guest | ProjectGuest): string {
  return `${guest.firstName} ${guest.lastName}`.trim();
}

function getGuestEmail(guest: Guest | ProjectGuest): string | undefined {
  return guest.email;
}

function MatchCard({
  match,
  index,
  decision,
  onDecisionChange,
  matchType,
}: {
  match: DuplicateGuestMatch;
  index: number;
  decision: MergeAction;
  onDecisionChange: (action: MergeAction) => void;
  matchType: 'exact' | 'fuzzy';
}) {
  const existingName = getGuestFullName(match.existingGuest);
  const newName = getGuestFullName(match.newGuest);
  const confidencePercent = Math.round(match.confidence * 100);

  return (
    <div className={`duplicate-match-card ${decision}`}>
      <div className="match-header">
        <div className="match-type-badge">
          {matchType === 'exact' ? (
            <span className="badge exact">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
              Email Match
            </span>
          ) : (
            <span className="badge fuzzy">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 16v-4" />
                <path d="M12 8h.01" />
              </svg>
              Similar Name ({confidencePercent}%)
            </span>
          )}
        </div>
      </div>

      <div className="match-comparison">
        <div className="match-guest existing">
          <div className="guest-label">In Project</div>
          <div className="guest-name">{existingName}</div>
          {match.existingGuest.email && (
            <div className="guest-email">{match.existingGuest.email}</div>
          )}
          {match.existingGuest.company && (
            <div className="guest-company">{match.existingGuest.company}</div>
          )}
        </div>

        <div className="match-divider">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </div>

        <div className="match-guest incoming">
          <div className="guest-label">From Event</div>
          <div className="guest-name">{newName}</div>
          {getGuestEmail(match.newGuest) && (
            <div className="guest-email">{getGuestEmail(match.newGuest)}</div>
          )}
          {'company' in match.newGuest && match.newGuest.company && (
            <div className="guest-company">{match.newGuest.company}</div>
          )}
        </div>
      </div>

      <div className="match-actions">
        <button
          className={`action-btn ${decision === 'merge' ? 'selected' : ''}`}
          onClick={() => onDecisionChange('merge')}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          Merge
          <span className="action-desc">Use existing, fill missing data</span>
        </button>

        <button
          className={`action-btn ${decision === 'keep_both' ? 'selected' : ''}`}
          onClick={() => onDecisionChange('keep_both')}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="8.5" cy="7" r="4" />
            <path d="M20 8v6M23 11h-6" />
          </svg>
          Keep Both
          <span className="action-desc">Add as separate guest</span>
        </button>

        <button
          className={`action-btn ${decision === 'skip' ? 'selected' : ''}`}
          onClick={() => onDecisionChange('skip')}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
          Skip
          <span className="action-desc">Don&apos;t add this guest</span>
        </button>
      </div>
    </div>
  );
}

export function DuplicateReviewModal({
  isOpen,
  onClose,
  exactMatches,
  fuzzyMatches,
  newGuests,
  onConfirm,
  projectName,
}: DuplicateReviewModalProps) {
  // Initialize decisions - default exact matches to 'merge', fuzzy to requiring explicit choice
  const [exactDecisions, setExactDecisions] = useState<MergeAction[]>([]);
  const [fuzzyDecisions, setFuzzyDecisions] = useState<MergeAction[]>([]);

  // Reset decisions when modal opens/matches change
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (isOpen) {
      setExactDecisions(exactMatches.map(() => 'merge'));
      setFuzzyDecisions(fuzzyMatches.map(() => 'merge'));
    }
  }, [isOpen, exactMatches, fuzzyMatches]);
  /* eslint-enable react-hooks/set-state-in-effect */

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

  // Summary counts
  const summary = useMemo(() => {
    const mergeCount =
      exactDecisions.filter((d) => d === 'merge').length +
      fuzzyDecisions.filter((d) => d === 'merge').length;
    const keepBothCount =
      exactDecisions.filter((d) => d === 'keep_both').length +
      fuzzyDecisions.filter((d) => d === 'keep_both').length;
    const skipCount =
      exactDecisions.filter((d) => d === 'skip').length +
      fuzzyDecisions.filter((d) => d === 'skip').length;
    const newCount = newGuests.length;

    return {
      mergeCount,
      keepBothCount,
      skipCount,
      newCount,
      totalToAdd: keepBothCount + newCount,
      totalToMerge: mergeCount,
      totalSkipped: skipCount,
    };
  }, [exactDecisions, fuzzyDecisions, newGuests]);

  const handleConfirm = () => {
    onConfirm({
      exactMatchDecisions: exactDecisions.map((action, index) => ({
        matchIndex: index,
        action,
      })),
      fuzzyMatchDecisions: fuzzyDecisions.map((action, index) => ({
        matchIndex: index,
        action,
      })),
    });
  };

  const handleApplyAll = (action: MergeAction, type: 'exact' | 'fuzzy' | 'all') => {
    if (type === 'exact' || type === 'all') {
      setExactDecisions(exactMatches.map(() => action));
    }
    if (type === 'fuzzy' || type === 'all') {
      setFuzzyDecisions(fuzzyMatches.map(() => action));
    }
  };

  if (!isOpen) return null;

  const totalMatches = exactMatches.length + fuzzyMatches.length;

  return (
    <div className="duplicate-modal-overlay" onClick={onClose}>
      <div className="duplicate-modal" onClick={(e) => e.stopPropagation()}>
        <div className="duplicate-modal-header">
          <div>
            <h2>Review Potential Duplicates</h2>
            <p className="duplicate-modal-subtitle">
              Moving event to <strong>{projectName}</strong>
            </p>
          </div>
          <button className="duplicate-modal-close" onClick={onClose}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="duplicate-modal-content">
          {/* Summary Stats */}
          <div className="duplicate-summary">
            <div className="summary-stat">
              <span className="stat-value">{totalMatches}</span>
              <span className="stat-label">Potential Duplicate{totalMatches !== 1 ? 's' : ''}</span>
            </div>
            <div className="summary-stat">
              <span className="stat-value">{newGuests.length}</span>
              <span className="stat-label">New Guest{newGuests.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="summary-stat highlight">
              <span className="stat-value">{summary.totalToAdd + summary.totalToMerge}</span>
              <span className="stat-label">Will Be in Project</span>
            </div>
          </div>

          {/* Bulk Actions */}
          {totalMatches > 1 && (
            <div className="duplicate-bulk-actions">
              <span>Apply to all:</span>
              <button onClick={() => handleApplyAll('merge', 'all')}>Merge All</button>
              <button onClick={() => handleApplyAll('keep_both', 'all')}>Keep All Separate</button>
              <button onClick={() => handleApplyAll('skip', 'all')}>Skip All</button>
            </div>
          )}

          {/* Exact Matches Section */}
          {exactMatches.length > 0 && (
            <div className="duplicate-section">
              <h3 className="section-title">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
                Email Matches ({exactMatches.length})
              </h3>
              <p className="section-desc">
                These guests have the same email address and are likely the same person.
              </p>
              <div className="match-list">
                {exactMatches.map((match, index) => (
                  <MatchCard
                    key={`exact-${index}`}
                    match={match}
                    index={index}
                    matchType="exact"
                    decision={exactDecisions[index] || 'merge'}
                    onDecisionChange={(action) => {
                      const newDecisions = [...exactDecisions];
                      newDecisions[index] = action;
                      setExactDecisions(newDecisions);
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Fuzzy Matches Section */}
          {fuzzyMatches.length > 0 && (
            <div className="duplicate-section">
              <h3 className="section-title">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 16v-4" />
                  <path d="M12 8h.01" />
                </svg>
                Similar Names ({fuzzyMatches.length})
              </h3>
              <p className="section-desc">
                These guests have similar names and may be the same person. Please review carefully.
              </p>
              <div className="match-list">
                {fuzzyMatches.map((match, index) => (
                  <MatchCard
                    key={`fuzzy-${index}`}
                    match={match}
                    index={index}
                    matchType="fuzzy"
                    decision={fuzzyDecisions[index] || 'merge'}
                    onDecisionChange={(action) => {
                      const newDecisions = [...fuzzyDecisions];
                      newDecisions[index] = action;
                      setFuzzyDecisions(newDecisions);
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* New Guests Section */}
          {newGuests.length > 0 && (
            <div className="duplicate-section new-guests">
              <h3 className="section-title">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="8.5" cy="7" r="4" />
                  <path d="M20 8v6M23 11h-6" />
                </svg>
                New Guests ({newGuests.length})
              </h3>
              <p className="section-desc">
                These guests will be added to the project&apos;s master list.
              </p>
              <div className="new-guests-list">
                {newGuests.slice(0, 10).map((guest, index) => (
                  <div key={index} className="new-guest-item">
                    <span className="new-guest-name">{getGuestFullName(guest)}</span>
                    {getGuestEmail(guest) && (
                      <span className="new-guest-email">{getGuestEmail(guest)}</span>
                    )}
                  </div>
                ))}
                {newGuests.length > 10 && (
                  <div className="new-guests-overflow">
                    +{newGuests.length - 10} more
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="duplicate-modal-footer">
          <div className="footer-summary">
            <span>
              <strong>{summary.totalToMerge}</strong> merged,{' '}
              <strong>{summary.totalToAdd}</strong> added,{' '}
              <strong>{summary.totalSkipped}</strong> skipped
            </span>
          </div>
          <div className="footer-actions">
            <button className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button className="btn-primary" onClick={handleConfirm}>
              Confirm & Move Event
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
