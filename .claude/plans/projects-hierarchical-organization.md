# Feature: Projects (Hierarchical Event Organization)

> Enable event planners to organize multiple related events under a parent "Project" for multi-day conferences, wedding weekends, and event series.

## Summary

Projects introduce a hierarchical organization layer above Events, allowing planners to group related events together. A corporate event planner organizing a 3-day conference can create a Project containing separate events for each day's activities, with guests RSVPing per-event while sharing a common guest list and relationship data across all events.

The key insight is that guest *relationships* persist at the project level (John and Jane should always sit together), while *attendance* varies per event (Jane might skip the Day 2 workshop). This simplifies data management while giving planners the flexibility to handle partial attendance.

Projects appear as expandable folders in the existing dashboard, keeping the UX familiar while adding powerful organizational capabilities.

## Requirements

### Must Have
- [ ] Create new Project entity with name, description, and date range
- [ ] Projects contain a master guest list with relationships defined at project level
- [ ] Events within a project inherit the master guest list
- [ ] Per-event RSVP tracking (guests can RSVP to some events but not others)
- [ ] Event guest lists filter to only show guests with "Yes" or "Pending" RSVP for that event
- [ ] Seating data (who is seated where) is per-event, not shared
- [ ] Dashboard shows Projects as expandable folders inline with standalone events
- [ ] Move existing standalone events into a Project
- [ ] Each event in a project counts against billing limits separately
- [ ] Duplicate detection with manual review UI when merging events

### Should Have
- [ ] Create new events directly inside a Project (inherits master guest list)
- [ ] Project summary view showing all events with dates and guest counts
- [ ] Bulk RSVP import at project level (populates master list)
- [ ] Quick navigation between events in a project

### Out of Scope
- Project templates (pre-built structures for common event types)
- Cross-project guest sharing (guests don't persist between different projects)
- Project-level aggregate analytics (no combined stats across events)
- Per-event relationship overrides (relationships are project-level only)

## Technical Design

### Architecture

Projects sit above Events in the data hierarchy:

```
User
└── Project (optional)
    ├── Master Guest List (with relationships)
    └── Events
        ├── Event 1 (filtered guest list, own seating)
        ├── Event 2 (filtered guest list, own seating)
        └── Event 3 (filtered guest list, own seating)

User
└── Standalone Event (no project, works as today)
```

**Key data flow:**
1. User creates Project → defines master guest list with relationships
2. User creates Event inside Project → inherits guests with "Pending" RSVP
3. Guests RSVP per-event → updates per-event RSVP status
4. Event canvas shows only guests with Yes/Pending RSVP for that event
5. AI optimization uses project-level relationships when seating

### Key Components

**New Components:**
- `ProjectCard` - Expandable folder in dashboard showing project with nested events
- `ProjectCreateModal` - Create new project with name, description, date range
- `ProjectSettingsModal` - Edit project details, manage master guest list
- `MasterGuestListPanel` - Manage project-level guests and relationships
- `DuplicateReviewModal` - Review and resolve duplicate guests when merging
- `ProjectBreadcrumb` - Navigation showing Project > Event hierarchy

**Modified Components:**
- `EventListClient` - Support expandable project folders
- `EventCreateModal` - Option to create inside a project or standalone
- `GuestListPanel` - Show per-event RSVP status, link to master list
- `useStore` - Add project state management

### Data Model

**New Tables:**

```sql
-- Projects table
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Project master guests (guests at project level)
CREATE TABLE project_guests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  notes TEXT,
  dietary_restrictions TEXT,
  accessibility_needs TEXT,
  group_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, email) WHERE email IS NOT NULL
);

-- Project-level relationships (apply to all events)
CREATE TABLE project_guest_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  guest_id UUID NOT NULL REFERENCES project_guests(id) ON DELETE CASCADE,
  related_guest_id UUID NOT NULL REFERENCES project_guests(id) ON DELETE CASCADE,
  relationship_type TEXT NOT NULL CHECK (relationship_type IN ('partner', 'prefer', 'avoid')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(guest_id, related_guest_id)
);

-- Link events to projects (nullable for standalone events)
ALTER TABLE events ADD COLUMN project_id UUID REFERENCES projects(id) ON DELETE SET NULL;

-- Per-event guest attendance (derived from project guests)
CREATE TABLE event_guest_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  project_guest_id UUID NOT NULL REFERENCES project_guests(id) ON DELETE CASCADE,
  rsvp_status TEXT NOT NULL DEFAULT 'pending' CHECK (rsvp_status IN ('pending', 'confirmed', 'declined', 'maybe')),
  rsvp_token TEXT UNIQUE,
  rsvp_responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, project_guest_id)
);
```

**Migration Strategy:**
- Existing events remain standalone (project_id = NULL)
- Existing guests table continues to work for standalone events
- When event moves to project, guests are migrated to project_guests table
- event_guest_attendance records created for the moved event

### State Shape

```typescript
interface Project {
  id: string;
  name: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  createdAt: string;
  updatedAt: string;
}

interface ProjectGuest {
  id: string;
  projectId: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  notes?: string;
  dietaryRestrictions?: string;
  accessibilityNeeds?: string;
  groupName?: string;
}

interface ProjectGuestRelationship {
  id: string;
  projectId: string;
  guestId: string;
  relatedGuestId: string;
  relationshipType: 'partner' | 'prefer' | 'avoid';
}

interface EventGuestAttendance {
  id: string;
  eventId: string;
  projectGuestId: string;
  rsvpStatus: 'pending' | 'confirmed' | 'declined' | 'maybe';
  rsvpToken?: string;
  rsvpRespondedAt?: string;
}
```

## Implementation Plan

### Phase 1: Database & Core Types
1. Create database migration with new tables (projects, project_guests, project_guest_relationships, event_guest_attendance)
2. Add project_id column to events table
3. Create TypeScript types for Project, ProjectGuest, relationships
4. Add RLS policies for all new tables
5. Create Supabase functions for common operations

### Phase 2: Project CRUD
1. Create `ProjectCard` component for dashboard
2. Create `ProjectCreateModal` with name, description, dates
3. Create `ProjectSettingsModal` for editing project details
4. Update `EventListClient` to display projects as expandable folders
5. Add project state to Zustand store
6. Implement project API routes (create, update, delete, list)

### Phase 3: Master Guest List
1. Create `MasterGuestListPanel` component
2. Implement bulk guest import at project level
3. Add relationship management at project level
4. Create guest sync logic when events are created in project
5. Update RSVP system to work with event_guest_attendance

### Phase 4: Event-Project Integration
1. Update `EventCreateModal` with "Create in Project" option
2. Implement guest list filtering by RSVP status per event
3. Update canvas to use project relationships for optimization
4. Add project breadcrumb navigation on event pages
5. Quick navigation between events in same project

### Phase 5: Move Events to Projects
1. Create move event flow (select target project or create new)
2. Implement `DuplicateReviewModal` for guest conflicts
3. Build guest migration logic (event guests → project guests)
4. Handle relationship merging
5. Create event_guest_attendance records for moved event

### Phase 6: Polish & Migration Safety
1. Add loading states and error handling throughout
2. Create migration guide/onboarding for existing users
3. Add analytics tracking for project usage
4. Performance testing with large projects (50+ guests, 10+ events)
5. Documentation and help content

## Edge Cases & Error Handling

| Scenario | Handling |
|----------|----------|
| Delete project with events | Confirm dialog listing events. Events become standalone or delete all. |
| Move event with guest conflicts | Show DuplicateReviewModal: merge, keep separate, or skip each conflict |
| Guest RSVPs then project deleted | Event becomes standalone, attendance records orphaned (cleanup job) |
| Same email in master list twice | Enforce unique constraint on (project_id, email) where email not null |
| Event removed from project | Event becomes standalone, keeps its guests (copied from project) |
| RSVP link for project event | Links to specific event's RSVP, updates event_guest_attendance |
| Optimization on project event | Uses project-level relationships, event-level attendance filter |

## Testing Strategy

- **Unit tests**: Project CRUD operations, guest migration logic, duplicate detection
- **Integration tests**: Event-project lifecycle, RSVP flow with attendance tracking
- **E2E tests**: Create project → add events → RSVP → optimize → move events
- **Manual testing**: Large projects (stress test), migration from standalone events

## Open Questions

- [ ] Should we show a "Project" label/badge on events in the dashboard to distinguish them?
- [ ] How do we handle RSVP reminder emails for project events? (mention the project context?)
- [ ] Should project owners see a combined view of all event seating charts?

## Design Decisions Log

| Decision | Rationale | Alternatives Considered |
|----------|-----------|------------------------|
| Project-level relationships only | Simplifies mental model, most use cases don't need per-event overrides | Per-event overrides with inheritance |
| Per-event RSVP (not project-level) | Multi-day conferences have partial attendance | Single project-wide RSVP |
| Filter guests by RSVP status | Cleaner canvas, no confusion about who's attending | Show all guests with status badge |
| Events count against limits individually | Fair pricing, projects are organizational only | Project = 1 event for billing |
| Expandable folders in dashboard | Familiar UX, no major navigation changes | Separate Projects tab |
| Manual duplicate review | User control over data merging | Auto-merge by email silently |
