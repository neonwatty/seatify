# Seatify Production Readiness Plan

## Overview

This directory contains detailed implementation plans to bring Seatify to production readiness. The plans are organized by priority and should be executed in order.

## Current Status

- **Overall Readiness:** 🟢 PHASES 1-3 COMPLETE - Only Phase 4 (Feature Completion) remains
- **Test Coverage:** 200 tests across 11 test files
- **PR #101 Merged:** All critical infrastructure and test coverage work is complete

## Plan Index

| # | Plan | Priority | Effort | Status |
|---|------|----------|--------|--------|
| 1 | [Critical Data Integrity](./01-critical-data-integrity.md) | 🔴 Critical | 1-2 days | ✅ Complete |
| 2 | [Test Coverage](./02-test-coverage.md) | 🔴 Critical | 3-5 days | ✅ Complete |
| 3 | [Infrastructure & Polish](./03-infrastructure-polish.md) | 🟠 High | 1-2 days | ✅ Complete |
| 4 | [Feature Completion](./04-feature-completion.md) | 🟡 Medium | 3-5 days | ⏳ Not Started |

## Issue Summary

### ✅ Resolved Issues (Phases 1-3)
1. ~~Constraint guest IDs not loading from database~~ - Fixed with constraintGuestMap in loadEvent.ts
2. ~~No server actions for constraints/venue elements~~ - Created constraints.ts and venueElements.ts
3. ~~Survey system has no database tables~~ - Added survey_questions and survey_responses tables
4. ~~Seating optimization algorithm has ZERO tests~~ - 17 tests in optimizeSeating.test.ts
5. ~~Bidirectional relationships not loaded properly~~ - Fixed related_guest_id handling
6. ~~Test coverage at ~4%~~ - Now 200 tests across 11 test files
7. ~~No dependency vulnerability scanning~~ - Added Dependabot
8. ~~No `.nvmrc` file for Node version~~ - Added .nvmrc
9. ~~Missing `metadataBase` in layout~~ - Fixed in layout.tsx
10. ~~CI concurrency issues~~ - Added concurrency groups to workflows

### ⏳ Remaining Issues (Phase 4)
- `near_front` and `accessibility` constraints not implemented (spatial logic needed)
- Missing `updateConstraint` store method
- Survey server actions not created
- Survey data not loaded in loadEvent
- No generated Supabase types
- No real-time sync (optional)

## Execution Order

```
Week 1:
├── Phase 1: Critical Data Integrity (Days 1-2)
│   ├── Fix constraint guestIds loading
│   ├── Create constraints server actions
│   ├── Create venue elements server actions
│   ├── Fix bidirectional relationships
│   └── Add survey database tables
│
└── Phase 2: Test Coverage - Part 1 (Days 3-5)
    ├── optimizeSeating() tests
    └── Server action tests

Week 2:
├── Phase 2: Test Coverage - Part 2 (Days 1-2)
│   ├── CSV export/import tests
│   └── Constraint violation tests
│
├── Phase 3: Infrastructure & Polish (Days 3-4)
│   ├── Add Dependabot
│   ├── Add .nvmrc
│   ├── Fix ESLint warnings
│   └── Remove console.logs
│
└── Phase 4: Feature Completion (Days 5+)
    ├── Implement spatial constraints
    ├── Create survey server actions
    └── Add updateConstraint method
```

## How to Use These Plans

1. Read the plan file for the current phase
2. Each plan contains:
   - Detailed problem description
   - Step-by-step implementation guide
   - File locations and code snippets
   - Verification steps
   - Acceptance criteria
3. Mark tasks as complete as you go
4. Run tests after each major change
5. Create a PR for each completed phase

## Verification Commands

```bash
# Run all tests
npm test

# Run specific test file
npm test -- src/actions/constraints.test.ts

# Run build to check for errors
npm run build

# Run linting
npm run lint

# Check types
npx tsc --noEmit
```

## Success Criteria

The app is production ready when:
- [x] All critical issues are resolved (Phases 1-3 complete)
- [x] Test coverage is above 40% (200 tests across 11 files)
- [x] All CI checks pass (PR #101 merged)
- [x] No console.log statements in production code
- [x] Constraints and venue elements persist to database
- [x] Seating optimization algorithm is thoroughly tested (17 tests)
- [ ] Survey system fully implemented (Phase 4)
- [ ] Spatial constraints (near_front, accessibility) implemented (Phase 4)
