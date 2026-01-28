'use client';

import { useState, useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createEvent, updateEvent, deleteEvent } from '@/actions/events';
import { createProject, deleteProject, updateProject } from '@/actions/projects';
import { getDateParts, formatDate, formatEventType } from '@/utils/date';
import { useSubscription } from '@/hooks/useSubscription';
import {
  trackProjectCreated,
  trackProjectDeleted,
  trackEventCreated,
  trackEventAddedToProject,
  trackProjectEventRatio,
} from '@/utils/analytics';
import { useProjectStore } from '@/store/projectStore';
import { ProjectCard } from './ProjectCard';
import type { ProjectWithSummary } from '@/types';

export interface Event {
  id: string;
  name: string;
  event_type: string;
  date: string | null;
  created_at: string;
  project_id?: string | null;
  tables: { count: number }[];
  guests: { count: number }[];
}

export interface EventListClientProps {
  initialEvents: Event[];
  initialProjects?: ProjectWithSummary[];
}

export function EventListClient({ initialEvents, initialProjects = [] }: EventListClientProps) {
  const [events, setEvents] = useState(initialEvents);
  const [projects, setProjects] = useState<ProjectWithSummary[]>(initialProjects);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

  // Project modals
  const [showProjectCreateModal, setShowProjectCreateModal] = useState(false);
  const [showProjectEditModal, setShowProjectEditModal] = useState(false);
  const [showProjectDeleteModal, setShowProjectDeleteModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState<ProjectWithSummary | null>(null);
  const [showAddEventToProjectModal, setShowAddEventToProjectModal] = useState(false);

  // Form state
  const [eventName, setEventName] = useState('');
  const [eventType, setEventType] = useState('wedding');
  const [eventDate, setEventDate] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  // Project form state
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [projectStartDate, setProjectStartDate] = useState('');
  const [projectEndDate, setProjectEndDate] = useState('');

  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const { limits } = useSubscription();
  const { setProjects: setStoreProjects } = useProjectStore();

  // Sync projects to store
  useEffect(() => {
    setStoreProjects(projects);
  }, [projects, setStoreProjects]);

  // Track project/event ratio on initial load
  useEffect(() => {
    const projectEventCount = projects.reduce((sum, p) => sum + (p.eventCount || 0), 0);
    const standaloneEventCount = events.filter(e => !e.project_id).length;
    if (projectEventCount > 0 || standaloneEventCount > 0) {
      trackProjectEventRatio(projectEventCount, standaloneEventCount);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only track on initial load

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventName.trim()) return;

    startTransition(async () => {
      const result = await createEvent(eventName, eventType, selectedProjectId || undefined);

      if (result.error) {
        // Check if limit was reached
        if ('limitReached' in result && result.limitReached) {
          closeModals();
          setShowUpgradeModal(true);
          return;
        }
        console.error('Error creating event:', result.error);
        return;
      }

      if (result.data) {
        const isProjectEvent = !!selectedProjectId;
        trackEventCreated(eventType, isProjectEvent);
        if (isProjectEvent) {
          trackEventAddedToProject(true);
        }
        router.push(`/dashboard/events/${result.data.id}/canvas`);
      }
    });
  };

  const handleEditEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEvent || !eventName.trim()) return;

    startTransition(async () => {
      const result = await updateEvent(selectedEvent.id, {
        name: eventName.trim(),
        event_type: eventType,
        date: eventDate || null,
      });

      if (result.error) {
        console.error('Error updating event:', result.error);
        return;
      }

      // Update local state
      setEvents(events.map(ev =>
        ev.id === selectedEvent.id
          ? { ...ev, name: eventName.trim(), event_type: eventType, date: eventDate || null }
          : ev
      ));

      closeModals();
    });
  };

  const handleDeleteEvent = async () => {
    if (!selectedEvent) return;

    startTransition(async () => {
      const result = await deleteEvent(selectedEvent.id);

      if (result.error) {
        console.error('Error deleting event:', result.error);
        return;
      }

      // Remove from local state
      setEvents(events.filter(ev => ev.id !== selectedEvent.id));
      closeModals();
    });
  };

  const openEditModal = (event: Event, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedEvent(event);
    setEventName(event.name);
    setEventType(event.event_type);
    setEventDate(event.date || '');
    setShowEditModal(true);
  };

  const openDeleteModal = (event: Event, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedEvent(event);
    setShowDeleteModal(true);
  };

  const openCreateModal = () => {
    setEventName('');
    setEventType('wedding');
    setEventDate('');
    setShowCreateModal(true);
  };

  const closeModals = () => {
    setShowCreateModal(false);
    setShowEditModal(false);
    setShowDeleteModal(false);
    setSelectedEvent(null);
    setEventName('');
    setEventType('wedding');
    setEventDate('');
    setSelectedProjectId(null);
    // Project modals
    setShowProjectCreateModal(false);
    setShowProjectEditModal(false);
    setShowProjectDeleteModal(false);
    setShowAddEventToProjectModal(false);
    setSelectedProject(null);
    setProjectName('');
    setProjectDescription('');
    setProjectStartDate('');
    setProjectEndDate('');
  };

  // Project handlers
  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName.trim()) return;

    startTransition(async () => {
      const result = await createProject({
        name: projectName.trim(),
        description: projectDescription.trim() || undefined,
        startDate: projectStartDate || undefined,
        endDate: projectEndDate || undefined,
      });

      if (result.error) {
        console.error('Error creating project:', result.error);
        return;
      }

      if (result.data) {
        setProjects([
          { ...result.data, eventCount: 0, guestCount: 0, events: [] },
          ...projects,
        ]);
        trackProjectCreated();
      }
      closeModals();
    });
  };

  const handleEditProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject || !projectName.trim()) return;

    startTransition(async () => {
      const result = await updateProject(selectedProject.id, {
        name: projectName.trim(),
        description: projectDescription.trim() || null,
        startDate: projectStartDate || null,
        endDate: projectEndDate || null,
      });

      if (result.error) {
        console.error('Error updating project:', result.error);
        return;
      }

      setProjects(projects.map((p) =>
        p.id === selectedProject.id
          ? { ...p, name: projectName.trim(), description: projectDescription.trim() || undefined, startDate: projectStartDate || undefined, endDate: projectEndDate || undefined }
          : p
      ));
      closeModals();
    });
  };

  const handleDeleteProject = async () => {
    if (!selectedProject) return;

    const eventCount = selectedProject.eventCount || 0;
    const guestCount = selectedProject.guestCount || 0;

    startTransition(async () => {
      const result = await deleteProject(selectedProject.id, false);

      if (result.error) {
        console.error('Error deleting project:', result.error);
        return;
      }

      setProjects(projects.filter((p) => p.id !== selectedProject.id));
      trackProjectDeleted(eventCount, guestCount);
      closeModals();
    });
  };

  const openProjectEditModal = (project: ProjectWithSummary) => {
    setSelectedProject(project);
    setProjectName(project.name);
    setProjectDescription(project.description || '');
    setProjectStartDate(project.startDate || '');
    setProjectEndDate(project.endDate || '');
    setShowProjectEditModal(true);
  };

  const openProjectDeleteModal = (project: ProjectWithSummary) => {
    setSelectedProject(project);
    setShowProjectDeleteModal(true);
  };

  const openAddEventToProjectModal = (project: ProjectWithSummary) => {
    setSelectedProject(project);
    setShowAddEventToProjectModal(true);
  };

  const handleCreateEventForProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventName.trim() || !selectedProject) return;

    startTransition(async () => {
      const result = await createEvent(eventName, eventType, selectedProject.id);

      if (result.error) {
        if ('limitReached' in result && result.limitReached) {
          closeModals();
          setShowUpgradeModal(true);
          return;
        }
        console.error('Error creating event:', result.error);
        return;
      }

      if (result.data) {
        trackEventCreated(eventType, true);
        trackEventAddedToProject(true);
        router.push(`/dashboard/events/${result.data.id}/canvas`);
      }
    });
  };

  const totalEventCount = events.length + projects.reduce((sum, p) => sum + (p.eventCount || 0), 0);

  return (
    <div className="events-page">
      <div className="events-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#171717', margin: 0 }}>Dashboard</h1>
          {limits.maxEvents !== -1 && (
            <span style={{
              fontSize: '0.75rem',
              color: totalEventCount >= limits.maxEvents ? '#dc2626' : '#737373',
              background: totalEventCount >= limits.maxEvents ? '#fef2f2' : '#f5f5f5',
              padding: '4px 8px',
              borderRadius: '999px',
              fontWeight: 500
            }}>
              {totalEventCount} / {limits.maxEvents} events
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setShowProjectCreateModal(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 16px',
              background: '#fef3c7',
              color: '#92400e',
              border: 'none',
              borderRadius: '8px',
              fontSize: '0.875rem',
              fontWeight: 500,
              cursor: 'pointer'
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
            New Project
          </button>
          <button
            className="create-event-button"
            onClick={openCreateModal}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 16px',
              background: '#f97352',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '0.875rem',
              fontWeight: 500,
              cursor: 'pointer'
            }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 1V13M1 7H13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            New Event
          </button>
        </div>
      </div>

      {/* Projects Section */}
      {projects.length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#737373', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 12px' }}>
            Projects
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {projects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onEdit={openProjectEditModal}
                onDelete={openProjectDeleteModal}
                onAddEvent={openAddEventToProjectModal}
              />
            ))}
          </div>
        </div>
      )}

      {/* Standalone Events Section */}
      {(events.length > 0 || projects.length > 0) && events.length > 0 && (
        <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#737373', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 12px' }}>
          Standalone Events
        </h2>
      )}

      {events.length === 0 && projects.length === 0 ? (
        <div className="empty-state">
          <h3>No events yet</h3>
          <p>Create your first event or project to start planning seating arrangements.</p>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
            <button
              onClick={() => setShowProjectCreateModal(true)}
              style={{
                padding: '12px 20px',
                background: '#fef3c7',
                color: '#92400e',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 500,
                cursor: 'pointer'
              }}
            >
              Create Project
            </button>
            <button
              className="create-event-button"
              onClick={openCreateModal}
            >
              Create Event
            </button>
          </div>
        </div>
      ) : events.length > 0 ? (
        <div className="events-grid" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {events.map((event) => (
            <div
              key={event.id}
              className="event-card-wrapper"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                background: 'white',
                border: '1px solid #e5e5e5',
                borderRadius: '12px',
                padding: '16px'
              }}
            >
              {/* Dynamic Calendar Icon */}
              <div style={{
                width: '44px',
                height: '44px',
                background: '#fafafa',
                borderRadius: '10px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                overflow: 'hidden',
                border: '1px solid #e5e5e5'
              }}>
                {getDateParts(event.date) ? (
                  <>
                    <div style={{
                      fontSize: '0.5rem',
                      fontWeight: 600,
                      color: '#f97352',
                      textTransform: 'uppercase',
                      lineHeight: 1,
                      marginBottom: '2px'
                    }}>
                      {getDateParts(event.date)?.month}
                    </div>
                    <div style={{
                      fontSize: '1.125rem',
                      fontWeight: 700,
                      color: '#171717',
                      lineHeight: 1
                    }}>
                      {getDateParts(event.date)?.day}
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{
                      fontSize: '0.5rem',
                      fontWeight: 600,
                      color: '#a3a3a3',
                      textTransform: 'uppercase',
                      lineHeight: 1,
                      marginBottom: '2px'
                    }}>
                      TBD
                    </div>
                    <div style={{
                      fontSize: '1rem',
                      fontWeight: 600,
                      color: '#d4d4d4',
                      lineHeight: 1
                    }}>
                      —
                    </div>
                  </>
                )}
              </div>
              <Link
                href={`/dashboard/events/${event.id}/canvas`}
                className="event-card"
                style={{ flex: 1, minWidth: 0, textDecoration: 'none', color: 'inherit' }}
              >
                <h3 style={{
                  fontSize: '0.9375rem',
                  fontWeight: 600,
                  color: '#171717',
                  margin: '0 0 4px',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>{event.name}</h3>
                <div style={{ fontSize: '0.8125rem', color: '#737373' }}>
                  {formatEventType(event.event_type)} · {formatDate(event.date)} · {event.guests?.[0]?.count || 0} guests
                </div>
              </Link>
              <div className="event-card-actions" style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                <button
                  className="event-action-btn edit-btn"
                  onClick={(e) => openEditModal(event, e)}
                  title="Edit"
                  style={{
                    width: '36px',
                    height: '36px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'transparent',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    color: '#a3a3a3'
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M11.5 2.5L13.5 4.5M2 14L2.5 11.5L11 3L13 5L4.5 13.5L2 14Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                <button
                  className="event-action-btn delete-btn"
                  onClick={(e) => openDeleteModal(event, e)}
                  title="Delete"
                  style={{
                    width: '36px',
                    height: '36px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'transparent',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    color: '#a3a3a3'
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M3 4H13M6 4V3C6 2.44772 6.44772 2 7 2H9C9.55228 2 10 2.44772 10 3V4M12 4V13C12 13.5523 11.5523 14 11 14H5C4.44772 14 4 13.5523 4 13V4H12Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {/* Create Event Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={closeModals}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>New Event</h2>
            <form onSubmit={handleCreateEvent}>
              <div className="form-group">
                <label htmlFor="eventName">Name</label>
                <input
                  id="eventName"
                  type="text"
                  placeholder="e.g., Smith Wedding"
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                  autoFocus
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="eventType">Type</label>
                <select
                  id="eventType"
                  value={eventType}
                  onChange={(e) => setEventType(e.target.value)}
                >
                  <option value="wedding">Wedding</option>
                  <option value="corporate">Corporate</option>
                  <option value="gala">Gala</option>
                  <option value="party">Party</option>
                  <option value="other">Other</option>
                </select>
              </div>

              {projects.length > 0 && (
                <div className="form-group">
                  <label htmlFor="projectSelect">
                    Project
                    <span style={{ fontWeight: 400, color: '#737373', marginLeft: '4px' }}>(optional)</span>
                  </label>
                  <select
                    id="projectSelect"
                    value={selectedProjectId || ''}
                    onChange={(e) => setSelectedProjectId(e.target.value || null)}
                  >
                    <option value="">Standalone Event</option>
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                  <p style={{ fontSize: '0.75rem', color: '#737373', margin: '4px 0 0' }}>
                    Events in projects share a master guest list
                  </p>
                </div>
              )}

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={closeModals}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={isPending || !eventName.trim()}
                >
                  {isPending ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Event Modal */}
      {showEditModal && selectedEvent && (
        <div className="modal-overlay" onClick={closeModals}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Edit Event</h2>
            <form onSubmit={handleEditEvent}>
              <div className="form-group">
                <label htmlFor="editEventName">Name</label>
                <input
                  id="editEventName"
                  type="text"
                  placeholder="e.g., Smith Wedding"
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                  autoFocus
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="editEventType">Type</label>
                <select
                  id="editEventType"
                  value={eventType}
                  onChange={(e) => setEventType(e.target.value)}
                >
                  <option value="wedding">Wedding</option>
                  <option value="corporate">Corporate</option>
                  <option value="gala">Gala</option>
                  <option value="party">Party</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="editEventDate">Date</label>
                <input
                  id="editEventDate"
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={closeModals}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={isPending || !eventName.trim()}
                >
                  {isPending ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedEvent && (
        <div className="modal-overlay" onClick={closeModals}>
          <div className="modal-content delete-modal" onClick={(e) => e.stopPropagation()}>
            <h2>Delete Event</h2>
            <p>
              Delete <strong>{selectedEvent.name}</strong>? This removes all tables, guests, and arrangements.
            </p>
            <div className="modal-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={closeModals}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-danger"
                onClick={handleDeleteEvent}
                disabled={isPending}
              >
                {isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Event Limit Upgrade Modal */}
      {showUpgradeModal && (
        <div className="modal-overlay" onClick={() => setShowUpgradeModal(false)}>
          <div className="modal-content upgrade-modal" onClick={(e) => e.stopPropagation()}>
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div style={{
                width: '48px',
                height: '48px',
                background: '#fff5f4',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1rem'
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f97352" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 8v4M12 16h.01" />
                </svg>
              </div>
              <h2 style={{ margin: '0 0 0.5rem' }}>Event Limit Reached</h2>
              <p style={{ color: '#737373', margin: 0 }}>
                You&apos;ve reached the maximum of {limits.maxEvents} events on the Free plan.
              </p>
            </div>

            <div style={{
              background: '#fafafa',
              borderRadius: '12px',
              padding: '1rem',
              marginBottom: '1.5rem'
            }}>
              <p style={{ fontWeight: 600, color: '#171717', margin: '0 0 0.75rem' }}>
                Upgrade to Pro for:
              </p>
              <ul style={{
                margin: 0,
                paddingLeft: '1.25rem',
                color: '#525252',
                fontSize: '0.875rem',
                lineHeight: 1.6
              }}>
                <li>Unlimited events</li>
                <li>Unlimited guests per event</li>
                <li>Custom branding</li>
                <li>Remove Seatify branding</li>
              </ul>
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setShowUpgradeModal(false)}
              >
                Maybe Later
              </button>
              <Link
                href="/pricing"
                className="btn-primary"
                style={{ textDecoration: 'none', textAlign: 'center' }}
              >
                View Plans
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Create Project Modal */}
      {showProjectCreateModal && (
        <div className="modal-overlay" onClick={closeModals}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>New Project</h2>
            <p style={{ color: '#737373', margin: '-8px 0 16px', fontSize: '0.875rem' }}>
              Projects group related events (like multi-day conferences) and share a master guest list.
            </p>
            <form onSubmit={handleCreateProject}>
              <div className="form-group">
                <label htmlFor="projectName">Project Name</label>
                <input
                  id="projectName"
                  type="text"
                  placeholder="e.g., Annual Conference 2026"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  autoFocus
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="projectDescription">Description (optional)</label>
                <textarea
                  id="projectDescription"
                  placeholder="Brief description of the project"
                  value={projectDescription}
                  onChange={(e) => setProjectDescription(e.target.value)}
                  rows={2}
                  style={{ resize: 'vertical', minHeight: '60px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label htmlFor="projectStartDate">Start Date</label>
                  <input
                    id="projectStartDate"
                    type="date"
                    value={projectStartDate}
                    onChange={(e) => setProjectStartDate(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="projectEndDate">End Date</label>
                  <input
                    id="projectEndDate"
                    type="date"
                    value={projectEndDate}
                    onChange={(e) => setProjectEndDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={closeModals}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={isPending || !projectName.trim()}
                >
                  {isPending ? 'Creating...' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Project Modal */}
      {showProjectEditModal && selectedProject && (
        <div className="modal-overlay" onClick={closeModals}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Edit Project</h2>
            <form onSubmit={handleEditProject}>
              <div className="form-group">
                <label htmlFor="editProjectName">Project Name</label>
                <input
                  id="editProjectName"
                  type="text"
                  placeholder="e.g., Annual Conference 2026"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  autoFocus
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="editProjectDescription">Description</label>
                <textarea
                  id="editProjectDescription"
                  placeholder="Brief description of the project"
                  value={projectDescription}
                  onChange={(e) => setProjectDescription(e.target.value)}
                  rows={2}
                  style={{ resize: 'vertical', minHeight: '60px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label htmlFor="editProjectStartDate">Start Date</label>
                  <input
                    id="editProjectStartDate"
                    type="date"
                    value={projectStartDate}
                    onChange={(e) => setProjectStartDate(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="editProjectEndDate">End Date</label>
                  <input
                    id="editProjectEndDate"
                    type="date"
                    value={projectEndDate}
                    onChange={(e) => setProjectEndDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={closeModals}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={isPending || !projectName.trim()}
                >
                  {isPending ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Project Modal */}
      {showProjectDeleteModal && selectedProject && (
        <div className="modal-overlay" onClick={closeModals}>
          <div className="modal-content delete-modal" onClick={(e) => e.stopPropagation()}>
            <h2>Delete Project</h2>
            <p>
              Delete <strong>{selectedProject.name}</strong>?
              {(selectedProject.eventCount || 0) > 0 && (
                <> The {selectedProject.eventCount} event{selectedProject.eventCount !== 1 ? 's' : ''} will become standalone.</>
              )}
            </p>
            <div className="modal-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={closeModals}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-danger"
                onClick={handleDeleteProject}
                disabled={isPending}
              >
                {isPending ? 'Deleting...' : 'Delete Project'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Event to Project Modal */}
      {showAddEventToProjectModal && selectedProject && (
        <div className="modal-overlay" onClick={closeModals}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Add Event to {selectedProject.name}</h2>
            <form onSubmit={handleCreateEventForProject}>
              <div className="form-group">
                <label htmlFor="newEventName">Event Name</label>
                <input
                  id="newEventName"
                  type="text"
                  placeholder="e.g., Day 1 - Welcome Reception"
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                  autoFocus
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="newEventType">Event Type</label>
                <select
                  id="newEventType"
                  value={eventType}
                  onChange={(e) => setEventType(e.target.value)}
                >
                  <option value="wedding">Wedding</option>
                  <option value="corporate">Corporate</option>
                  <option value="gala">Gala</option>
                  <option value="party">Party</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={closeModals}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={isPending || !eventName.trim()}
                >
                  {isPending ? 'Creating...' : 'Create Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
