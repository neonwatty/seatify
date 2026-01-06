# Implementation Plan: Auto-Starting Quick Start Tour for New Users

## Executive Summary

The Quick Start tour **already auto-starts for new users** in the current implementation. The existing code in `src/router/EventLayout.tsx` (lines 147-156) triggers the tour when `hasCompletedOnboarding` is `false`. However, the current implementation has some issues and opportunities for improvement that this plan addresses.

---

## Current State Analysis

### Existing Auto-Start Implementation

**Location**: `src/router/EventLayout.tsx` (lines 147-156)

```typescript
// Auto-show Quick Start tour for first-time users
useEffect(() => {
  if (!hasCompletedOnboarding) {
    const timer = setTimeout(() => {
      setActiveTour('quick-start');
      setShowOnboarding(true);
    }, 500);
    return () => clearTimeout(timer);
  }
}, [hasCompletedOnboarding, setActiveTour]);
```

### State Management

**Location**: `src/store/useStore.ts`

- `hasCompletedOnboarding: boolean` - Tracks if user completed/dismissed ANY tour
- `completedTours: Set<TourId>` - Tracks which specific tours are completed
- `activeTourId: TourId | null` - Current active tour
- State is persisted to localStorage

### Tour System Components

1. **Tour Registry**: `src/data/tourRegistry.ts`
   - Defines all tours including `quick-start`
   - Quick Start: 6 steps, starts on canvas view, requires demo data

2. **Tour Steps**: `src/data/onboardingSteps.ts`
   - `QUICK_START_STEPS` array with welcome, canvas, add-table, sidebar, views, and complete steps

3. **OnboardingWizard**: `src/components/OnboardingWizard.tsx`
   - Handles tour display, navigation, spotlight highlighting
   - Supports mobile minimize/expand via swipe
   - Uses portal rendering

4. **Learn Menu**: `src/components/Header.tsx`
   - Allows users to restart tours
   - Shows completion checkmarks

---

## Issues with Current Implementation

### Issue 1: Tour Triggers on Event List, Not Canvas

The tour auto-starts in `EventLayout` which wraps both `/events` (list) and `/events/:eventId/*` routes. When a new user clicks "Start Planning Free" on the landing page, they arrive at `/events` (event list view), but the Quick Start tour expects to be on the canvas view (`startingView: 'canvas'`).

**Impact**: Tour may show mismatched content or navigation issues.

### Issue 2: No Context Check for Current Route

The auto-start doesn't verify the user is in an appropriate location (inside an event) before starting the tour.

### Issue 3: Conflict with Pending Tour from Landing Page

The landing page can set a `sessionStorage.pendingTour` for feature tours. The auto-start effect runs after the pending tour effect, potentially conflicting.

### Issue 4: Missing Analytics for Auto-Start vs Manual Start

No distinction in analytics between tours that auto-started vs user-initiated.

---

## Recommended Implementation Plan

### Phase 1: Improve Trigger Conditions

**Goal**: Only auto-start the tour when user is ready (inside an event, on canvas view)

#### Step 1.1: Add Route-Aware Trigger Check

**File**: `src/router/EventLayout.tsx`

Modify the auto-start effect to:
1. Check if there's already a pending tour in sessionStorage (don't override)
2. Verify user is inside an event (has `eventId` in params)
3. Wait until user is on canvas view for the first time
4. Add a slightly longer delay (800-1000ms) to let the canvas fully render

### Phase 2: Improve State Tracking

**Goal**: Separate "has seen tour" from "has completed onboarding" for more granular control

#### Step 2.1: Add Dedicated State for Quick Start

**File**: `src/store/useStore.ts`

Add new state property:
```typescript
hasSeenQuickStartTour: boolean;  // NEW
```

This allows:
- Quick Start tour to show once and never again
- Other tours to still be available
- `hasCompletedOnboarding` to remain for broader onboarding state

### Phase 3: Improve Mobile Experience

**Goal**: Ensure tour works well on mobile first-time experience

#### Step 3.1: Reduce Tour Step Count on Mobile

Current mobile handling already filters out the sidebar step. Consider:
- Adding a mobile-specific welcome message mentioning touch gestures
- Reducing to 4 steps max on mobile

#### Step 3.2: Add Tour Delay on Mobile Canvas

Use a longer delay on mobile (1000ms+) since:
- Mobile canvas takes longer to render
- Touch interactions need UI to be fully ready
- Avoids jarring transition

### Phase 4: Add Dismissal Options

**Goal**: Let users dismiss without frustration, with easy restart

#### Step 4.1: Improve Skip Button Behavior

Enhance to:
1. Show a brief toast: "Tour dismissed. Find it in the Learn menu anytime."
2. Mark the tour as seen (not completed)

#### Step 4.2: Add "Remind Me Later" Option

On the first step of auto-started tours, add a third button:
- "Remind Me Later" - Sets a session-only flag to delay tour
- Shows tour again on next session

### Phase 5: Analytics Enhancement

**Goal**: Track auto-start tours separately for funnel analysis

Add new tracking function:
```typescript
export function trackTourAutoStarted(tourId: TourId): void {
  trackEvent('tour_auto_started', {
    event_category: 'onboarding',
    tour_id: tourId,
  });
}
```

---

## Implementation Sequence

1. **Phase 1** (Improve Trigger Conditions) - Most critical, fixes current issues
2. **Phase 3** (Mobile Experience) - Important for user experience
3. **Phase 4** (Dismissal Options) - Reduces frustration
4. **Phase 2** (State Tracking) - Nice-to-have for granularity
5. **Phase 5** (Analytics) - Important for measuring success

---

## File Changes Summary

| File | Changes |
|------|---------|
| `src/router/EventLayout.tsx` | Improve auto-start trigger conditions, add route checks |
| `src/store/useStore.ts` | Add `hasSeenQuickStartTour` state (optional) |
| `src/components/OnboardingWizard.tsx` | Add "Remind Me Later", improve skip behavior |
| `src/utils/analytics.ts` | Add `trackTourAutoStarted` function |
| `e2e/onboarding-wizard.spec.ts` | Update and add test cases |

---

## Risks and Considerations

1. **Breaking Existing Tests**: Many E2E tests set `hasCompletedOnboarding: true` to skip onboarding. Changes to state structure need migration.

2. **User Confusion**: If tour triggers too early (before canvas renders), users may be confused. Solution: Proper delay and view detection.

3. **Repeat Triggers on Fast Navigation**: User rapidly navigating could trigger multiple effects. Solution: Use refs to track if tour was already initiated this session.

4. **LocalStorage Version Migration**: Adding new state requires storage version bump and migration logic.
