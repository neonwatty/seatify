# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

## Commands

```bash
npm run dev          # Start dev server (localhost:3000)
npm run build        # TypeScript check + Next.js build
npm run lint         # ESLint
npm run start        # Production server
```

## Architecture

**Framework**: Next.js 16 with App Router, Supabase for auth/database, deployed on Vercel.

**State**: Zustand store (`src/store/useStore.ts`) with localStorage persistence for local data. Server data loaded via `loadEvent()` method.

**Types** (`src/types/index.ts`): `Guest` (with relationships, table assignment), `Table` (shape variants), `VenueElement` (non-seating items), `Constraint` (seating rules), `Event` (top-level container).

**App Router Structure**:
- `/` - Landing page
- `/login`, `/signup` - Auth pages
- `/dashboard` - Event list (protected)
- `/dashboard/events/[eventId]/canvas` - Seating chart canvas (protected)

**Supabase Integration**:
- `src/lib/supabase/client.ts` - Browser client
- `src/lib/supabase/server.ts` - Server client with cookies
- `src/lib/supabase/middleware.ts` - Session refresh
- `supabase/schema.sql` - Database schema with RLS policies

**React Router Compatibility**: `src/lib/router-compat.tsx` provides `useNavigate`, `useLocation`, `Link`, `NavLink` wrappers for migrated components.

**Drag & Drop**: @dnd-kit handles guest-to-table assignment, table repositioning, and seat swapping.

**Optimization**: `optimizeSeating()` groups partners, scores relationships (partners +10, avoid -20), and assigns guests to tables greedily.

## Environment Variables

Copy `.env.local.example` to `.env.local` and configure:
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anon key
- `NEXT_PUBLIC_APP_URL` - App URL for OAuth redirects

## Database

Run `supabase/schema.sql` against your Supabase project to create tables:
- `profiles` - User profiles (auto-created on signup)
- `events` - User events with metadata
- `tables` - Table configurations per event
- `guests` - Guest list with seating assignments
- `guest_relationships` - Relationship mappings between guests
- `constraints` - Seating constraints
- `venue_elements` - Non-seating venue items

All tables have RLS policies for multi-tenant isolation.

## Planning Instructions

When asked to "make a plan", spawn at least 3 planning agents in parallel, each exploring different viewpoints, solutions, or technical decisions. After agents complete, examine all plans and either select the best one or combine excellent elements from multiple plans into a final consolidated plan.

## Pull Requests

After creating a PR, repeatedly check GitHub Actions workflows using `gh run list` and `gh run watch` until they succeed. Debug and fix any failures before considering the PR complete.

## Repository

This repository is hosted at `mean-weasel/seatify` with organization-level branch protection.
