# Deferred MVP Features

These features have been implemented but are hidden from the navigation for the initial MVP user testing phase. The code remains in place and can be re-enabled by restoring the navigation buttons in `Header.tsx`.

## Purpose
Focus the MVP on the core visual seating arrangement experience to gather user feedback before adding complexity.

---

## Deferred Features

### 1. Dashboard View
**File:** `src/components/DashboardView.tsx`

Overview statistics and quick actions:
- Total guests, tables, capacity
- RSVP breakdown (confirmed, pending, declined)
- Seating progress indicators
- Quick navigation cards

**Re-enable:** Add Dashboard nav button to Header.tsx

---

### 2. Guest Management View
**File:** `src/components/GuestManagementView.tsx`

Dedicated guest list management:
- Full guest table with all columns
- Bulk editing capabilities
- Advanced filtering and sorting
- Group management

**Note:** Basic guest management is still available via the Sidebar in the canvas view.

**Re-enable:** Add Guests nav button to Header.tsx

---

### 3. Survey Builder
**Files:**
- `src/components/SurveyBuilderView.tsx`
- `src/components/GuestSurveyPage.tsx`

Pre-event guest survey system:
- Custom question builder
- Multiple question types (text, single-select, multi-select)
- Survey link generation
- Response collection and viewing

**Re-enable:** Add Survey nav button to Header.tsx

---

### 4. Optimization Algorithm
**File:** `src/components/OptimizeView.tsx`

Automatic seating optimization:
- Constraint-based optimization
- Relationship scoring
- Multiple optimization strategies
- Results comparison

**Re-enable:** Add Optimize nav button to Header.tsx

---

### 5. Print/PDF Export
**File:** `src/components/PrintView.tsx`

Print-friendly seating charts:
- Multiple layout templates
- Table-by-table breakdown
- Guest alphabetical lists

**Note:** JSON export is still available for data backup.

**Re-enable:** Add Print button to Header.tsx (already conditionally rendered)

---

## What's In the MVP

The current MVP includes:
- **Floor Plan Canvas** - Visual table layout with drag-and-drop
- **Guest Sidebar** - Add guests, search, filter, drag to seats
- **Multi-Select** - Cmd/Ctrl+click, Shift+click for multiple items
- **Context Menus** - Right-click actions on tables, guests, canvas
- **Layout Tools** - Align, distribute, grid arrange tables
- **Undo/Redo** - Full history support
- **Import/Export** - JSON event files, CSV guest lists
- **Demo Data** - One-click demo loading

---

## Re-enabling All Features

To restore full navigation, update `src/components/Header.tsx`:

```tsx
<nav className="header-nav">
  <button
    className={`nav-btn ${activeView === 'dashboard' ? 'active' : ''}`}
    onClick={() => setActiveView('dashboard')}
  >
    Dashboard
  </button>
  <button
    className={`nav-btn ${activeView === 'canvas' ? 'active' : ''}`}
    onClick={() => setActiveView('canvas')}
  >
    Floor Plan
  </button>
  <button
    className={`nav-btn ${activeView === 'guests' ? 'active' : ''}`}
    onClick={() => setActiveView('guests')}
  >
    Guests
  </button>
  <button
    className={`nav-btn ${activeView === 'survey' ? 'active' : ''}`}
    onClick={() => setActiveView('survey')}
  >
    Survey
  </button>
  <button
    className={`nav-btn ${activeView === 'optimize' ? 'active' : ''}`}
    onClick={() => setActiveView('optimize')}
  >
    Optimize
  </button>
</nav>
```

And restore the useStore imports:
```tsx
const { ..., activeView, setActiveView, ... } = useStore();
```
