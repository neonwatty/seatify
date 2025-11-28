import { useState } from 'react';
import { useStore } from '../store/useStore';
import type { Guest, Table, Constraint } from '../types';
import './OptimizeView.css';

interface OptimizationResult {
  assignments: Map<string, string>; // guestId -> tableId
  score: number;
  violations: string[];
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

  const unassignedGuests = event.guests.filter(g => !g.tableId && g.rsvpStatus !== 'declined');
  const totalCapacity = event.tables.reduce((sum, t) => sum + t.capacity, 0);
  const confirmedGuests = event.guests.filter(g => g.rsvpStatus !== 'declined').length;

  const runOptimization = async () => {
    setIsOptimizing(true);
    setResult(null);

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
          <div className="result-panel">
            <h3>Optimization Complete</h3>
            <p className="score">
              Score: <strong>{result.score.toFixed(1)}</strong>/100
            </p>
            {result.violations.length > 0 && (
              <div className="violations">
                <h4>Warnings:</h4>
                <ul>
                  {result.violations.map((v, i) => (
                    <li key={i}>{v}</li>
                  ))}
                </ul>
              </div>
            )}
            <div className="result-actions">
              <button className="apply-btn" onClick={applyOptimization}>
                Apply Seating
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
                  {guest.name}
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
                    return <span key={id} className="guest-name">{guest?.name}</span>;
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

function optimizeSeating(
  guests: Guest[],
  tables: Table[],
  constraints: Constraint[]
): OptimizationResult {
  const assignments = new Map<string, string>();
  const violations: string[] = [];

  if (tables.length === 0) {
    return { assignments, score: 0, violations: ['No tables available'] };
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

  return {
    assignments,
    score: Math.max(0, Math.min(100, score)),
    violations,
  };
}
