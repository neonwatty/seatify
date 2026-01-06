# Relationship Visualization Legend Implementation Plan

## Executive Summary

This plan details the implementation of a relationship visualization legend for Seatify. Users can see colored indicator dots on guests representing relationship types (partners, friends, family, colleagues, avoid), but there is currently no legend explaining what the colors mean. The goal is to add an accessible, non-intrusive legend that educates users about the visual encoding system.

---

## Research Findings

### 1. Relationship Types and Colors (Source of Truth)

**Location**: `src/components/RelationshipMatrix.tsx` (lines 7-19)

```typescript
const RELATIONSHIP_TYPES = [
  { value: null, label: 'None', short: '-', color: 'transparent' },
  { value: 'partner', label: 'Partner', short: 'P', color: '#e91e63' },   // Pink
  { value: 'family', label: 'Family', short: 'F', color: '#9c27b0' },     // Purple
  { value: 'friend', label: 'Friend', short: '+', color: '#2196f3' },     // Blue
  { value: 'colleague', label: 'Colleague', short: 'C', color: '#4caf50' }, // Green
  { value: 'avoid', label: 'Avoid', short: 'X', color: '#f44336' },       // Red
];
```

Note: The `acquaintance` type exists in `src/types/index.ts` but is not included in the matrix colors. The legend should include all 6 types.

### 2. Where Relationships are Visualized

- **RelationshipMatrix.tsx**: Full matrix view with built-in legend
- **GuestForm.tsx**: Relationship management in guest edit form
- **Table.tsx (SeatGuest)**: Seated guests show status/group dots

### 3. Existing Legend Pattern: GroupLegend

**Location**: `src/components/GroupLegend.tsx`

The app already has a well-designed `GroupLegend` component that:
- Is collapsible with expand/collapse toggle
- Shows colored indicators with count per group
- Has "Show All" / "Hide All" buttons
- Supports visibility toggling per group to dim guests on canvas
- Has proper accessibility (ARIA attributes)
- Lives in the Sidebar
- Has comprehensive E2E tests

This is the pattern to follow for the RelationshipLegend.

---

## Implementation Plan

### Phase 1: Extract Relationship Types to Shared Constants

**Goal**: Create a single source of truth for relationship types and colors.

**Files to create**:
- `src/constants/relationshipTypes.ts`

**Content**:
```typescript
export interface RelationshipTypeInfo {
  value: RelationshipType | null;
  label: string;
  short: string;
  color: string;
  description: string;
}

export const RELATIONSHIP_TYPES: RelationshipTypeInfo[] = [
  { value: null, label: 'None', short: '-', color: 'transparent', description: 'No relationship defined' },
  { value: 'partner', label: 'Partner', short: 'P', color: '#e91e63', description: 'Romantic partner or spouse - keep together' },
  { value: 'family', label: 'Family', short: 'F', color: '#9c27b0', description: 'Family member - prefer same table' },
  { value: 'friend', label: 'Friend', short: '+', color: '#2196f3', description: 'Close friend - prefer same table' },
  { value: 'colleague', label: 'Colleague', short: 'C', color: '#4caf50', description: 'Work colleague - professional connection' },
  { value: 'acquaintance', label: 'Acquaintance', short: 'A', color: '#78909c', description: 'Casual acquaintance' },
  { value: 'avoid', label: 'Avoid', short: 'X', color: '#f44336', description: 'Keep apart - do not seat together' },
];

export const getRelationshipColor = (type: RelationshipType | null): string => {
  return RELATIONSHIP_TYPES.find(r => r.value === type)?.color || 'transparent';
};
```

**Files to modify**:
- `src/components/RelationshipMatrix.tsx` - Import from constants
- `src/components/GuestForm.tsx` - Import from constants

---

### Phase 2: Create RelationshipLegend Component

**Goal**: Create a reusable legend component following the GroupLegend pattern.

**Files to create**:
- `src/components/RelationshipLegend.tsx`
- `src/components/RelationshipLegend.css`

**Component Design**:

```typescript
interface RelationshipLegendProps {
  guests: Guest[];
  highlightedType?: RelationshipType | null;
  onHighlightType?: (type: RelationshipType | null) => void;
  compact?: boolean;  // For mobile
}
```

**Features**:
1. **Collapsible header** - "Relationships (N)" where N is count of guests with relationships
2. **Color-coded list** showing each relationship type with:
   - Colored indicator dot
   - Label (Partner, Family, Friend, etc.)
   - Count of relationships of that type
3. **Interactive mode** (optional):
   - Click a relationship type to highlight guests with that relationship on canvas
4. **Accessibility**:
   - ARIA labels for screen readers
   - Keyboard navigation support

**CSS Pattern** (follow GroupLegend.css):
- `.relationship-legend` container
- `.relationship-legend-header` collapsible header
- `.relationship-legend-content` expandable content
- `.relationship-legend-item` individual type row
- `.legend-color` color indicator
- Mobile responsive breakpoints

---

### Phase 3: Integrate into Desktop Sidebar

**Goal**: Add RelationshipLegend below GroupLegend in the Sidebar.

**File to modify**: `src/components/Sidebar.tsx`

**Integration**:
```tsx
// After GroupLegend
<GroupLegend ... />

<RelationshipLegend
  guests={event.guests}
  highlightedType={highlightedRelationshipType}
  onHighlightType={setHighlightedRelationshipType}
/>
```

**Store additions** (if implementing highlight feature):
- Add `highlightedRelationshipType` state to `src/store/useStore.ts`
- Add `setHighlightedRelationshipType` action

---

### Phase 4: Add Info Popover/Tooltip for Canvas

**Goal**: Provide on-demand access to legend when viewing canvas without sidebar.

**Options evaluated**:

| Option | Pros | Cons |
|--------|------|------|
| Info icon in toolbar | Integrated with existing UI | May be overlooked |
| Tooltip on guest hover | Contextual, no space | Requires hover (not mobile) |

**Recommended**: Info icon in GridControls toolbar
- Small "?" or "i" icon with tooltip showing relationship colors
- Clicking opens a compact floating legend popover

---

### Phase 5: Mobile Integration

**Goal**: Make legend accessible in mobile immersive mode.

**File**: `src/components/BottomControlSheet.tsx`

Add a new section:
```tsx
{/* Relationship Legend - shown when relationships exist */}
{hasRelationships && (
  <div className="sheet-section">
    <h4>Relationship Colors</h4>
    <div className="sheet-legend">
      {RELATIONSHIP_TYPES.filter(t => t.value).map(type => (
        <div key={type.value} className="legend-item">
          <span className="color-dot" style={{ backgroundColor: type.color }} />
          <span className="label">{type.label}</span>
        </div>
      ))}
    </div>
  </div>
)}
```

---

### Phase 6: Conditional Visibility

**Goal**: Only show legend when relevant.

**Logic**:
```typescript
const hasRelationships = event.guests.some(g => g.relationships.length > 0);

// Only render legend if relationships exist
{hasRelationships && <RelationshipLegend ... />}
```

---

### Phase 7: E2E Tests

**Goal**: Create comprehensive tests following the GroupLegend test pattern.

**File to create**: `e2e/relationship-legend.spec.ts`

**Test cases**:

1. **Component Rendering**
   - Legend is visible when guests have relationships
   - Legend is hidden when no relationships exist
   - Legend header shows count

2. **Collapse/Expand**
   - Legend is collapsible
   - Collapse icon changes direction

3. **Color Display**
   - All relationship types show with correct colors
   - Colors match RELATIONSHIP_TYPES constants

4. **Interactive Features** (if implemented)
   - Clicking type highlights guests on canvas
   - Clicking again removes highlight

5. **Mobile Responsiveness**
   - Legend renders correctly on mobile viewport
   - BottomControlSheet shows relationship colors

6. **Accessibility**
   - Proper ARIA attributes
   - Keyboard navigation works

---

## Implementation Sequence

1. **Phase 1**: Extract constants (1-2 hours)
2. **Phase 2**: Create component (3-4 hours)
3. **Phase 3**: Desktop integration (1-2 hours)
4. **Phase 4**: Canvas tooltip/popover (2-3 hours)
5. **Phase 5**: Mobile integration (2 hours)
6. **Phase 6**: Conditional visibility (1 hour)
7. **Phase 7**: E2E tests (2-3 hours)

---

## Files to Modify/Create

| File | Changes |
|------|---------|
| **NEW** `src/constants/relationshipTypes.ts` | Shared constants |
| **NEW** `src/components/RelationshipLegend.tsx` | New component |
| **NEW** `src/components/RelationshipLegend.css` | Styles |
| **NEW** `e2e/relationship-legend.spec.ts` | Tests |
| `src/components/RelationshipMatrix.tsx` | Import from constants |
| `src/components/GuestForm.tsx` | Import from constants |
| `src/components/Sidebar.tsx` | Add RelationshipLegend |
| `src/components/BottomControlSheet.tsx` | Mobile integration |
| `src/store/useStore.ts` | Add highlight state (optional) |
