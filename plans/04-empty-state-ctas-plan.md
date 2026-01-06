# Implementation Plan: Contextual Hints and CTAs for Empty States

## Executive Summary

This plan outlines a systematic approach to enhance the user experience when users encounter empty states across Seatify. Currently, empty states exist but vary in quality and messaging. This plan proposes a unified `ContextualEmptyState` component with smart hints, progressive disclosure, and action-oriented CTAs that guide users through their first actions.

---

## 1. Current State Analysis

### 1.1 Existing Empty State Locations

| Location | Current Implementation | File |
|----------|----------------------|------|
| **Canvas (no tables, no guests)** | `<div className="canvas-empty">` with welcome message | `src/components/Canvas.tsx` |
| **Dashboard (no tables)** | `<EmptyState variant="tables">` | `src/components/DashboardView.tsx` |
| **Guest Management (no guests)** | `<EmptyState variant="guests">` or `"search"` | `src/components/GuestManagementView.tsx` |
| **Sidebar (no unassigned guests)** | `<p className="empty-message">` | `src/components/Sidebar.tsx` |
| **Mobile Guest Panel (no guests)** | `<div className="panel-empty">` | `src/components/MobileGuestPanel.tsx` |
| **Relationship Matrix (no guests)** | `<div className="matrix-empty">` | `src/components/RelationshipMatrix.tsx` |
| **Optimize View (no constraints)** | `<p className="empty">` | `src/components/OptimizeView.tsx` |

### 1.2 Existing EmptyState Component

Located at `src/components/EmptyState.tsx`:
- **Variants**: `guests`, `tables`, `canvas`, `search`, `generic`
- **Props**: `variant`, `title`, `description`, `action` (label + onClick)
- **Includes**: SVG illustrations per variant
- **Styling**: `src/components/EmptyState.css` with animations

### 1.3 Gaps in Current Implementation

1. **Inconsistent usage**: Some places use `EmptyState`, others use inline div elements
2. **No contextual awareness**: Hints don't adapt based on what the user has done
3. **No dismissability**: Hints show every time, even after user understands the app
4. **Missing pointer hints**: No visual arrows pointing to relevant UI elements
5. **No progressive guidance**: Doesn't guide user through sequential steps
6. **Mobile vs Desktop**: No differentiated messages for mobile interactions

---

## 2. Identified Empty States to Enhance

### 2.1 Primary Empty States (High Impact)

| Empty State | Condition | Priority |
|-------------|-----------|----------|
| **Canvas Empty** | `tables.length === 0 && guests.length === 0` | P0 |
| **No Tables** | `tables.length === 0` | P0 |
| **No Guests** | `guests.length === 0` | P0 |
| **No Seated Guests** | `guests.filter(g => g.tableId).length === 0 && guests.length > 0` | P1 |
| **No Relationships** | `guests.every(g => g.relationships.length === 0)` | P1 |

### 2.2 Secondary Empty States (Medium Impact)

| Empty State | Condition | Priority |
|-------------|-----------|----------|
| **No Constraints** | `constraints.length === 0` | P2 |
| **Search No Results** | Filtered list is empty with search query | P2 |
| **All Guests Assigned** | `unassignedGuests.length === 0` | P2 |

---

## 3. Design System for Empty States

### 3.1 Message Patterns

Each empty state should follow this structure:
```
[Illustration]
[Title] - What's missing (friendly tone)
[Description] - What to do next (actionable)
[Primary CTA Button] - Main action
[Secondary Link/Hint] - Alternative action (optional)
[Pointer Arrow] - Visual cue pointing to action button (optional)
```

### 3.2 Proposed Messages

#### Canvas Empty (New Event)
- **Title**: "Start Building Your Seating Plan"
- **Description (Desktop)**: "Click 'Add Table' to create your floor plan, or import guests to get started."
- **Description (Mobile)**: "Tap the + button to add tables, or swipe from the right to see your guest list."
- **Primary CTA**: "Add Your First Table"
- **Pointer**: Arrow pointing to Add Table button

#### No Tables
- **Title**: "No tables yet"
- **Description**: "Add tables to create your venue floor plan."
- **Primary CTA**: "Add Table"

#### No Guests
- **Title**: "Your guest list is empty"
- **Description**: "Add guests manually or import from a spreadsheet."
- **Primary CTA**: "Add Guest"
- **Secondary**: "Import from CSV/Excel"

#### No Seated Guests (has guests, has tables)
- **Title**: "Time to assign seats!"
- **Description (Desktop)**: "Drag guests from the sidebar onto tables, or click 'Optimize' to auto-arrange."
- **Description (Mobile)**: "Swipe from the right to open your guest list, then tap a guest and table to assign."
- **Primary CTA**: "Open Guest Panel" / "Auto-Optimize"

#### No Relationships
- **Title**: "Set up relationships for smarter seating"
- **Description**: "Define who should sit together (partners, family) and who to keep apart."
- **Primary CTA**: "Add Relationships"

---

## 4. Implementation Architecture

### 4.1 New Component: `ContextualEmptyState`

Create a new enhanced empty state component that extends the existing `EmptyState`:

```
src/components/ContextualEmptyState.tsx
src/components/ContextualEmptyState.css
```

#### Props Interface
```typescript
interface ContextualEmptyStateProps {
  // Existing EmptyState props
  variant: EmptyStateVariant;
  title: string;
  description: string;
  mobileDescription?: string;  // NEW: Alternate for mobile
  action?: {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
  };

  // New contextual props
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  pointer?: {
    direction: 'up' | 'down' | 'left' | 'right';
    targetSelector?: string;
  };
  hintKey?: string;  // For localStorage dismissal tracking
  dismissible?: boolean;
  animateIn?: boolean;
}
```

### 4.2 Smart Hint Dismissal System

Create a utility for tracking shown hints:

**File**: `src/utils/hintManager.ts`

```typescript
interface HintState {
  dismissed: Set<string>;
  interactionCounts: Record<string, number>;
  lastShown: Record<string, number>;
}

// Functions:
- shouldShowHint(hintKey: string): boolean
- dismissHint(hintKey: string): void
- recordInteraction(actionType: string): void
- hasUserPerformedAction(actionType: string, threshold?: number): boolean
- resetAllHints(): void  // For testing/settings
```

### 4.3 Pointer Arrow Component

**File**: `src/components/HintPointer.tsx`

An animated arrow/hand SVG that points to UI elements:
- CSS animation for gentle pulsing
- Four directions (up/down/left/right)
- Fade out after 5 seconds or on any interaction

### 4.4 State Tracking in Store

Add to `src/store/useStore.ts`:

```typescript
userInteractionFlags: {
  hasAddedTable: boolean;
  hasAddedGuest: boolean;
  hasAssignedGuest: boolean;
  hasRunOptimization: boolean;
  hasExported: boolean;
};

recordUserAction: (action: keyof UserInteractionFlags) => void;
```

---

## 5. Implementation Steps

### Phase 1: Foundation

1. **Create `hintManager.ts` utility**
   - Implement localStorage-based hint tracking
   - Add interaction counting logic
   - Export helper hooks: `useHintState(hintKey)`

2. **Create `HintPointer.tsx` component**
   - Animated SVG arrow in 4 directions
   - CSS animations for pulse/glow effect
   - Auto-dismiss timer

3. **Create `ContextualEmptyState.tsx`**
   - Extend existing `EmptyState` component
   - Add mobile description support using `useIsMobile()` hook
   - Integrate `HintPointer` component
   - Add dismissibility with localStorage tracking

### Phase 2: Canvas Empty State Enhancement

1. **Update `src/components/Canvas.tsx`**
   - Replace inline `<div className="canvas-empty">` with `<ContextualEmptyState>`
   - Add pointer to Add Table button
   - Different messages for desktop vs mobile

### Phase 3: Dashboard and Guest Management

1. **Update `src/components/DashboardView.tsx`**
   - Enhance existing `EmptyState` usage with contextual props
   - Add secondary action for import

2. **Update `src/components/GuestManagementView.tsx`**
   - Add pointer to Add Guest button when no guests
   - Different message for filtered empty vs truly empty

3. **Update `src/components/Sidebar.tsx`**
   - Replace inline message with `ContextualEmptyState`
   - Add drag hint when there are guests but none assigned

### Phase 4: Mobile-Specific Enhancements

1. **Update `src/components/MobileGuestPanel.tsx`**
   - Enhanced empty state with mobile-specific actions
   - Gesture hints integration

### Phase 5: Progressive Disclosure Logic

1. **Implement smart hint sequencing**
   - First: Add table hint
   - Then: Add guest hint (once tables exist)
   - Then: Assign seats hint (once guests exist)
   - Then: Optimize hint (once relationships exist)

2. **Track user actions to stop showing hints**
   - Hook into `addTable`, `addGuest`, `assignGuestToTable`, `optimizeSeating` store actions

---

## 6. Visual Design Specifications

### 6.1 Pointer Arrow Animation

```css
@keyframes pointer-pulse {
  0%, 100% { transform: translateX(0) scale(1); opacity: 0.9; }
  50% { transform: translateX(8px) scale(1.1); opacity: 1; }
}

.hint-pointer {
  animation: pointer-pulse 1.5s ease-in-out infinite;
  color: var(--color-primary);
}
```

### 6.2 Mobile-Specific Layout

For mobile, pointers should:
- Point to FAB button (bottom right)
- Point to edge swipe zone (right side)
- Use simpler illustrations (smaller)

---

## 7. When to Show vs Hide Hints

### Show Hints When:
- User has never performed the relevant action
- It's been more than 30 seconds since page load
- User is on a fresh event with no data

### Hide Hints When:
- User has performed the action at least once
- User dismisses the hint explicitly
- User has completed the onboarding tour
- More than 3 actions have been taken in the current session

### Hide Pointer Arrows When:
- User hovers over or clicks the target element
- 10 seconds have passed
- Any navigation occurs

---

## 8. Files to Modify/Create

| File | Changes |
|------|---------|
| **NEW** `src/components/ContextualEmptyState.tsx` | New component |
| **NEW** `src/components/ContextualEmptyState.css` | Styles |
| **NEW** `src/components/HintPointer.tsx` | Pointer arrow component |
| **NEW** `src/utils/hintManager.ts` | Hint tracking utility |
| `src/components/Canvas.tsx` | Use ContextualEmptyState |
| `src/components/DashboardView.tsx` | Enhance empty states |
| `src/components/GuestManagementView.tsx` | Enhance empty states |
| `src/components/Sidebar.tsx` | Replace inline empty message |
| `src/components/MobileGuestPanel.tsx` | Mobile empty state |
| `src/store/useStore.ts` | Add user interaction tracking |

---

## 9. Testing Considerations

### E2E Tests to Add

1. **Canvas empty state shows on fresh event**
2. **Empty state hides after adding first table**
3. **Pointer arrow appears and animates**
4. **Hint dismissal persists across page reloads**
5. **Mobile shows different description text**
6. **Secondary action button works**

---

## 10. Analytics Integration

Track these events:

```typescript
trackEmptyStateShown(location: string, variant: string): void
trackEmptyStateCTAClicked(location: string, action: string): void
trackHintDismissed(hintKey: string): void
```
