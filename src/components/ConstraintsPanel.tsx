import { useState } from 'react';
import { useStore } from '../store/useStore';
import { useSyncToSupabase } from '../hooks/useSyncToSupabase';
import { ConstraintForm } from './ConstraintForm';
import type { Constraint } from '../types';
import { getFullName } from '../types';
import './ConstraintsPanel.css';

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

export function ConstraintsPanel() {
  const { event } = useStore();
  const { removeConstraint } = useSyncToSupabase();
  const [showConstraintForm, setShowConstraintForm] = useState(false);
  const [editingConstraintId, setEditingConstraintId] = useState<string | null>(null);

  const handleOpenAddConstraint = () => {
    setEditingConstraintId(null);
    setShowConstraintForm(true);
  };

  const handleEditConstraint = (constraintId: string) => {
    setEditingConstraintId(constraintId);
    setShowConstraintForm(true);
  };

  const handleCloseConstraintForm = () => {
    setShowConstraintForm(false);
    setEditingConstraintId(null);
  };

  return (
    <div className="constraints-panel">
      <div className="constraints-intro">
        <p>
          Add rules to control how guests are seated together or apart during optimization.
        </p>
      </div>

      <button className="add-constraint-btn" onClick={handleOpenAddConstraint}>
        + Add Rule
      </button>

      <div className="constraints-list">
        {event.constraints.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">📋</span>
            <p>No rules defined yet</p>
            <p className="empty-hint">
              Add rules to ensure certain guests sit together or apart
            </p>
          </div>
        ) : (
          event.constraints.map((constraint) => (
            <div key={constraint.id} className={`constraint-card ${constraint.priority}`}>
              <div className="constraint-header">
                <span className="constraint-type">
                  {formatConstraintType(constraint.type)}
                </span>
                <span className={`constraint-priority-badge ${constraint.priority}`}>
                  {constraint.priority}
                </span>
              </div>
              <div className="constraint-guests">
                {constraint.guestIds.map((id) => {
                  const guest = event.guests.find((g) => g.id === id);
                  return (
                    <span key={id} className="guest-tag">
                      {guest ? getFullName(guest) : 'Unknown'}
                    </span>
                  );
                })}
              </div>
              {constraint.description && (
                <p className="constraint-description">{constraint.description}</p>
              )}
              <div className="constraint-actions">
                <button
                  className="edit-btn"
                  onClick={() => handleEditConstraint(constraint.id)}
                  title="Edit rule"
                >
                  Edit
                </button>
                <button
                  className="delete-btn"
                  onClick={() => removeConstraint(constraint.id)}
                  title="Delete rule"
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {showConstraintForm && (
        <ConstraintForm
          constraintId={editingConstraintId ?? undefined}
          onClose={handleCloseConstraintForm}
        />
      )}
    </div>
  );
}
