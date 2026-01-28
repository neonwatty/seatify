'use client';

import { useState, useTransition } from 'react';
import { updateProject, deleteProject, getProjectGuests, getProjectRelationships } from '@/actions/projects';
import { trackProjectDeleted } from '@/utils/analytics';
import type { ProjectWithSummary } from '@/types';
import './ProjectSettingsModal.css';

interface ProjectSettingsModalProps {
  project: ProjectWithSummary;
  isOpen: boolean;
  onClose: () => void;
  onUpdated?: (project: ProjectWithSummary) => void;
  onDeleted?: () => void;
}

type Tab = 'general' | 'guests' | 'danger';

export function ProjectSettingsModal({
  project,
  isOpen,
  onClose,
  onUpdated,
  onDeleted,
}: ProjectSettingsModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>('general');
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description || '');
  const [startDate, setStartDate] = useState(project.startDate || '');
  const [endDate, setEndDate] = useState(project.endDate || '');

  // Delete confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteEvents, setDeleteEvents] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  const handleSave = () => {
    if (!name.trim()) return;

    startTransition(async () => {
      const result = await updateProject(project.id, {
        name: name.trim(),
        description: description.trim() || null,
        startDate: startDate || null,
        endDate: endDate || null,
      });

      if (result.error) {
        setError(result.error);
        return;
      }

      if (result.data) {
        onUpdated?.({
          ...project,
          ...result.data,
        });
      }
      onClose();
    });
  };

  const handleDelete = () => {
    if (deleteConfirmText !== project.name) return;

    const eventCount = project.eventCount || 0;
    const guestCount = project.guestCount || 0;

    startTransition(async () => {
      const result = await deleteProject(project.id, deleteEvents);

      if (result.error) {
        setError(result.error);
        return;
      }

      trackProjectDeleted(eventCount, guestCount);
      onDeleted?.();
      onClose();
    });
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content project-settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Project Settings</h2>
          <button className="close-btn" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="error-banner">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v4M12 16h.01" />
            </svg>
            {error}
          </div>
        )}

        <div className="settings-tabs">
          <button
            className={`settings-tab ${activeTab === 'general' ? 'active' : ''}`}
            onClick={() => setActiveTab('general')}
          >
            General
          </button>
          <button
            className={`settings-tab ${activeTab === 'guests' ? 'active' : ''}`}
            onClick={() => setActiveTab('guests')}
          >
            Guests
            <span className="tab-badge">{project.guestCount}</span>
          </button>
          <button
            className={`settings-tab ${activeTab === 'danger' ? 'active' : ''}`}
            onClick={() => setActiveTab('danger')}
          >
            Danger Zone
          </button>
        </div>

        <div className="settings-content">
          {activeTab === 'general' && (
            <div className="settings-panel">
              <div className="form-group">
                <label htmlFor="projectName">Project Name</label>
                <input
                  id="projectName"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Annual Conference 2026"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="projectDescription">Description</label>
                <textarea
                  id="projectDescription"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description of the project"
                  rows={3}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="startDate">Start Date</label>
                  <input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="endDate">End Date</label>
                  <input
                    id="endDate"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="project-stats">
                <div className="stat-item">
                  <span className="stat-value">{project.eventCount}</span>
                  <span className="stat-label">Events</span>
                </div>
                <div className="stat-item">
                  <span className="stat-value">{project.guestCount}</span>
                  <span className="stat-label">Guests</span>
                </div>
              </div>

              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={onClose}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={handleSave}
                  disabled={isPending || !name.trim()}
                >
                  {isPending ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'guests' && (
            <div className="settings-panel">
              <div className="guests-info">
                <p>
                  This project has <strong>{project.guestCount}</strong> guest{project.guestCount !== 1 ? 's' : ''} in the master list.
                </p>
                <p className="info-text">
                  Project guests are shared across all events in this project. You can manage guests from the Master Guest List in the dashboard.
                </p>
              </div>

              {project.events && project.events.length > 0 && (
                <div className="events-list">
                  <h4>Events in this project</h4>
                  <ul>
                    {project.events.map((event) => (
                      <li key={event.id}>
                        <span className="event-name">{event.name}</span>
                        {event.date && <span className="event-date">{event.date}</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {activeTab === 'danger' && (
            <div className="settings-panel danger-zone">
              {!showDeleteConfirm ? (
                <>
                  <div className="danger-section">
                    <h4>Delete Project</h4>
                    <p>
                      Deleting this project will remove all project-level data including the master guest list and relationships.
                    </p>
                    <button
                      type="button"
                      className="btn-danger"
                      onClick={() => setShowDeleteConfirm(true)}
                    >
                      Delete Project
                    </button>
                  </div>
                </>
              ) : (
                <div className="delete-confirm">
                  <h4>Confirm Deletion</h4>
                  <p>
                    This action <strong>cannot be undone</strong>. This will permanently delete the
                    <strong> {project.name}</strong> project and all its data.
                  </p>

                  {(project.eventCount || 0) > 0 && (
                    <div className="delete-option">
                      <label>
                        <input
                          type="checkbox"
                          checked={deleteEvents}
                          onChange={(e) => setDeleteEvents(e.target.checked)}
                        />
                        <span>Also delete {project.eventCount} event{(project.eventCount || 0) !== 1 ? 's' : ''} in this project</span>
                      </label>
                      <p className="option-hint">
                        {deleteEvents
                          ? 'Events will be permanently deleted along with their seating arrangements.'
                          : 'Events will become standalone and remain accessible from your dashboard.'}
                      </p>
                    </div>
                  )}

                  <div className="form-group">
                    <label>Type <strong>{project.name}</strong> to confirm:</label>
                    <input
                      type="text"
                      value={deleteConfirmText}
                      onChange={(e) => setDeleteConfirmText(e.target.value)}
                      placeholder={project.name}
                    />
                  </div>

                  <div className="form-actions">
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => {
                        setShowDeleteConfirm(false);
                        setDeleteConfirmText('');
                        setDeleteEvents(false);
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="btn-danger"
                      onClick={handleDelete}
                      disabled={isPending || deleteConfirmText !== project.name}
                    >
                      {isPending ? 'Deleting...' : 'Delete Project'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
