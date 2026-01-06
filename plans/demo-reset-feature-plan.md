# Plan: Demo Event Reset Feature

## Goal
Clean up "My Event" for a demo-friendly experience with reset functionality to restore original state after modifications.

## Summary
- **8 guests unassigned**, 10 assigned (from 18 total)
- **5 partner pairs separated** for dramatic optimization results
- **Reset button in canvas toolbar** with confirmation dialog

---

## Phase 1: Update Default Event Guest Assignments

**File**: `src/store/useStore.ts` (in `createDefaultEvent()`)

### Unassigned Guests (8) - remove `tableId` and `seatIndex`:
| Guest | Reason |
|-------|--------|
| James Wilson | Partner Emma stays at Table 1 |
| Olivia Chen | Partner Liam stays at Table 1 |
| Sophia Martinez | Partner Noah stays at Table 2 |
| Isabella Brown | Has avoid relationship |
| Lucas Garcia | Partner Sofia stays at Table 3 |
| Charlotte White | Family member to scatter |
| Benjamin Taylor | Has avoid with Mason |
| Daniel Thompson | Partner Mia stays at Table 3 |

### Assigned Guests (10):
| Table | Guests |
|-------|--------|
| Table 1 (2/8) | Emma Wilson, Liam Chen |
| Table 2 (3/10) | Noah Martinez, Ava Johnson, Ethan Davis |
| Table 3 (5/8) | Mason Lee, Mia Thompson, Sofia Garcia, Ryan Mitchell, Harper Reed |

**Result**: Optimization reunites 5 partner pairs (+50 relationship points)

---

## Phase 2: Add Reset Store Action

**File**: `src/store/useStore.ts`

1. Add to `AppState` interface:
```typescript
resetEventToDefault: () => void;
```

2. Implementation (preserves event ID):
```typescript
resetEventToDefault: () => {
  const state = get();
  const currentId = state.currentEventId;
  const freshDefault = createDefaultEvent();

  const resetEvent: Event = {
    ...freshDefault,
    id: currentId || freshDefault.id, // PRESERVE ID
  };

  set({
    events: state.events.map(e => e.id === currentId ? resetEvent : e),
    event: resetEvent,
    history: [],
    historyIndex: -1,
    animatingGuestIds: new Set(),
    preOptimizationSnapshot: null,
  });
}
```

---

## Phase 3: Add Reset Button to Toolbar

**File**: `src/components/MainToolbar.tsx`

- **Position**: Left section, after Optimize button group
- **Icon**: `🔄`
- **Label**: "Reset Demo"
- **Tooltip**: "Restore demo data to original state"
- **Class**: `toolbar-btn secondary`

---

## Phase 4: Create Confirmation Dialog

**New Files**:
- `src/components/ResetDemoDialog.tsx`
- `src/components/ResetDemoDialog.css`

**Pattern**: Follow `DeleteEventDialog.tsx`

**Content**:
- Title: "Reset Demo Data?"
- Body: "This will restore the default event layout with sample guests and tables. All current changes will be replaced."
- Buttons: "Cancel" (secondary), "Reset Demo" (primary blue)

**Success toast**: "Demo data restored!"

---

## Phase 5: Mobile Support

**Files**:
- `src/components/MobileToolbarMenu.tsx`
- `src/components/MobileCanvasToolbar.tsx`

Add "Reset Demo" option to mobile menu/settings sheet.

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/store/useStore.ts` | Update guest assignments, add `resetEventToDefault()` |
| `src/components/MainToolbar.tsx` | Add Reset Demo button |
| `src/components/ResetDemoDialog.tsx` | Create new dialog |
| `src/components/ResetDemoDialog.css` | Create new styles |
| `src/components/MobileToolbarMenu.tsx` | Add mobile option |
| `src/components/MobileCanvasToolbar.tsx` | Add mobile option |
