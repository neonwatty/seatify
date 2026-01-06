# Implementation Plan: Making the Optimize Button More Attention-Grabbing

## Executive Summary

This plan outlines strategies to make the Optimize button more discoverable and attention-grabbing for users who have set up guest relationships but haven't yet used the optimization feature. The approach balances visual prominence with user experience, ensuring the animation is helpful but not annoying.

---

## Current State Analysis

### Location of Optimize Button

1. **Desktop Toolbar** (`src/components/MainToolbar.tsx`)
   - Lines 193-201: The button appears in the left toolbar section on canvas view
   - Uses class `toolbar-btn optimize` with conditional `optimizing` class
   - Shows sparkle icon (`✨`) and text "Optimize"
   - Disabled when `!canOptimize` (no relationships or no tables)

2. **Mobile Menu** (`src/components/MobileToolbarMenu.tsx`)
   - Lines 343-353: Appears in the "Actions" section of the mobile menu sheet
   - Same logic: shows when no snapshot exists, disabled when can't optimize

### Current Styling (`src/components/MainToolbar.css`)
- Lines 99-127: Purple gradient background (`#8b5cf6` to `#7c3aed`)
- Has hover effect with box-shadow and translateY
- Has a simple `pulse` animation when in `optimizing` state
- Disabled state: muted colors, no transform

### Existing Animation Patterns
- `@keyframes pulse` - Used for optimizing state (opacity pulse)
- `@keyframes pulseHint` - Used in gesture hints (opacity variation)
- `@keyframes pulseDot` - Used for indicator dots (scale + opacity)
- CSS Variable `--shadow-glow` exists for glow effects
- Global `prefers-reduced-motion` support in `src/index.css`

### Optimization Logic
- `canOptimize` requires: guests with relationships + tables with capacity + more than 1 guest
- `hasOptimizationSnapshot` tracks if user has already optimized (shows Reset button instead)
- Analytics already tracks `hasUsedOptimizer` via `setUserProperties`

---

## Implementation Plan

### Phase 1: Add "Has Used Optimize" Tracking

**Files to Modify:**
- `src/store/useStore.ts`

**Implementation:**
1. Add new persisted state: `hasUsedOptimizeButton: boolean` (default: false)
2. Set to `true` when `optimizeSeating()` is called
3. Persist in localStorage alongside other user preferences

---

### Phase 2: Create Attention-Grabbing Animation Classes

**Files to Modify:**
- `src/components/MainToolbar.css`

**New CSS Classes:**

```css
/* Attention-grabbing state for first-time users */
.toolbar-btn.optimize.attention {
  position: relative;
  animation: gentlePulse 2.5s ease-in-out infinite;
}

@keyframes gentlePulse {
  0%, 100% {
    box-shadow: 0 4px 12px rgba(139, 92, 246, 0.4);
    transform: translateY(0);
  }
  50% {
    box-shadow: 0 6px 20px rgba(139, 92, 246, 0.6),
                0 0 30px rgba(139, 92, 246, 0.3);
    transform: translateY(-1px);
  }
}

/* Shimmer effect overlay */
.toolbar-btn.optimize.attention::after {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255, 255, 255, 0.3),
    transparent
  );
  animation: shimmer 3s ease-in-out infinite;
}

@keyframes shimmer {
  0%, 100% { left: -100%; }
  50% { left: 100%; }
}

/* "Try" badge */
.toolbar-btn.optimize.attention .optimize-badge {
  position: absolute;
  top: -6px;
  right: -6px;
  background: var(--color-warning);
  color: #1a1a1a;
  font-size: 9px;
  font-weight: 700;
  padding: 2px 5px;
  border-radius: 8px;
  text-transform: uppercase;
}

/* Accessibility: Respect reduced motion preference */
@media (prefers-reduced-motion: reduce) {
  .toolbar-btn.optimize.attention {
    animation: none;
  }
  .toolbar-btn.optimize.attention::after {
    animation: none;
    display: none;
  }
}
```

---

### Phase 3: Add Conditional Attention State to Button Component

**Files to Modify:**
- `src/components/MainToolbar.tsx`

**Implementation Steps:**

1. **Import new state**:
```tsx
const { ..., hasUsedOptimizeButton } = useStore();
```

2. **Calculate attention state**:
```tsx
// Show attention-grabbing state when:
// 1. User can optimize (has relationships and tables)
// 2. User has never used the optimize button before
// 3. No optimization snapshot exists
const showOptimizeAttention = canOptimize && !hasUsedOptimizeButton && !hasSnapshot;
```

3. **Update button className**:
```tsx
className={`toolbar-btn optimize ${isOptimizing ? 'optimizing' : ''} ${showOptimizeAttention ? 'attention' : ''}`}
```

4. **Add optional badge** (inside button):
```tsx
{showOptimizeAttention && <span className="optimize-badge">Try</span>}
```

5. **Enhance tooltip**:
```tsx
title={
  showOptimizeAttention
    ? 'AI-powered seating! Click to automatically arrange guests based on relationships'
    : 'Optimize seating based on relationships'
}
```

---

### Phase 4: Mobile Implementation

**Files to Modify:**
- `src/components/MobileToolbarMenu.tsx`
- `src/components/MobileToolbarMenu.css`

**Implementation:**

1. Add attention state detection
2. Update menu item with conditional styling
3. Add "New" indicator badge

```css
.menu-item.attention {
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.1), transparent);
  border-left: 3px solid #8b5cf6;
}

.menu-item .attention-indicator {
  background: var(--color-warning);
  color: #1a1a1a;
  font-size: 10px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 6px;
  margin-left: auto;
}
```

---

## Animation Options Comparison

| Option | Pros | Cons | Recommendation |
|--------|------|------|----------------|
| **Subtle Pulse** | Non-intrusive, elegant | May be missed | Use as base |
| **Shimmer Effect** | Eye-catching, premium feel | Can be distracting | Use sparingly |
| **"Try" Badge** | Clear call-to-action | Takes extra space | Recommended |
| **Enhanced Tooltip** | Educational | Only visible on hover | Always include |
| **Glow Shadow** | Draws eye without motion | Works with reduced motion | Recommended |

**Recommended Combination:**
- Subtle pulse animation + shimmer (respecting reduced motion)
- Small "Try" badge positioned at top-right
- Enhanced tooltip explaining the feature
- Glow shadow for ambient attention

---

## When to Show Attention State

| Condition | Show Attention? | Reason |
|-----------|-----------------|--------|
| No relationships defined | No | Button is disabled anyway |
| Has relationships but never used Optimize | **Yes** | Primary use case |
| Just optimized (snapshot exists) | No | Reset button shows instead |
| Previously used Optimize (ever) | No | User knows the feature |
| In mobile menu | Yes (subtle) | Same logic, adapted styling |

---

## Stopping the Animation

The animation stops permanently when:
1. User clicks Optimize button (sets `hasUsedOptimizeButton: true`)
2. This persists in localStorage, so it never shows again

---

## Accessibility Requirements

1. **Reduced Motion Support**:
   - All animations disabled via `prefers-reduced-motion: reduce`
   - Badge remains visible (static)
   - Glow shadow can remain (not motion-based)

2. **Screen Reader Support:**
   - Badge should have `aria-label="New feature"` or be hidden from screen readers
   - Tooltip content should be accessible

3. **Color Contrast:**
   - Badge uses yellow on dark text (good contrast)
   - Purple glow is decorative, not informational

---

## Mobile-Specific Considerations

1. **Touch Targets:** Button already meets 44px minimum
2. **Battery Considerations:** CSS animations are GPU-accelerated
3. **Performance:** No JavaScript animation loops needed

---

## Implementation Order

1. **Store changes** - Add `hasUsedOptimizeButton` state
2. **CSS animations** - Add all new keyframes and classes
3. **Desktop button** - Add conditional classes and badge
4. **Mobile menu** - Add conditional styling
5. **Testing** - Verify on multiple screen sizes
6. **Accessibility audit** - Check with reduced motion and screen readers

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/store/useStore.ts` | Add `hasUsedOptimizeButton` state with persistence |
| `src/components/MainToolbar.tsx` | Add conditional attention class and badge |
| `src/components/MainToolbar.css` | Add animation keyframes and attention styles |
| `src/components/MobileToolbarMenu.tsx` | Add mobile attention state |
| `src/components/MobileToolbarMenu.css` | Add mobile attention styles |
