'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import type { ProjectWithSummary } from '@/types';
import './ProjectBreadcrumb.css';

interface ProjectBreadcrumbProps {
  project: ProjectWithSummary;
  currentEventId: string;
  currentEventName: string;
}

export function ProjectBreadcrumb({
  project,
  currentEventId,
  currentEventName,
}: ProjectBreadcrumbProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown]);

  // Close on escape
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setShowDropdown(false);
      }
    }

    if (showDropdown) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showDropdown]);

  const otherEvents = project.events?.filter((e) => e.id !== currentEventId) || [];

  return (
    <nav className="project-breadcrumb" aria-label="Project navigation">
      {/* Project Link */}
      <Link href="/dashboard" className="breadcrumb-project">
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
        <span className="breadcrumb-project-name">{project.name}</span>
      </Link>

      {/* Separator */}
      <span className="breadcrumb-separator">
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </span>

      {/* Current Event with Dropdown */}
      <div className="breadcrumb-event-container" ref={dropdownRef}>
        <button
          className={`breadcrumb-event ${showDropdown ? 'active' : ''}`}
          onClick={() => setShowDropdown(!showDropdown)}
          aria-expanded={showDropdown}
          aria-haspopup="listbox"
        >
          <span className="breadcrumb-event-name">{currentEventName}</span>
          {otherEvents.length > 0 && (
            <svg
              className={`breadcrumb-dropdown-icon ${showDropdown ? 'open' : ''}`}
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          )}
        </button>

        {/* Dropdown */}
        {showDropdown && otherEvents.length > 0 && (
          <div className="breadcrumb-dropdown" role="listbox">
            <div className="dropdown-header">Switch Event</div>
            {otherEvents.map((event) => (
              <Link
                key={event.id}
                href={`/dashboard/events/${event.id}/canvas`}
                className="dropdown-item"
                role="option"
                onClick={() => setShowDropdown(false)}
              >
                <span className="dropdown-item-name">{event.name}</span>
                {event.date && (
                  <span className="dropdown-item-date">{formatShortDate(event.date)}</span>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Event Count Badge */}
      {project.events && project.events.length > 1 && (
        <span className="breadcrumb-badge" title={`${project.events.length} events in this project`}>
          {project.events.length}
        </span>
      )}
    </nav>
  );
}

function formatShortDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return '';
  }
}
