import { useState } from 'react';
import { useStore } from '../store/useStore';
import type { Guest, Table, Constraint } from '../types';
import { getFullName } from '../types';
import { EmailCaptureModal } from './EmailCaptureModal';
import { trackOptimizerRun, trackFunnelStep, trackMilestone, setUserProperties } from '../utils/analytics';
import {
  shouldShowEmailCapture,
  markTriggerShown,
  markAsSubscribed,
  trackDismissal,
} from '../utils/emailCaptureManager';
import './OptimizeView.css';

interface OptimizationResult {
  assignments: Map<string, string>; // guestId -> tableId
  score: number;
  violations: string[];
  breakdown: {
    constraints: number;
    relationships: number;
    groups: number;
    capacity: number;
  };
  tableScores: Map<string, { score: number; issues: number }>;
}

export function OptimizeView() {
  const { event, assignGuestToTable, addConstraint, removeConstraint } = useStore();
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [result, setResult] = useState<OptimizationResult | null>(null);
  const [newConstraint, setNewConstraint] = useState({
    type: 'same_table' as Constraint['type'],
    guestIds: [] as string[],
    priority: 'preferred' as Constraint['priority'],
  });
  const [showEmailCapture, setShowEmailCapture] = useState(false);

  const unassignedGuests = event.guests.filter(g => !g.tableId && g.rsvpStatus !== 'declined');
  const totalCapacity = event.tables.reduce((sum, t) => sum + t.capacity, 0);
  const confirmedGuests = event.guests.filter(g => g.rsvpStatus !== 'declined').length;

  const runOptimization = async () => {
    setIsOptimizing(true);
    setResult(null);

    // Track optimizer usage
    trackOptimizerRun(confirmedGuests, event.tables.length);
    trackFunnelStep('optimizer_used', { guest_count: confirmedGuests, table_count: event.tables.length });
    trackMilestone('first_optimization');
    setUserProperties({ hasUsedOptimizer: true });

    // Simulate async work
    await new Promise(resolve => setTimeout(resolve, 500));

    const optimizationResult = optimizeSeating(
      event.guests.filter(g => g.rsvpStatus !== 'declined'),
      event.tables,
      event.constraints
    );

    setResult(optimizationResult);
    setIsOptimizing(false);
  };

  const applyOptimization = () => {
    if (!result) return;

    result.assignments.forEach((tableId, guestId) => {
      assignGuestToTable(guestId, tableId);
    });

    setResult(null);

    // Trigger email capture after successful optimization
    if (shouldShowEmailCapture('optimizerSuccess')) {
      markTriggerShown('optimizerSuccess');
      setTimeout(() => setShowEmailCapture(true), 500);
    }
  };

  const handleEmailCaptureClose = (subscribed = false) => {
    if (subscribed) {
      markAsSubscribed();
    } else {
      trackDismissal();
    }
    setShowEmailCapture(false);
  };

  const handleAddConstraint = () => {
    if (newConstraint.guestIds.length >= 2) {
      addConstraint({
        type: newConstraint.type,
        guestIds: newConstraint.guestIds,
        priority: newConstraint.priority,
      });
      setNewConstraint({ ...newConstraint, guestIds: [] });
    }
  };

  const toggleGuestInConstraint = (guestId: string) => {
    if (newConstraint.guestIds.includes(guestId)) {
      setNewConstraint({
        ...newConstraint,
        guestIds: newConstraint.guestIds.filter(id => id !== guestId),
      });
    } else {
      setNewConstraint({
        ...newConstraint,
        guestIds: [...newConstraint.guestIds, guestId],
      });
    }
  };

  return (
    <div className="optimize-view">
      <div className="optimize-panel">
        <h2>Seating Optimization</h2>

        <div className="stats-grid">
          <div className="stat-card">
            <span className="stat-value">{confirmedGuests}</span>
            <span className="stat-label">Guests to Seat</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">{totalCapacity}</span>
            <span className="stat-label">Total Capacity</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">{unassignedGuests.length}</span>
            <span className="stat-label">Unassigned</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">{event.constraints.length}</span>
            <span className="stat-label">Constraints</span>
          </div>
        </div>

        {totalCapacity < confirmedGuests && (
          <div className="warning-banner">
            Not enough table capacity! Add more tables or increase capacity.
          </div>
        )}

        <div className="section">
          <h3>Optimization Settings</h3>
          <div className="setting-row">
            <label>
              <input type="checkbox" defaultChecked />
              Keep groups together (family, friends)
            </label>
          </div>
          <div className="setting-row">
            <label>
              <input type="checkbox" defaultChecked />
              Respect "avoid" relationships
            </label>
          </div>
          <div className="setting-row">
            <label>
              <input type="checkbox" defaultChecked />
              Match guests by shared interests
            </label>
          </div>
          <div className="setting-row">
            <label>
              <input type="checkbox" defaultChecked />
              Mix industries for networking (corporate events)
            </label>
          </div>
        </div>

        <button
          className="optimize-btn"
          onClick={runOptimization}
          disabled={isOptimizing || event.tables.length === 0}
        >
          {isOptimizing ? 'Optimizing...' : 'Run Optimization'}
        </button>

        {result && (
          <div className="result-panel enhanced">
            <div className="result-header">
              <div className="score-circle-container">
                <div className={`score-circle ${getGradeClass(result.score)}`}>
                  <svg viewBox="0 0 120 120">
                    <circle className="score-bg" cx="60" cy="60" r="52" />
                    <circle
                      className="score-fill"
                      cx="60"
                      cy="60"
                      r="52"
                      strokeDasharray={`${(result.score / 100) * 327} 327`}
                    />
                  </svg>
                  <div className="score-value">
                    <span className="score-number">{Math.round(result.score)}</span>
                    <span className="score-max">/100</span>
                  </div>
                </div>
                <span className={`grade-label ${getGradeClass(result.score)}`}>
                  {getGrade(result.score)}
                </span>
              </div>

              <div className="score-breakdown">
                <h4>Score Breakdown</h4>
                <div className="breakdown-item">
                  <div className="breakdown-header">
                    <span>Constraints</span>
                    <span className="breakdown-value">{result.breakdown.constraints}%</span>
                  </div>
                  <div className="breakdown-bar">
                    <div className="breakdown-fill" style={{ width: `${result.breakdown.constraints}%` }} />
                  </div>
                </div>
                <div className="breakdown-item">
                  <div className="breakdown-header">
                    <span>Relationships</span>
                    <span className="breakdown-value">{result.breakdown.relationships}%</span>
                  </div>
                  <div className="breakdown-bar">
                    <div className="breakdown-fill" style={{ width: `${result.breakdown.relationships}%` }} />
                  </div>
                </div>
                <div className="breakdown-item">
                  <div className="breakdown-header">
                    <span>Groups</span>
                    <span className="breakdown-value">{result.breakdown.groups}%</span>
                  </div>
                  <div className="breakdown-bar">
                    <div className="breakdown-fill" style={{ width: `${result.breakdown.groups}%` }} />
                  </div>
                </div>
                <div className="breakdown-item">
                  <div className="breakdown-header">
                    <span>Capacity</span>
                    <span className="breakdown-value">{result.breakdown.capacity}%</span>
                  </div>
                  <div className="breakdown-bar">
                    <div className="breakdown-fill" style={{ width: `${result.breakdown.capacity}%` }} />
                  </div>
                </div>
              </div>
            </div>

            {result.violations.length > 0 && (
              <div className="issues-section">
                <h4>Issues & Warnings ({result.violations.length})</h4>
                <div className="issues-list">
                  {result.violations.map((v, i) => (
                    <div key={i} className="issue-item">
                      <span className="issue-icon">!</span>
                      <span className="issue-message">{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="table-analysis">
              <h4>Table Analysis</h4>
              <div className="table-cards">
                {event.tables.map(table => {
                  const tableData = result.tableScores.get(table.id) || { score: 0, issues: 0 };
                  const guestsAtTable = event.guests.filter(g => result.assignments.get(g.id) === table.id);
                  return (
                    <div key={table.id} className={`table-card ${getGradeClass(tableData.score)}`}>
                      <div className="table-card-header">
                        <span className="table-name">{table.name}</span>
                        <span className="table-occupancy">{guestsAtTable.length}/{table.capacity}</span>
                      </div>
                      <div className="table-score">
                        <span className="table-score-value">{tableData.score}</span>
                        <span className="table-score-label">compatibility</span>
                      </div>
                      {tableData.issues > 0 && (
                        <span className="table-issues-badge">{tableData.issues} issue{tableData.issues > 1 ? 's' : ''}</span>
                      )}
                      <div className="table-guests">
                        {guestsAtTable.slice(0, 8).map(g => (
                          <div key={g.id} className="mini-avatar" title={getFullName(g)} />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="result-actions">
              <button className="apply-btn" onClick={applyOptimization}>
                Apply Arrangement
              </button>
              <button className="cancel-btn" onClick={() => setResult(null)}>
                Discard
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="constraints-panel">
        <h2>Constraints</h2>

        <div className="add-constraint">
          <h3>Add New Constraint</h3>
          <div className="constraint-form">
            <select
              value={newConstraint.type}
              onChange={(e) => setNewConstraint({ ...newConstraint, type: e.target.value as Constraint['type'] })}
            >
              <option value="same_table">Must sit at same table</option>
              <option value="different_table">Must sit at different tables</option>
              <option value="must_sit_together">Must sit next to each other</option>
              <option value="must_not_sit_together">Must not sit next to each other</option>
            </select>

            <select
              value={newConstraint.priority}
              onChange={(e) => setNewConstraint({ ...newConstraint, priority: e.target.value as Constraint['priority'] })}
            >
              <option value="required">Required</option>
              <option value="preferred">Preferred</option>
              <option value="optional">Nice to have</option>
            </select>
          </div>

          <div className="guest-selector">
            <p>Select guests ({newConstraint.guestIds.length} selected):</p>
            <div className="guest-chips">
              {event.guests.map((guest) => (
                <button
                  key={guest.id}
                  className={`chip ${newConstraint.guestIds.includes(guest.id) ? 'selected' : ''}`}
                  onClick={() => toggleGuestInConstraint(guest.id)}
                >
                  {getFullName(guest)}
                </button>
              ))}
            </div>
          </div>

          <button
            className="add-btn"
            onClick={handleAddConstraint}
            disabled={newConstraint.guestIds.length < 2}
          >
            Add Constraint
          </button>
        </div>

        <div className="constraint-list">
          <h3>Active Constraints</h3>
          {event.constraints.length === 0 ? (
            <p className="empty">No constraints defined yet.</p>
          ) : (
            event.constraints.map((constraint) => (
              <div key={constraint.id} className={`constraint-item ${constraint.priority}`}>
                <div className="constraint-info">
                  <span className="constraint-type">
                    {formatConstraintType(constraint.type)}
                  </span>
                  <span className="constraint-priority">{constraint.priority}</span>
                </div>
                <div className="constraint-guests">
                  {constraint.guestIds.map((id) => {
                    const guest = event.guests.find((g) => g.id === id);
                    return <span key={id} className="guest-name">{guest ? getFullName(guest) : ''}</span>;
                  })}
                </div>
                <button
                  className="remove-btn"
                  onClick={() => removeConstraint(constraint.id)}
                >
                  ×
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {showEmailCapture && (
        <EmailCaptureModal
          onClose={() => handleEmailCaptureClose(false)}
          onSuccess={() => handleEmailCaptureClose(true)}
          source="value_moment"
        />
      )}
    </div>
  );
}

function formatConstraintType(type: Constraint['type']): string {
  switch (type) {
    case 'same_table':
      return 'Same table';
    case 'different_table':
      return 'Different tables';
    case 'must_sit_together':
      return 'Sit together';
    case 'must_not_sit_together':
      return 'Keep apart';
    case 'near_front':
      return 'Near front';
    case 'accessibility':
      return 'Accessibility';
    default:
      return type;
  }
}

function getGradeClass(score: number): string {
  if (score >= 90) return 'excellent';
  if (score >= 70) return 'good';
  if (score >= 50) return 'fair';
  return 'poor';
}

function getGrade(score: number): string {
  if (score >= 90) return 'Excellent';
  if (score >= 70) return 'Good';
  if (score >= 50) return 'Fair';
  return 'Needs Work';
}

function optimizeSeating(
  guests: Guest[],
  tables: Table[],
  constraints: Constraint[]
): OptimizationResult {
  const assignments = new Map<string, string>();
  const violations: string[] = [];
  const tableScores = new Map<string, { score: number; issues: number }>();

  // Initialize table scores
  tables.forEach(t => tableScores.set(t.id, { score: 100, issues: 0 }));

  if (tables.length === 0) {
    return {
      assignments,
      score: 0,
      violations: ['No tables available'],
      breakdown: { constraints: 0, relationships: 0, groups: 0, capacity: 0 },
      tableScores,
    };
  }

  // Group guests by their group attribute
  const guestsByGroup = new Map<string, Guest[]>();
  const ungroupedGuests: Guest[] = [];

  guests.forEach((guest) => {
    if (guest.group) {
      const group = guestsByGroup.get(guest.group) || [];
      group.push(guest);
      guestsByGroup.set(guest.group, group);
    } else {
      ungroupedGuests.push(guest);
    }
  });

  // Track table occupancy
  const tableOccupancy = new Map<string, number>();
  tables.forEach((t) => tableOccupancy.set(t.id, 0));

  // First pass: Assign groups together
  guestsByGroup.forEach((groupGuests, groupName) => {
    // Find a table with enough space for the group
    let assigned = false;
    for (const table of tables) {
      const currentOccupancy = tableOccupancy.get(table.id) || 0;
      if (currentOccupancy + groupGuests.length <= table.capacity) {
        groupGuests.forEach((guest) => {
          assignments.set(guest.id, table.id);
        });
        tableOccupancy.set(table.id, currentOccupancy + groupGuests.length);
        assigned = true;
        break;
      }
    }

    if (!assigned) {
      // Split the group across tables
      violations.push(`Group "${groupName}" had to be split across tables`);
      for (const guest of groupGuests) {
        for (const table of tables) {
          const currentOccupancy = tableOccupancy.get(table.id) || 0;
          if (currentOccupancy < table.capacity) {
            assignments.set(guest.id, table.id);
            tableOccupancy.set(table.id, currentOccupancy + 1);
            break;
          }
        }
      }
    }
  });

  // Second pass: Handle constraints
  constraints.forEach((constraint) => {
    if (constraint.priority !== 'required') return;

    if (constraint.type === 'same_table') {
      // Find a table that can fit all constrained guests
      const constrainedGuests = constraint.guestIds;
      for (const table of tables) {
        const currentOccupancy = tableOccupancy.get(table.id) || 0;
        const unassignedInConstraint = constrainedGuests.filter(
          (id) => !assignments.has(id)
        );
        const alreadyAtTable = constrainedGuests.filter(
          (id) => assignments.get(id) === table.id
        );

        if (
          alreadyAtTable.length > 0 &&
          currentOccupancy + unassignedInConstraint.length <= table.capacity
        ) {
          unassignedInConstraint.forEach((id) => {
            assignments.set(id, table.id);
            tableOccupancy.set(table.id, (tableOccupancy.get(table.id) || 0) + 1);
          });
          break;
        }
      }
    }
  });

  // Third pass: Assign remaining ungrouped guests
  // Try to match by interests
  ungroupedGuests.forEach((guest) => {
    if (assignments.has(guest.id)) return;

    let bestTable: Table | null = null;
    let bestScore = -1;

    for (const table of tables) {
      const currentOccupancy = tableOccupancy.get(table.id) || 0;
      if (currentOccupancy >= table.capacity) continue;

      // Score this table based on interest matching
      const tableGuests = guests.filter((g) => assignments.get(g.id) === table.id);
      let score = 0;

      // Check for shared interests
      if (guest.interests) {
        tableGuests.forEach((tg) => {
          if (tg.interests) {
            const shared = guest.interests!.filter((i) =>
              tg.interests!.some((ti) => ti.toLowerCase() === i.toLowerCase())
            );
            score += shared.length * 2;
          }
        });
      }

      // Check for same industry (good for networking)
      if (guest.industry) {
        const sameIndustry = tableGuests.filter((tg) => tg.industry === guest.industry);
        // Mix is better than all same
        if (sameIndustry.length > 0 && sameIndustry.length < tableGuests.length / 2) {
          score += 1;
        }
      }

      // Check for relationships
      guest.relationships.forEach((rel) => {
        const relatedGuest = tableGuests.find((tg) => tg.id === rel.guestId);
        if (relatedGuest) {
          if (rel.type === 'avoid') {
            score -= 10;
          } else {
            score += rel.strength;
          }
        }
      });

      if (score > bestScore || bestTable === null) {
        bestScore = score;
        bestTable = table;
      }
    }

    if (bestTable) {
      assignments.set(guest.id, bestTable.id);
      tableOccupancy.set(bestTable.id, (tableOccupancy.get(bestTable.id) || 0) + 1);
    }
  });

  // Check for constraint violations
  constraints.forEach((constraint) => {
    if (constraint.type === 'different_table') {
      const tableIds = constraint.guestIds.map((id) => assignments.get(id));
      const uniqueTables = new Set(tableIds.filter(Boolean));
      if (uniqueTables.size < constraint.guestIds.filter((id) => assignments.has(id)).length) {
        violations.push(
          `Constraint violated: Some guests who should be at different tables are together`
        );
      }
    }

    if (constraint.type === 'same_table') {
      const tableIds = constraint.guestIds.map((id) => assignments.get(id));
      const uniqueTables = new Set(tableIds.filter(Boolean));
      if (uniqueTables.size > 1) {
        violations.push(
          `Constraint violated: Some guests who should be together are at different tables`
        );
      }
    }
  });

  // Calculate score
  let score = 100;
  const unassigned = guests.filter((g) => !assignments.has(g.id));
  score -= unassigned.length * 5;
  score -= violations.length * 10;

  // Bonus for keeping groups together
  let groupsKeptTogether = 0;
  guestsByGroup.forEach((groupGuests) => {
    const tableIds = groupGuests.map((g) => assignments.get(g.id));
    if (new Set(tableIds).size === 1) {
      groupsKeptTogether++;
    }
  });
  score += groupsKeptTogether * 3;

  if (unassigned.length > 0) {
    violations.push(`${unassigned.length} guest(s) could not be assigned`);
  }

  // Calculate breakdown scores
  const totalCapacity = tables.reduce((sum, t) => sum + t.capacity, 0);
  const capacityScore = totalCapacity >= guests.length ? 100 : Math.round((totalCapacity / guests.length) * 100);
  const constraintScore = constraints.length > 0
    ? Math.max(0, 100 - (violations.filter(v => v.includes('Constraint')).length * 20))
    : 100;
  const groupScore = guestsByGroup.size > 0
    ? Math.round((groupsKeptTogether / guestsByGroup.size) * 100)
    : 100;

  // Relationship score based on how many positive relationships are at the same table
  let relationshipScore = 100;
  guests.forEach(guest => {
    const guestTable = assignments.get(guest.id);
    guest.relationships.forEach(rel => {
      const relTable = assignments.get(rel.guestId);
      if (rel.type === 'avoid' && guestTable === relTable) {
        relationshipScore -= 15;
      } else if (rel.type !== 'avoid' && guestTable !== relTable) {
        relationshipScore -= 5;
      }
    });
  });
  relationshipScore = Math.max(0, Math.min(100, relationshipScore));

  // Calculate per-table scores
  tables.forEach(table => {
    const guestsAtTable = guests.filter(g => assignments.get(g.id) === table.id);
    let tableScore = 100;
    let issues = 0;

    // Check for avoid relationships at this table
    guestsAtTable.forEach(g => {
      g.relationships.forEach(rel => {
        if (rel.type === 'avoid') {
          const relatedAtTable = guestsAtTable.find(gt => gt.id === rel.guestId);
          if (relatedAtTable) {
            tableScore -= 20;
            issues++;
          }
        }
      });
    });

    // Check for mixed groups (slight penalty)
    const groups = new Set(guestsAtTable.map(g => g.group).filter(Boolean));
    if (groups.size > 2) {
      tableScore -= 5;
    }

    tableScores.set(table.id, { score: Math.max(0, tableScore), issues });
  });

  return {
    assignments,
    score: Math.max(0, Math.min(100, score)),
    violations,
    breakdown: {
      constraints: constraintScore,
      relationships: relationshipScore,
      groups: groupScore,
      capacity: capacityScore,
    },
    tableScores,
  };
}
