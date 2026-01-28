'use client';

import { useState, useEffect, useTransition } from 'react';
import { moveEventToProject } from '@/actions/projects';
import { getProjects } from '@/actions/projects';
import { trackEventMovedToProject } from '@/utils/analytics';
import type { ProjectWithSummary } from '@/types';
import './MoveEventToProjectModal.css';

interface MoveEventToProjectModalProps {
  eventId: string;
  eventName: string;
  isOpen: boolean;
  onClose: () => void;
  onMoved?: (projectId: string) => void;
}

export function MoveEventToProjectModal({
  eventId,
  eventName,
  isOpen,
  onClose,
  onMoved,
}: MoveEventToProjectModalProps) {
  const [projects, setProjects] = useState<ProjectWithSummary[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const loadProjects = async () => {
    setLoading(true);
    setError(null);
    const result = await getProjects();
    if (result.error) {
      setError(result.error);
    } else if (result.data) {
      setProjects(result.data);
      if (result.data.length > 0) {
        setSelectedProjectId(result.data[0].id);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    if (isOpen) {
      loadProjects();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const handleMove = () => {
    if (!selectedProjectId) return;

    startTransition(async () => {
      const result = await moveEventToProject(eventId, selectedProjectId);

      if (result.error) {
        setError(result.error);
        return;
      }

      // Track event moved (guest count will be 0 for now as we don't have access to it here)
      trackEventMovedToProject(0);
      onMoved?.(selectedProjectId);
      onClose();
    });
  };

  if (!isOpen) return null;

  const selectedProject = projects.find((p) => p.id === selectedProjectId);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content move-event-modal" onClick={(e) => e.stopPropagation()}>
        <h2>Move to Project</h2>
        <p className="modal-description">
          Move <strong>{eventName}</strong> into a project. The event will share the project&apos;s
          master guest list and relationships.
        </p>

        {loading ? (
          <div className="loading-state">Loading projects...</div>
        ) : error ? (
          <div className="error-state">{error}</div>
        ) : projects.length === 0 ? (
          <div className="empty-state">
            <p>No projects available. Create a project first to move events into it.</p>
          </div>
        ) : (
          <>
            <div className="form-group">
              <label htmlFor="projectSelect">Select Project</label>
              <select
                id="projectSelect"
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="project-select"
              >
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name} ({project.eventCount} events)
                  </option>
                ))}
              </select>
            </div>

            {selectedProject && (
              <div className="project-preview">
                <div className="preview-header">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                  </svg>
                  <span>{selectedProject.name}</span>
                </div>
                {selectedProject.description && (
                  <p className="preview-description">{selectedProject.description}</p>
                )}
                <div className="preview-stats">
                  <span>{selectedProject.eventCount} event{selectedProject.eventCount !== 1 ? 's' : ''}</span>
                  <span>{selectedProject.guestCount} guest{selectedProject.guestCount !== 1 ? 's' : ''}</span>
                </div>
                {selectedProject.events && selectedProject.events.length > 0 && (
                  <div className="preview-events">
                    <span className="preview-events-label">Current events:</span>
                    <ul>
                      {selectedProject.events.slice(0, 3).map((e) => (
                        <li key={e.id}>{e.name}</li>
                      ))}
                      {selectedProject.events.length > 3 && (
                        <li className="more">+{selectedProject.events.length - 3} more</li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            )}

            <div className="info-box">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 16v-4M12 8h.01" />
              </svg>
              <div>
                <strong>What happens when you move an event:</strong>
                <ul>
                  <li>Existing guests will be added to the project&apos;s master list</li>
                  <li>You&apos;ll review any duplicate guests before merging</li>
                  <li>Project-level relationships will apply to this event</li>
                </ul>
              </div>
            </div>
          </>
        )}

        <div className="modal-actions">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={handleMove}
            disabled={isPending || !selectedProjectId || loading}
          >
            {isPending ? 'Moving...' : 'Move to Project'}
          </button>
        </div>
      </div>
    </div>
  );
}
