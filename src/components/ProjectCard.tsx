'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useProjectStore } from '@/store/projectStore';
import { getDateParts, formatDate } from '@/utils/date';
import type { ProjectWithSummary } from '@/types';
import './ProjectCard.css';

interface ProjectCardProps {
  project: ProjectWithSummary;
  onEdit?: (project: ProjectWithSummary) => void;
  onDelete?: (project: ProjectWithSummary) => void;
  onAddEvent?: (project: ProjectWithSummary) => void;
}

export function ProjectCard({
  project,
  onEdit,
  onDelete,
  onAddEvent,
}: ProjectCardProps) {
  const { isProjectExpanded, toggleProjectExpanded } = useProjectStore();
  const [showMenu, setShowMenu] = useState(false);

  const isExpanded = isProjectExpanded(project.id);
  const eventCount = project.eventCount || project.events?.length || 0;
  const guestCount = project.guestCount || 0;

  const handleToggleExpand = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleProjectExpanded(project.id);
  };

  const handleMenuClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowMenu(!showMenu);
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowMenu(false);
    onEdit?.(project);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowMenu(false);
    onDelete?.(project);
  };

  const handleAddEvent = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowMenu(false);
    onAddEvent?.(project);
  };

  // Close menu when clicking outside
  const handleBlur = () => {
    setTimeout(() => setShowMenu(false), 150);
  };

  return (
    <div className="project-card">
      {/* Project Header */}
      <div className="project-card-header">
        {/* Expand/Collapse Button */}
        <button
          className={`project-expand-btn ${isExpanded ? 'expanded' : ''}`}
          onClick={handleToggleExpand}
          title={isExpanded ? 'Collapse' : 'Expand'}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <polyline points="6 4 10 8 6 12" />
          </svg>
        </button>

        {/* Folder Icon */}
        <div className="project-icon">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
          </svg>
        </div>

        {/* Project Info */}
        <div className="project-info">
          <h3 className="project-name">{project.name}</h3>
          <div className="project-meta">
            {eventCount} event{eventCount !== 1 ? 's' : ''} · {guestCount} guest
            {guestCount !== 1 ? 's' : ''}
            {project.startDate && (
              <>
                {' '}
                · {formatDate(project.startDate)}
                {project.endDate && project.endDate !== project.startDate && (
                  <> - {formatDate(project.endDate)}</>
                )}
              </>
            )}
          </div>
        </div>

        {/* Actions Menu */}
        <div className="project-actions" onBlur={handleBlur}>
          <button
            className="project-menu-btn"
            onClick={handleMenuClick}
            title="Project options"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="currentColor"
            >
              <circle cx="8" cy="3" r="1.5" />
              <circle cx="8" cy="8" r="1.5" />
              <circle cx="8" cy="13" r="1.5" />
            </svg>
          </button>

          {showMenu && (
            <div className="project-menu">
              <button onClick={handleAddEvent}>
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 14 14"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M7 1v12M1 7h12" />
                </svg>
                Add Event
              </button>
              <button onClick={handleEdit}>
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <path d="M11.5 2.5L13.5 4.5M2 14L2.5 11.5L11 3L13 5L4.5 13.5L2 14Z" />
                </svg>
                Edit Project
              </button>
              <button onClick={handleDelete} className="danger">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <path d="M3 4H13M6 4V3C6 2.44772 6.44772 2 7 2H9C9.55228 2 10 2.44772 10 3V4M12 4V13C12 13.5523 11.5523 14 11 14H5C4.44772 14 4 13.5523 4 13V4H12Z" />
                </svg>
                Delete Project
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Expanded Events List */}
      {isExpanded && project.events && project.events.length > 0 && (
        <div className="project-events">
          {project.events.map((event) => (
            <Link
              key={event.id}
              href={`/dashboard/events/${event.id}/canvas`}
              className="project-event-item"
            >
              {/* Event Date Icon */}
              <div className="project-event-date">
                {(() => {
                  const dateParts = getDateParts(event.date ?? null);
                  return dateParts ? (
                    <>
                      <span className="month">{dateParts.month}</span>
                      <span className="day">{dateParts.day}</span>
                    </>
                  ) : (
                    <>
                      <span className="month">TBD</span>
                      <span className="day">—</span>
                    </>
                  );
                })()}
              </div>

              {/* Event Info */}
              <div className="project-event-info">
                <span className="project-event-name">{event.name}</span>
                <span className="project-event-stats">
                  {event.confirmedCount || 0} confirmed · {event.pendingCount || 0}{' '}
                  pending
                </span>
              </div>

              {/* Arrow */}
              <svg
                className="project-event-arrow"
                width="14"
                height="14"
                viewBox="0 0 14 14"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M5 3l4 4-4 4" />
              </svg>
            </Link>
          ))}

          {/* Add Event Button */}
          <button
            className="project-add-event-btn"
            onClick={handleAddEvent}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M7 1v12M1 7h12" />
            </svg>
            Add Event to Project
          </button>
        </div>
      )}

      {/* Empty State */}
      {isExpanded && (!project.events || project.events.length === 0) && (
        <div className="project-events-empty">
          <p>No events in this project yet.</p>
          <button
            className="project-add-event-btn"
            onClick={handleAddEvent}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M7 1v12M1 7h12" />
            </svg>
            Add First Event
          </button>
        </div>
      )}
    </div>
  );
}
