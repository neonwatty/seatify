# Implementation Plan: Load Demo Data Button

## Executive Summary

This plan details how to add a "Load Demo Data" (or "Try Demo") button that allows users to instantly see Seatify's full functionality with pre-populated data. The feature will appear in multiple strategic locations to maximize discoverability while maintaining a clean UI.

---

## 1. Current State Analysis

### Existing Demo Infrastructure

The codebase already has robust demo data support:

**Demo Data Location:** `src/data/demoData.ts`
- Contains `demoTables` (3 tables), `demoGuests` (10 guests), `demoConstraints`, `demoSurveyQuestions`
- Simple party-type event with basic guest relationships

**Richer Default Event:** `src/store/useStore.ts` (lines 298-533)
- The `createDefaultEvent()` function contains a MORE comprehensive demo:
  - 3 tables with varied shapes (round, rectangle, square)
  - 18 guests with detailed profiles (companies, job titles, industries, interests)
  - Rich relationship data (partners, family, friends, colleagues, avoid)
  - Partners deliberately separated to showcase optimization
  - Survey questions included

**Load Demo Action:** `loadDemoData()` in store (lines 1850-1871)
- Currently loads the simpler `demoData.ts` content
- Replaces current event with demo event

### Key Observations
1. The `createDefaultEvent()` data is better suited for showcasing the optimizer than `demoData.ts`
2. No current UI exposes `loadDemoData()` to users
3. The existing demo data structure is ready to use

---

## 2. Recommended Button Placement Strategy

### 2.1 Landing Page (Primary Location)

**File:** `src/components/LandingPage.tsx`

**Placement:** Below the primary CTA button in the hero section (after line 175)

**Rationale:**
- First-time visitors can immediately see a working example
- Reduces friction for users who want to evaluate before committing
- Complements the existing "Start Planning Free" primary CTA

**Design:**
```
[Start Planning Free]          <-- Primary CTA (existing)
[Try Demo Event]               <-- Secondary CTA (new)
```

**Styling:** Use the existing `.secondary-cta-button` style from `LandingPage.css` (lines 772-794):
- Transparent background with primary color border
- Matches existing design language
- Clear visual hierarchy (secondary to main CTA)

### 2.2 Events List - Empty State

**File:** `src/components/EventListView.tsx`

**Placement:** In the empty state section (around line 160)

**Current empty state shows:**
```
[Create Your First Event]
```

**Proposed change:**
```
[Create Your First Event]      <-- Primary (existing)
or
[Try a Demo Event]             <-- New secondary option
```

**Rationale:**
- Users who arrive at an empty events list may want to explore before creating
- Low-commitment way to understand the product
- The "or" text pattern is common in UX for alternative actions

### 2.3 Events List - Card Grid (When Events Exist)

**File:** `src/components/EventListView.tsx`

**Placement:** Add a subtle "Try demo" link near the "Create Event" button, but less prominent.

---

## 3. User Flow Design

### 3.1 First-Time Visitor Flow (Landing Page)

```
Landing Page
     |
     v
[Try Demo Event] clicked
     |
     v
Create new event with demo data
     |
     v
Navigate to /events/{demoEventId}/canvas
     |
     v
Optionally: Show quick tour highlighting key features
```

### 3.2 Returning User Flow (Events List)

```
Events List
     |
     v
[Try Demo Event] clicked
     |
     v
Create new demo event (separate from user's events)
     |
     v
Navigate to /events/{demoEventId}/canvas
```

---

## 4. Implementation Details

### 4.1 New Store Action: `createDemoEvent()`

**File:** `src/store/useStore.ts`

**Purpose:** Create a dedicated demo event instead of replacing the current event

**Implementation approach:**
1. Add new action `createDemoEvent: () => string` to the store interface
2. Implement similarly to `createEvent()` but populate with `createDefaultEvent()` data
3. Return the new event ID for navigation
4. Mark the event with a naming convention ("Demo Event")

**Why not use `loadDemoData()`:**
- `loadDemoData()` replaces the current event, which is destructive
- Users might have existing work they don't want to lose
- Creating a separate demo event is non-destructive

### 4.2 Analytics Tracking

**File:** `src/utils/analytics.ts`

Add new tracking function:
```typescript
export function trackDemoLoaded(source: 'landing' | 'events_empty' | 'events_list'): void {
  trackEvent('demo_loaded', {
    event_category: 'engagement',
    source: source,
  });
}
```

### 4.3 LandingPage.tsx Changes

**Location:** After line 175 (after the main CTA button)

Add handler and button for demo event creation with navigation to canvas.

### 4.4 EventListView.tsx Changes

**Location 1 - Empty State:** After line 159
- Add "or" divider and demo link button

**Location 2 - Header (when events exist):** In header-actions section
- Add subtle demo link

---

## 5. Button Styling

### 5.1 Landing Page Demo Button

Create a new style that is clearly secondary to the main CTA:
- Transparent background
- Border with primary color
- Smaller font size
- Hover effect with background fill

### 5.2 Events List Demo Link

- Dashed border style
- Smaller padding
- Subtle text color
- Solid border on hover

---

## 6. Mobile Considerations

### 6.1 Landing Page Mobile

- Demo button should stack below main CTA on mobile
- Full width on screens < 480px
- Reduced padding for smaller screens

### 6.2 Events List Mobile

- Demo link in header collapses well with existing responsive styles
- Empty state demo button should be full-width on mobile
- Touch targets should be at least 44px

---

## 7. Edge Cases

### 7.1 User Already Has a Demo Event

**Approach:** Allow multiple demo events
- Simplest implementation
- Users can delete demo events like any other event

### 7.2 Event Limit Reached (MAX_EVENTS = 10)

- Check `canCreateEvent()` before creating demo
- If at limit, show toast: "You've reached the event limit. Delete an event to try the demo."

### 7.3 Demo Event Confusion

Risk: Users might not realize they're in a demo event.

Mitigations:
1. Clear naming: "Demo Event" as the event name
2. The event can be easily deleted or renamed

---

## 8. Post-Click Experience Options

### Option A: Direct to Canvas (Recommended)

Navigate directly to `/events/{demoEventId}/canvas`
- Immediate value demonstration
- User sees tables and guests right away
- Minimal friction

### Option B: Canvas + Tour

Navigate to canvas AND trigger a guided tour
- Leverages existing tour system

---

## 9. Implementation Order

1. **Add `createDemoEvent()` store action** - Core functionality
2. **Add analytics tracking** - Measure adoption
3. **Add Landing Page button** - Primary discovery point
4. **Add Events List empty state button** - Secondary discovery
5. **Add Events List header link** - Tertiary discovery
6. **Add CSS styling** - Polish
7. **Add mobile responsiveness** - Complete experience
8. **Test edge cases** - Robustness

---

## 10. Files to Modify

| File | Changes |
|------|---------|
| `src/store/useStore.ts` | Add `createDemoEvent()` action |
| `src/utils/analytics.ts` | Add `trackDemoLoaded()` function |
| `src/components/LandingPage.tsx` | Add demo button in hero section |
| `src/components/LandingPage.css` | Add demo button styles |
| `src/components/EventListView.tsx` | Add demo options in empty state and header |
| `src/components/EventListView.css` | Add demo link styles |

---

## 11. Testing Considerations

### E2E Tests to Add

**File:** New file `e2e/demo-event.spec.ts`

Test cases:
1. Landing page demo button creates event and navigates to canvas
2. Empty events list demo button works
3. Demo event has expected tables and guests
4. Demo event can be deleted
5. Multiple demo events can coexist
6. Demo button works when at event limit (shows error gracefully)

### Manual Testing Checklist
- [ ] Demo button visible on landing page (desktop)
- [ ] Demo button visible on landing page (mobile)
- [ ] Demo button in empty events list
- [ ] Demo link in events list header (when events exist)
- [ ] Demo event contains expected data
- [ ] Navigation to canvas works
- [ ] Analytics events fire correctly
- [ ] Dark mode styling looks good
- [ ] Keyboard accessibility (button focusable, Enter/Space activates)
