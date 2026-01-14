# Task 4.3: Add updateConstraint + Full Constraint Syncing

**Priority:** High
**Estimated Effort:** 4-5 hours
**Status:** Planning

## Overview

Currently, users must delete and recreate constraints to make any changes. Additionally, **constraints are only stored in localStorage** - they're not synced to Supabase, meaning users lose constraints when switching devices.

This task will:
1. Add inline editing capability with polished UX on desktop and mobile
2. **Wire up full constraint syncing to Supabase** (add, update, delete)
3. Optionally wire up venue element syncing (same gap exists)

---

## Current State Analysis

### What Exists
- **Add constraint form**: Inline form in `OptimizeView.tsx` (lines 307-352)
- **Constraint list**: Shows type, priority, guest names, and delete button (lines 354-382)
- **Server action**: `updateConstraint()` already exists in `src/actions/constraints.ts`
- **Store actions**: Only `addConstraint()` and `removeConstraint()` - no update

### UX Patterns in App
- **GuestForm**: Modal with add/edit modes via `guestId` prop
- **TablePropertiesPanel**: Inline editing panel for tables
- **Delete pattern**: Inline × button with hover color change

### Data Sync Gap (Critical)
Currently in `useSyncToSupabase.ts`:
- ✅ Tables: add, update, delete, move → synced
- ✅ Guests: add, update, delete, assign → synced
- ✅ Relationships: add, remove → synced
- ❌ **Constraints: NOT synced** (localStorage only)
- ❌ **Venue Elements: NOT synced** (localStorage only)

---

## Implementation Plan

### Part 0: Wire Up Constraint Syncing to Supabase (CRITICAL)

**File:** `src/hooks/useSyncToSupabase.ts`

Add constraint sync operations using existing server actions:

```typescript
import {
  insertConstraint,
  updateConstraint as updateConstraintAction,
  deleteConstraint as deleteConstraintAction
} from '@/actions/constraints';
import type { Constraint } from '@/types';

// Inside useSyncToSupabase hook:

// Add constraint with sync
const addConstraintWithSync = useCallback(async (
  constraint: Omit<Constraint, 'id'>
) => {
  // Add to local store first (optimistic update)
  store.addConstraint(constraint);

  // Get the newly added constraint from the store
  const constraints = useStore.getState().event.constraints;
  const newConstraint = constraints[constraints.length - 1];

  // Persist to Supabase if authenticated
  if (isAuthenticated && newConstraint) {
    const result = await insertConstraint(eventId, {
      type: newConstraint.type,
      priority: newConstraint.priority,
      guestIds: newConstraint.guestIds,
      description: newConstraint.description,
    });

    if (result.error) {
      console.error('Failed to persist constraint:', result.error);
    }
  }
}, [store, eventId, isAuthenticated]);

// Update constraint with sync
const updateConstraintWithSync = useCallback(async (
  constraintId: string,
  updates: Partial<Omit<Constraint, 'id'>>
) => {
  // Update local store first
  store.updateConstraint(constraintId, updates);

  // Persist to Supabase if authenticated
  if (isAuthenticated) {
    const result = await updateConstraintAction(eventId, constraintId, {
      type: updates.type,
      priority: updates.priority,
      guestIds: updates.guestIds,
      description: updates.description,
    });

    if (result.error) {
      console.error('Failed to persist constraint update:', result.error);
    }
  }
}, [store, eventId, isAuthenticated]);

// Remove constraint with sync
const removeConstraintWithSync = useCallback(async (constraintId: string) => {
  // Remove from local store first
  store.removeConstraint(constraintId);

  // Persist to Supabase if authenticated
  if (isAuthenticated) {
    const result = await deleteConstraintAction(eventId, constraintId);

    if (result.error) {
      console.error('Failed to delete constraint:', result.error);
    }
  }
}, [store, eventId, isAuthenticated]);

// Add to return object:
return {
  // ... existing
  addConstraint: addConstraintWithSync,
  updateConstraint: updateConstraintWithSync,
  removeConstraint: removeConstraintWithSync,
};
```

**Acceptance Criteria:**
- [ ] Adding a constraint syncs to Supabase
- [ ] Updating a constraint syncs to Supabase
- [ ] Deleting a constraint syncs to Supabase
- [ ] Constraints persist across devices for logged-in users

### Part 0.5: Wire Up Venue Element Syncing (Bonus - Same Gap)

**File:** `src/hooks/useSyncToSupabase.ts`

Add venue element sync operations:

```typescript
import {
  insertVenueElement,
  updateVenueElement as updateVenueElementAction,
  deleteVenueElement as deleteVenueElementAction
} from '@/actions/venueElements';
import type { VenueElement } from '@/types';

// Add venue element with sync
const addVenueElementWithSync = useCallback(async (
  element: Omit<VenueElement, 'id'>
) => {
  // Add to local store first
  store.addVenueElement(element);

  const elements = useStore.getState().event.venueElements;
  const newElement = elements[elements.length - 1];

  if (isAuthenticated && newElement) {
    const result = await insertVenueElement(eventId, {
      type: newElement.type,
      x: newElement.x,
      y: newElement.y,
      width: newElement.width,
      height: newElement.height,
      rotation: newElement.rotation,
      label: newElement.label,
    });

    if (result.error) {
      console.error('Failed to persist venue element:', result.error);
    }
  }
}, [store, eventId, isAuthenticated]);

// Update venue element with sync
const updateVenueElementWithSync = useCallback(async (
  elementId: string,
  updates: Partial<Omit<VenueElement, 'id'>>
) => {
  store.updateVenueElement(elementId, updates);

  if (isAuthenticated) {
    const result = await updateVenueElementAction(eventId, elementId, updates);

    if (result.error) {
      console.error('Failed to persist venue element update:', result.error);
    }
  }
}, [store, eventId, isAuthenticated]);

// Remove venue element with sync
const removeVenueElementWithSync = useCallback(async (elementId: string) => {
  store.removeVenueElement(elementId);

  if (isAuthenticated) {
    const result = await deleteVenueElementAction(eventId, elementId);

    if (result.error) {
      console.error('Failed to delete venue element:', result.error);
    }
  }
}, [store, eventId, isAuthenticated]);

// Add to return object:
return {
  // ... existing
  addVenueElement: addVenueElementWithSync,
  updateVenueElement: updateVenueElementWithSync,
  removeVenueElement: removeVenueElementWithSync,
};
```

**Acceptance Criteria:**
- [ ] Adding a venue element syncs to Supabase
- [ ] Updating a venue element syncs to Supabase
- [ ] Deleting a venue element syncs to Supabase

### Part 1: Zustand Store - Add updateConstraint Method

**File:** `src/store/useStore.ts`

Add the `updateConstraint` action following the existing patterns:

```typescript
// In StoreState interface (around line 213)
updateConstraint: (constraintId: string, updates: Partial<Omit<Constraint, 'id'>>) => void;

// In the store implementation (after removeConstraint, around line 1276)
updateConstraint: (constraintId, updates) =>
  set((state) => syncEventUpdate(state, (event) => ({
    ...event,
    constraints: event.constraints.map((c) =>
      c.id === constraintId ? { ...c, ...updates } : c
    ),
  }))),
```

**Acceptance Criteria:**
- [ ] Method added to store interface
- [ ] Method updates constraint in current event
- [ ] Triggers sync to Supabase via `syncEventUpdate`

---

### Part 2: ConstraintForm Component (New)

**File:** `src/components/ConstraintForm.tsx` (new)

Create a dedicated form component that handles both add and edit modes, following the GuestForm pattern.

#### Component Structure

```typescript
interface ConstraintFormProps {
  constraintId?: string;  // If provided, edit mode; if not, add mode
  onClose: () => void;
  onSuccess?: () => void;
}

export function ConstraintForm({ constraintId, onClose, onSuccess }: ConstraintFormProps) {
  const { event, addConstraint, updateConstraint } = useStore();
  const existingConstraint = constraintId
    ? event.constraints.find(c => c.id === constraintId)
    : null;

  // Form state initialized from existing or defaults
  const [formData, setFormData] = useState({
    type: existingConstraint?.type || 'same_table',
    priority: existingConstraint?.priority || 'preferred',
    guestIds: existingConstraint?.guestIds || [],
    description: existingConstraint?.description || '',
  });

  // ... form logic
}
```

#### UI Layout

**Desktop (Modal):**
```
┌──────────────────────────────────────────────────────┐
│  Edit Constraint                               ✕     │
├──────────────────────────────────────────────────────┤
│                                                      │
│  CONSTRAINT TYPE                                     │
│  ┌────────────────────────────────────────────────┐ │
│  │ Must sit at same table                     ▼   │ │
│  └────────────────────────────────────────────────┘ │
│                                                      │
│  PRIORITY LEVEL                                      │
│  ┌────────────────────────────────────────────────┐ │
│  │ Required                                   ▼   │ │
│  └────────────────────────────────────────────────┘ │
│                                                      │
│  GUESTS (3 selected)                                 │
│  ┌────────────────────────────────────────────────┐ │
│  │ ┌─────────┐ ┌─────────┐ ┌─────────────┐       │ │
│  │ │ Alice ✓ │ │  Bob  ✓ │ │ Charlie ✓   │       │ │
│  │ └─────────┘ └─────────┘ └─────────────┘       │ │
│  │ ┌─────────┐ ┌─────────┐ ┌─────────────┐       │ │
│  │ │  Dana   │ │  Eve    │ │   Frank     │       │ │
│  │ └─────────┘ └─────────┘ └─────────────┘       │ │
│  └────────────────────────────────────────────────┘ │
│                                                      │
│  DESCRIPTION (optional)                              │
│  ┌────────────────────────────────────────────────┐ │
│  │ Bridesmaids - must sit together                │ │
│  └────────────────────────────────────────────────┘ │
│                                                      │
├──────────────────────────────────────────────────────┤
│  [Delete]                    [Cancel] [Save Changes] │
└──────────────────────────────────────────────────────┘
```

**Mobile (Full-screen modal):**
```
┌──────────────────────────────────────┐
│  Edit Constraint                  ✕  │
├──────────────────────────────────────┤
│                                      │
│  CONSTRAINT TYPE                     │
│  ┌────────────────────────────────┐ │
│  │ Must sit at same table      ▼  │ │
│  └────────────────────────────────┘ │
│                                      │
│  PRIORITY LEVEL                      │
│  ┌────────────────────────────────┐ │
│  │ Required                    ▼  │ │
│  └────────────────────────────────┘ │
│                                      │
│  GUESTS (3 selected)                 │
│  ┌──────────┐ ┌──────────┐          │
│  │ Alice ✓  │ │  Bob ✓   │          │
│  └──────────┘ └──────────┘          │
│  ┌────────────┐ ┌────────┐          │
│  │ Charlie ✓  │ │  Dana  │          │
│  └────────────┘ └────────┘          │
│                                      │
│  DESCRIPTION (optional)              │
│  ┌────────────────────────────────┐ │
│  │ Bridesmaids                    │ │
│  └────────────────────────────────┘ │
│                                      │
│  ┌────────────────────────────────┐ │
│  │          Delete Constraint     │ │  (red, at bottom)
│  └────────────────────────────────┘ │
│                                      │
│  ┌────────────────────────────────┐ │
│  │            Cancel              │ │
│  └────────────────────────────────┘ │
│                                      │
│  ┌────────────────────────────────┐ │
│  │         Save Changes           │ │  (primary color)
│  └────────────────────────────────┘ │
└──────────────────────────────────────┘
```

---

### Part 3: Update OptimizeView - Edit Trigger

**File:** `src/components/OptimizeView.tsx`

#### Changes to Constraint List Item

Add an edit button and wire up the edit modal:

```tsx
// State for editing
const [editingConstraintId, setEditingConstraintId] = useState<string | null>(null);

// In constraint-item render (around line 360):
<div key={constraint.id} className={`constraint-item ${constraint.priority}`}>
  <div className="constraint-info">
    <span className="constraint-type">
      {formatConstraintType(constraint.type)}
    </span>
    <span className="constraint-priority">{constraint.priority}</span>
    {constraint.description && (
      <span className="constraint-description">{constraint.description}</span>
    )}
  </div>
  <div className="constraint-guests">
    {constraint.guestIds.map((id) => {
      const guest = event.guests.find((g) => g.id === id);
      return <span key={id} className="guest-name">{guest ? getFullName(guest) : ''}</span>;
    })}
  </div>
  <div className="constraint-actions">
    <button
      className="edit-btn"
      onClick={() => setEditingConstraintId(constraint.id)}
      aria-label="Edit constraint"
    >
      ✎
    </button>
    <button
      className="remove-btn"
      onClick={() => removeConstraint(constraint.id)}
      aria-label="Delete constraint"
    >
      ×
    </button>
  </div>
</div>

// At component end, render the modal:
{editingConstraintId && (
  <ConstraintForm
    constraintId={editingConstraintId}
    onClose={() => setEditingConstraintId(null)}
  />
)}
```

---

### Part 4: CSS Styling

**File:** `src/components/ConstraintForm.css` (new)

Use existing patterns from GuestForm.css for consistency:

```css
/* Constraint Form Modal */
.constraint-form-modal {
  background: var(--color-bg);
  border-radius: var(--radius-xl);
  width: 550px;
  max-width: 90vw;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: var(--shadow-xl);
  animation: modalSlideUp var(--duration-slow) var(--ease-spring);
}

/* Description field styling */
.constraint-description-input {
  width: 100%;
  padding: 0.75rem 1rem;
  border: 2px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  font-family: inherit;
  resize: none;
  transition: all var(--duration-fast) var(--ease-out);
}

.constraint-description-input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 4px var(--focus-ring-color);
}

/* Guest selection chips in modal */
.constraint-guest-selector {
  max-height: 200px;
  overflow-y: auto;
  padding: 1rem;
  background: var(--color-bg-secondary);
  border-radius: var(--radius-lg);
  margin-bottom: 1.25rem;
}

/* Mobile responsive */
@media (max-width: 768px) {
  .constraint-form-modal {
    width: 100%;
    max-width: 100%;
    max-height: 100%;
    border-radius: var(--radius-lg);
  }
}

@media (max-width: 480px) {
  .constraint-form-modal {
    border-radius: 0;
    height: 100%;
    max-height: 100vh;
  }

  .constraint-guest-selector {
    max-height: 40vh;
  }
}
```

**File:** `src/components/OptimizeView.css` (additions)

Add styles for edit button:

```css
/* Edit button in constraint list */
.constraint-actions {
  display: flex;
  gap: 0.5rem;
}

.constraint-item .edit-btn {
  width: 28px;
  height: 28px;
  border-radius: var(--radius-md);
  border: none;
  background: var(--color-bg);
  cursor: pointer;
  font-size: var(--font-size-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--duration-fast) var(--ease-bounce);
}

.constraint-item .edit-btn:hover {
  background: var(--color-primary);
  color: white;
  transform: scale(1.1);
}

/* Description preview in list */
.constraint-description {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  font-style: italic;
  margin-top: 0.25rem;
  display: block;
}

/* Mobile: make touch targets larger */
@media (max-width: 480px) {
  .constraint-item .edit-btn,
  .constraint-item .remove-btn {
    width: 44px;
    height: 44px;
    font-size: var(--font-size-lg);
  }

  .constraint-actions {
    gap: 0.75rem;
  }
}
```

---

### Part 5: Sync to Supabase

**File:** `src/hooks/useSyncToSupabase.ts`

Add `updateConstraint` to the synced operations:

```typescript
const updateConstraint = useCallback(async (
  constraintId: string,
  updates: Partial<Omit<Constraint, 'id'>>
) => {
  // Update local store immediately
  store.updateConstraint(constraintId, updates);

  // Sync to Supabase
  if (event?.id) {
    const { error } = await updateConstraintAction(event.id, constraintId, {
      type: updates.type,
      priority: updates.priority,
      guestIds: updates.guestIds,
      description: updates.description,
    });

    if (error) {
      console.error('Failed to sync constraint update:', error);
      // Could add toast notification here
    }
  }
}, [event?.id]);

return {
  // ... existing
  updateConstraint,
};
```

---

## UX Enhancements

### 1. Visual Feedback on Edit
- Constraint item briefly highlights when edited
- Toast notification: "Constraint updated"

### 2. Keyboard Support
- Escape key closes modal
- Tab navigation through form fields
- Enter key submits form

### 3. Validation
- Minimum 2 guests for same_table/different_table constraints
- Cannot save empty constraint
- Warning if editing reduces guests below required minimum

### 4. Mobile-First Interactions
- Large touch targets (44px minimum)
- Full-screen modal on small screens
- Sticky header with close button
- Safe area padding for notched devices

---

## Testing Checklist

### Unit Tests (`src/components/ConstraintForm.test.tsx`)
- [ ] Renders in add mode with defaults
- [ ] Renders in edit mode with existing constraint data
- [ ] Updates form state correctly
- [ ] Calls addConstraint on submit in add mode
- [ ] Calls updateConstraint on submit in edit mode
- [ ] Closes modal on cancel
- [ ] Validates minimum guest selection
- [ ] Handles delete with confirmation

### Integration Tests
- [ ] Edit flow from constraint list
- [ ] Changes persist after refresh
- [ ] Syncs to Supabase correctly

### Manual Testing
- [ ] Desktop: Modal opens, edits save
- [ ] Mobile: Full-screen modal works
- [ ] Keyboard navigation
- [ ] Screen reader accessibility

---

## File Summary

| File | Action | Description |
|------|--------|-------------|
| `src/hooks/useSyncToSupabase.ts` | Modify | **Add constraint + venue element syncing** |
| `src/store/useStore.ts` | Modify | Add `updateConstraint` method |
| `src/components/ConstraintForm.tsx` | Create | New modal form component |
| `src/components/ConstraintForm.css` | Create | Styling for modal |
| `src/components/OptimizeView.tsx` | Modify | Add edit button, use synced actions |
| `src/components/OptimizeView.css` | Modify | Add edit button styles |
| `src/components/Canvas.tsx` | Modify | Use synced venue element actions |
| `src/components/ConstraintForm.test.tsx` | Create | Unit tests |
| `src/hooks/useSyncToSupabase.test.ts` | Create | Tests for sync functions |

---

## Completion Checklist

### Data Sync (Critical)
- [ ] Constraint add/update/delete syncs to Supabase
- [ ] Venue element add/update/delete syncs to Supabase
- [ ] OptimizeView uses synced constraint actions
- [ ] Canvas uses synced venue element actions
- [ ] Data persists across devices for logged-in users

### UI/UX
- [ ] Zustand store `updateConstraint` method works
- [ ] ConstraintForm component handles add/edit modes
- [ ] Edit button visible in constraint list
- [ ] Modal opens with existing constraint data
- [ ] Save updates constraint correctly
- [ ] Delete works from edit modal
- [ ] Desktop UX polished
- [ ] Mobile UX polished
- [ ] Tests passing
- [ ] Accessibility verified

---

## Implementation Order

1. **Supabase sync for constraints** (30 min) - Wire up add/update/delete in useSyncToSupabase
2. **Supabase sync for venue elements** (20 min) - Wire up add/update/delete
3. **Store method** (15 min) - Add `updateConstraint` to Zustand
4. **Update OptimizeView** (15 min) - Use synced constraint actions
5. **Update Canvas** (15 min) - Use synced venue element actions
6. **ConstraintForm component** (1.5 hr) - Build the form UI
7. **OptimizeView edit button** (30 min) - Wire up edit functionality
8. **CSS styling** (45 min) - Polish desktop and mobile
9. **Testing** (45 min) - Write and run tests

Total: ~4.5 hours
