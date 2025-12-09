# Mobile-Optimized Table Management Plan

## Current State
- `TablePropertiesPanel.tsx` shows when exactly one table is selected
- Basic mobile CSS exists (bottom sheet at 768px breakpoint, max-height 60vh)
- Panel slides up from bottom on mobile
- Contains: Name, Shape selector, Capacity, Size presets, Dimensions, Delete, Assigned guests list

## Problems to Solve
1. **Touch targets too small** - Shape buttons, capacity +/- buttons need 44px minimum
2. **No quick actions** - Delete, duplicate, rotate should be easily accessible
3. **No swipe navigation** - Can't quickly move between tables
4. **Bottom sheet lacks handle** - No visual affordance for dragging/dismissing
5. **Backdrop missing** - Should dim canvas when panel is open
6. **No table navigation** - Can't see which table you're on or jump to others

---

## Implementation Plan

### Step 1: Mobile Panel Container Improvements
**File: `src/components/TablePropertiesPanel.css`**

- Add drag handle at top of panel
- Add backdrop overlay when panel is open
- Increase all touch targets to 44px minimum
- Add safe-area-inset padding for notched devices
- Improve visual hierarchy with better spacing

### Step 2: Quick Actions Bar
**File: `src/components/TablePropertiesPanel.tsx`**

Add a quick actions bar at the top with large icon buttons:
- **Delete** (trash icon)
- **Duplicate** (copy icon)
- **Rotate** (+90° rotation)
- **Navigate Previous/Next** table arrows

### Step 3: Table Navigation
**File: `src/components/TablePropertiesPanel.tsx`**

- Show "Table 3 of 8" indicator
- Add prev/next arrows to navigate between tables
- Highlight current table on canvas when navigating

### Step 4: Enhanced Mobile Layout
**File: `src/components/TablePropertiesPanel.tsx` & `.css`**

- Reorganize sections for thumb-friendly access:
  1. Quick actions bar (top, always visible)
  2. Table name + navigation
  3. Shape selector (larger buttons, 2 rows of 3)
  4. Capacity with larger +/- buttons
  5. Assigned guests (collapsible)
- Size presets and dimensions are less critical, can be in collapsed "Advanced" section

### Step 5: Swipe to Dismiss
**File: `src/components/TablePropertiesPanel.tsx`**

- Add swipe-down gesture to dismiss panel
- Use `@use-gesture/react` (already installed)
- Threshold: 100px drag down = dismiss

### Step 6: Backdrop Overlay
**File: `src/components/TablePropertiesPanel.tsx` & `.css`**

- Add semi-transparent backdrop behind panel
- Tap backdrop to dismiss
- Fade in/out animation

---

## Technical Details

### New State Needed
None - use existing:
- `canvas.selectedTableIds` - current selection
- `event.tables` - table list for navigation
- `selectTable(id)` - to change selection

### Gesture Handling
```tsx
import { useDrag } from '@use-gesture/react';

const bind = useDrag(({ movement: [, my], velocity: [, vy], direction: [, dy], cancel }) => {
  if (my > 100 || (vy > 0.5 && dy > 0)) {
    selectTable(null); // dismiss
    cancel();
  }
});
```

### Navigation Logic
```tsx
const tableIndex = event.tables.findIndex(t => t.id === selectedTable.id);
const totalTables = event.tables.length;

const goToPrevTable = () => {
  const prevIndex = (tableIndex - 1 + totalTables) % totalTables;
  selectTable(event.tables[prevIndex].id);
};

const goToNextTable = () => {
  const nextIndex = (tableIndex + 1) % totalTables;
  selectTable(event.tables[nextIndex].id);
};
```

---

## CSS Changes Summary

```css
/* Mobile panel enhancements */
@media (max-width: 768px) {
  .table-properties-panel {
    /* Full-width bottom sheet with safe areas */
    padding-bottom: calc(1rem + env(safe-area-inset-bottom));
  }

  .panel-drag-handle {
    /* Visual swipe handle */
    width: 40px;
    height: 4px;
    background: var(--color-border);
    border-radius: 2px;
    margin: 0.5rem auto 1rem;
  }

  .quick-actions {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 1rem;
  }

  .quick-actions button {
    flex: 1;
    min-height: 44px;
    /* Large touch targets */
  }

  .shape-selector button {
    min-width: 44px;
    min-height: 44px;
  }

  .capacity-control button {
    min-width: 44px;
    min-height: 44px;
  }
}
```

---

## Files to Modify

1. **`src/components/TablePropertiesPanel.tsx`**
   - Add quick actions bar
   - Add table navigation (prev/next)
   - Add swipe-to-dismiss gesture
   - Add backdrop component
   - Conditional mobile layout

2. **`src/components/TablePropertiesPanel.css`**
   - Drag handle styling
   - Backdrop overlay
   - 44px touch targets
   - Safe area padding
   - Reorganized mobile layout

3. **`src/store/useStore.ts`**
   - Add `duplicateTable(id)` action (if not exists)
   - Add `rotateTable(id, degrees)` action (if not exists)

---

## Testing Checklist

- [ ] Panel opens from bottom on mobile viewport
- [ ] Drag handle visible and swipe-to-dismiss works
- [ ] Backdrop dims canvas, tapping dismisses
- [ ] All buttons are at least 44x44px
- [ ] Prev/Next navigation cycles through tables
- [ ] Quick actions (delete, duplicate, rotate) work
- [ ] Panel scrolls if content exceeds viewport
- [ ] Safe area padding works on notched devices
- [ ] Shape selector buttons are thumb-friendly

---

## Estimated Changes
- ~100 lines new/modified TSX
- ~80 lines new/modified CSS
- Minor store additions if duplicate/rotate missing
