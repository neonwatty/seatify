# SeatOptima UI Polish & Feature Enhancement Master Plan

## Overview

This plan focuses on transforming SeatOptima from an MVP into a polished, professional-grade seating arrangement tool that meets the needs of wedding planners, event coordinators, and party planners. Based on industry research and competitor analysis, we've identified critical UI improvements and missing features.

**Last Updated**: December 9, 2025

---

## Phase 1: Canvas & Floor Plan Enhancements (High Priority)

### 1.1 Snap-to-Grid & Alignment Tools ✅ COMPLETED
**Why**: Professional planners need precision when arranging tables. Industry-standard tools offer snap-to-grid and alignment guides.

**Implemented**:
- ✅ Toggleable grid overlay on canvas (20px, 40px, 80px options)
- ✅ Snap-to-grid when dragging tables
- ✅ Alignment guides that appear when tables align
- ✅ GridControls component with toggle buttons
- ✅ E2E tests in `e2e/grid-controls.spec.ts`

**Files**:
- `src/components/GridControls.tsx` / `.css`
- `src/components/Canvas.tsx` - Grid rendering and snap logic
- `src/store/useStore.ts` - `canvasPrefs` state

### 1.2 Additional Table Types & Venue Elements ✅ COMPLETED
**Why**: Real events use serpentine tables, half-rounds, and need to show dance floors, stages, and other venue elements.

**Implemented**:
- ✅ Table shapes: `round`, `rectangle`, `square`, `oval`, `half-round`, `serpentine`
- ✅ Venue elements: Dance Floor, Stage, DJ Booth, Bar, Buffet, Entrance, Exit, Photo Booth
- ✅ VenueElement component with styling

**Files**:
- `src/types/index.ts` - `TableShape`, `VenueElementType`, `VenueElement` types
- `src/components/Table.tsx` - All shape rendering
- `src/components/VenueElement.tsx` / `.css`

### 1.3 Canvas Search & Quick Navigation ✅ COMPLETED
**Why**: Large events (200+ guests) need quick ways to find specific guests or tables on the canvas.

**Implemented**:
- ✅ Search overlay (Cmd/Ctrl+F) highlighting matching guests/tables
- ✅ Minimap in corner for large floor plans
- ✅ Zoom-to-fit functionality

**Files**:
- `src/components/CanvasSearch.tsx` / `.css`
- `src/components/CanvasMinimap.tsx` / `.css`

### 1.4 Undo/Redo Functionality ✅ COMPLETED
**Why**: Users need to safely experiment with arrangements without fear of losing work.

**Implemented**:
- ✅ History stack in Zustand store (50 action limit)
- ✅ Undo (Cmd+Z) and Redo (Cmd+Shift+Z) keyboard shortcuts
- ✅ Tracks: table moves, guest assignments, additions, deletions

**Files**:
- `src/store/useStore.ts` - `history`, `historyIndex`, `undo()`, `redo()`, `pushHistory()`

---

## Phase 2: Visual Feedback & Constraint Visualization (High Priority)

### 2.1 Constraint Violation Warnings ✅ COMPLETED
**Why**: Planners need immediate feedback when seating violates constraints (e.g., feuding guests at same table).

**Implemented**:
- ✅ Warning indicators on tables with violations
- ✅ `ConstraintViolation` type in store
- ✅ Constraint validation helpers

**Files**:
- `src/components/Table.tsx` - `has-violations`, `has-required-violations` classes
- `src/types/index.ts` - `ConstraintViolation` interface
- `src/store/useStore.ts` - Constraint validation

### 2.2 Enhanced Table Capacity Indicators ✅ COMPLETED
**Why**: Instant visual feedback on table fullness is essential for quick planning.

**Implemented**:
- ✅ Capacity status classes: `available`, `nearly-full`, `full`, `over`
- ✅ Color coding via CSS (green/yellow/red/purple)
- ✅ Capacity count display on tables

**Files**:
- `src/components/Table.tsx` - `capacityStatus`, `getCapacityStatus()`
- `src/components/Table.css` - `.capacity-available`, `.capacity-nearly-full`, etc.

### 2.3 Guest Group Color Coding ✅ COMPLETED
**Why**: Planners need to quickly see which groups (families, departments) are seated together.

**Implemented**:
- ✅ Auto-assign colors to guest groups
- ✅ Colored borders on guest chips
- ✅ GroupLegend component with filter/toggle
- ✅ 20 distinct group colors
- ✅ E2E tests in `e2e/group-legend.spec.ts`

**Files**:
- `src/components/groupColors.ts` - Color palette
- `src/components/GroupLegend.tsx` / `.css`
- `src/components/GuestChip.tsx` / `.css`

### 2.4 Dietary & Accessibility Visual Markers ✅ COMPLETED
**Why**: Caterers and venue staff need to quickly identify special requirements at each table.

**Implemented**:
- ✅ Dietary restriction icons on guest chips
- ✅ Accessibility icons for mobility needs
- ✅ Visual markers in UI
- ✅ E2E tests in `e2e/dietary-markers.spec.ts`

**Files**:
- `src/components/GuestChip.tsx` - Dietary/accessibility icons
- `src/components/GuestForm.tsx` - Dietary restriction input

---

## Phase 3: Mobile & Touch Optimization (Medium Priority) ✅ COMPLETED

### 3.1 Touch-Friendly Canvas Interactions ✅ COMPLETED
**Why**: Event planners often work on tablets at venues. Current drag-and-drop needs touch optimization.

**Implemented**:
- ✅ Pinch-to-zoom gesture using `@use-gesture/react`
- ✅ Two-finger pan gesture
- ✅ Single-finger pan on empty canvas
- ✅ Touch targets 44px minimum
- ✅ Long-press (200ms) activation for drag-and-drop via TouchSensor
- ✅ E2E tests in `e2e/mobile-touch.spec.ts`

**Files**:
- `src/components/Canvas.tsx` - `useGesture` for pinch/pan
- `src/components/MainToolbar.tsx` - Touch-friendly sizing
- `src/hooks/useResponsive.ts` - Breakpoint/touch detection

### 3.2 Responsive Sidebar Collapse ✅ COMPLETED
**Why**: The sidebar takes too much space on mobile, obscuring the canvas.

**Implemented**:
- ✅ Slide-out drawer mode for mobile
- ✅ Backdrop overlay when open
- ✅ Responsive breakpoints (768px, 480px)

**Files**:
- `src/components/Sidebar.tsx` / `.css` - Mobile drawer, backdrop
- `src/App.tsx` - Mobile layout logic

### 3.3 Mobile-Optimized Table Management 🔲 NOT STARTED
**Why**: Current table property panel is cramped on mobile.

**To Implement**:
- Full-screen table editor modal on mobile
- Swipe between tables for quick editing
- Large, thumb-friendly controls
- Quick actions row (delete, duplicate, rotate)

**Files to modify**:
- `src/components/TablePropertiesPanel.tsx` - Mobile mode
- `src/components/TablePropertiesPanel.css` - Mobile styles

---

## Phase 4: Export & Sharing Enhancements (Medium Priority) 🔲 NOT STARTED

### 4.1 PDF Export with Templates 🔲 NOT STARTED
**Why**: Planners need professional printable documents for clients, vendors, and day-of coordination.

**To Implement**:
- Generate styled PDFs with selectable templates (Elegant, Modern, Classic)
- Export types:
  - Full floor plan with legend
  - Table cards (one page per table with guest list)
  - Place cards (printable name cards)
  - Dietary summary report
  - Master guest list with assignments
- Include event branding (name, date, logo placeholder)

**Files to add**:
- `src/components/PDFExport.tsx` - PDF generation logic
- `src/components/PDFTemplates/` - Template components
- Use html2pdf.js or jsPDF library

### 4.2 QR Code Guest Lookup 🔲 NOT STARTED
**Why**: Modern events use QR codes so guests can scan and find their seat instantly.

**To Implement**:
- Generate unique QR code for event
- Guests scan → enter name → see their table assignment
- Optional: display nearby guests they know
- Mobile-optimized lookup page at `#/find-seat`

**Files to add**:
- `src/components/GuestLookupPage.tsx` - Public seat finder
- Use qrcode.react library for generation
- `src/components/SurveyBuilderView.tsx` - Add QR code display

### 4.3 Shareable View Links 🔲 NOT STARTED
**Why**: Planners need to share seating charts with clients, venue coordinators, and team members.

**To Implement**:
- Generate read-only shareable link
- Viewer can see floor plan and assignments but not edit
- Optional password protection
- Expiration date setting

**Files to modify**:
- `src/components/Header.tsx` - Share button
- Add new `src/components/ShareModal.tsx`
- Consider localStorage-based sharing or simple base64 encoding of event data

---

## Phase 5: Advanced Features (Lower Priority)

### 5.1 Auto-Seat Algorithm Improvements 🔲 NOT STARTED
**Why**: The current optimization could be smarter about constraint satisfaction and guest preferences.

**To Implement**:
- Weight factors: relationship strength, constraint priority, group cohesion
- Preview mode showing proposed vs current arrangement
- "Optimize Selection" - only optimize selected tables/guests
- Score breakdown showing why each assignment was made

**Files to modify**:
- `src/components/OptimizeView.tsx` - Enhanced results display
- `src/store/useStore.ts` - Improved algorithm

### 5.2 Keyboard Shortcuts & Accessibility ✅ COMPLETED
**Why**: Power users expect keyboard navigation; accessibility is essential for professional software.

**Implemented**:
- ✅ Keyboard shortcuts: Delete, Cmd+D duplicate, Arrow keys, Esc deselect, Cmd+F search
- ✅ ARIA labels on interactive elements
- ✅ Focus indicators
- ✅ E2E tests in `e2e/keyboard-shortcuts.spec.ts`

**Files**:
- `src/App.tsx` - Global keyboard listener
- `src/components/CanvasSearch.tsx` - Cmd+F search

### 5.3 Multi-Event Management 🔲 NOT STARTED
**Why**: Professional planners manage multiple events simultaneously.

**To Implement**:
- Event list/dashboard showing all events
- Quick switch between events
- Duplicate event as template
- Archive completed events

**Files to modify**:
- `src/store/useStore.ts` - Multi-event state
- Add new `src/components/EventList.tsx`
- `src/components/Header.tsx` - Event switcher dropdown

### 5.4 Real-Time RSVP Integration 🔲 NOT STARTED
**Why**: Automatically update seating when RSVPs change reduces manual work.

**To Implement**:
- Webhook endpoint for external RSVP systems
- Status change notifications
- Auto-adjust seating when guests decline
- Waitlist management for over-capacity events

---

## Phase 6: UI Polish & Micro-Interactions 🔲 NOT STARTED

### 6.1 Animation Refinements
- Smooth spring animations when dragging tables/guests
- Subtle hover states on all interactive elements
- Success celebration animation when optimization completes
- Loading skeleton states for async operations

### 6.2 Empty States & Onboarding
- Illustrated empty states for each view
- First-time user tutorial overlay
- Contextual tips that appear as user explores
- "Getting Started" checklist in dashboard

### 6.3 Consistent Iconography
- Audit all icons for consistency (use single icon library)
- Add meaningful icons to all actions
- Ensure icons have text labels for accessibility

### 6.4 Dark Mode Polish
- Audit all components for dark mode contrast
- Ensure relationship colors are visible in both modes
- Test print preview in dark mode

---

## Implementation Priority Summary

### ✅ COMPLETED - Must Have (Phase 1-2)
1. ✅ Snap-to-grid and alignment tools
2. ✅ Constraint violation warnings
3. ✅ Undo/redo functionality
4. ✅ Enhanced capacity indicators
5. ✅ Guest group color coding
6. ✅ Additional table types

### ✅ MOSTLY COMPLETED - Should Have (Phase 3-4)
7. ✅ Touch-friendly mobile experience
8. 🔲 PDF export with templates
9. 🔲 QR code guest lookup
10. ✅ Keyboard shortcuts

### 🔲 NOT STARTED - Nice to Have (Phase 5-6)
11. 🔲 Multi-event management
12. 🔲 Advanced auto-seating
13. 🔲 Real-time collaboration
14. 🔲 Micro-interaction polish

---

## Technical Approach

### New Dependencies to Add
```json
{
  "jspdf": "^2.5.1",
  "html2canvas": "^1.4.1",
  "qrcode.react": "^3.1.0"
}
```

### File Structure for New Components
```
src/components/
├── canvas/
│   ├── CanvasToolbar.tsx
│   ├── CanvasMinimap.tsx
│   ├── GridOverlay.tsx
│   └── AlignmentGuides.tsx
├── elements/
│   ├── VenueElement.tsx
│   └── ElementLibrary.tsx
├── export/
│   ├── PDFExport.tsx
│   └── templates/
├── shared/
│   ├── ConstraintViolationsPanel.tsx
│   └── KeyboardShortcutsHelp.tsx
└── mobile/
    └── MobileDrawer.tsx
```

### State Management Additions
- History stack for undo/redo
- Computed constraint violations
- UI preferences (grid, snap, theme)
- Active group filter

---

## Success Metrics

After implementation, the application should:
- Allow precise table placement with visual alignment guides
- Show real-time constraint violations before they become problems
- Support professional PDF exports for client presentations
- Work seamlessly on tablets and mobile devices
- Provide keyboard-first workflow for power users
- Handle events with 500+ guests smoothly

---

## Sources & Research

Industry research was conducted using:
- [Planning Pod Event Seating Software](https://www.planningpod.com/seating-arrangement-chart-software.cfm)
- [Perfect Table Plan](https://www.perfecttableplan.com/)
- [Social Tables Diagramming Platform](https://www.socialtables.com/)
- [SeatPlanning App](https://www.seatplanning.com/blog/seating-chart-app-tour)
- [zkipster Seating Chart App](https://www.zkipster.com/seating-chart-app)
- [Canapii Seating Solutions](https://canapii.com/seating/)
