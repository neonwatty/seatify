# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start dev server (localhost:5173/seating-arrangement/)
npm run build        # TypeScript check + Vite build
npm run lint         # ESLint
npm run test         # Playwright e2e tests
npm run test:ui      # Playwright with UI
```

## Architecture

**State**: Single Zustand store (`src/store/useStore.ts`) with localStorage persistence. Manages event data (tables, guests, constraints, venue elements), canvas state (zoom, pan, selections), and undo/redo history.

**Types** (`src/types/index.ts`): `Guest` (with relationships, table assignment), `Table` (shape variants), `VenueElement` (non-seating items), `Constraint` (seating rules), `Event` (top-level container).

**Views**: Controlled by `activeView` state — 'dashboard', 'canvas', or 'guests'. Canvas view includes sidebar with guest list.

**Drag & Drop**: @dnd-kit handles guest-to-table assignment, table repositioning, and seat swapping.

**Optimization**: `optimizeSeating()` groups partners, scores relationships (partners +10, avoid -20), and assigns guests to tables greedily.

**Grid Controls** (`src/components/GridControls.tsx`): Toolbar component with toggle buttons for grid visibility, snap-to-grid, alignment guides, and grid size dropdown. Canvas preferences (`canvasPrefs`) are stored in Zustand but NOT persisted to localStorage - they reset to defaults on reload.

## Testing

E2E tests in `e2e/` run via Playwright against dev server. Use `enterApp()` helper to bypass landing page.

**Test Files**:
- `e2e/app-demo.spec.ts` - Core app functionality (views, zoom, add table/guest)
- `e2e/grid-controls.spec.ts` - Grid control buttons (26 tests: toggles, dropdown, tooltips, mobile responsive)
- `e2e/guest-editing.spec.ts` - Guest editing features
- `e2e/keyboard-shortcuts.spec.ts` - Keyboard shortcuts
- `e2e/toast-notifications.spec.ts` - Toast notifications

## Planning Instructions

When asked to "make a plan", spawn at least 3 planning agents in parallel, each exploring different viewpoints, solutions, or technical decisions. After agents complete, examine all plans and either select the best one or combine excellent elements from multiple plans into a final consolidated plan.

## Pull Requests

After creating a PR, repeatedly check GitHub Actions workflows using `gh run list` and `gh run watch` until they succeed. Debug and fix any failures before considering the PR complete.
