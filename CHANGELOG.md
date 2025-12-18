# Changelog

All notable changes to TableCraft will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.8.0] - 2025-12-17

### Added
- Platform detection for CSV imports - automatically detects Zola and RSVPify exports
- Platform-specific column mappings for improved auto-detection accuracy
- Platform hint displayed in import wizard showing detected source (with confidence indicator)
- Platform messaging on landing page and import wizard showing supported platforms
- Coming soon indicators for Joy, The Knot, and Eventbrite platforms
- E2E test fixtures for RSVPify and Zola CSV formats
- 11 new E2E tests for platform detection and landing page messaging

## [0.7.0] - 2025-12-17

### Added
- Event list view toggle - switch between card view and list view
- List view displays events in a table format with Name, Type, Date, Guests, Tables columns
- View preference persists to localStorage
- Responsive mobile design with icons-only toggle and stacked list rows
- 10 new E2E tests for view toggle functionality

## [0.6.0] - 2025-12-16

### Added
- Multi-event support - manage up to 10 events in one app
- Event list view as the new main entry point after landing page
- Event creation modal with name, type, date, and venue information
- Event editing to update event metadata anytime
- Event deletion with confirmation dialog
- Back navigation button to return to event list from any event
- Venue information fields (name, address, capacity limit) for events
- Event timestamps (createdAt, updatedAt) for sorting
- Event cards display guest count, table count, and event type badges
- 29 new E2E tests for multi-event functionality

### Changed
- App flow: Landing page → Event list → Event canvas (instead of directly to canvas)
- Store state refactored to use `events[]` array instead of single `event`
- Data migration from v10 to v11 automatically converts existing single event
- Header shows back button and event name only when inside an event

### Fixed
- Re-enabled keyboard-shortcuts.spec.ts and toast-notifications.spec.ts test suites
- Updated all E2E test helpers to handle new multi-event navigation flow
- Fixed test assertions to work with demo data instead of requiring fresh state

## [0.5.0] - 2025-12-16

### Added
- Table Assignment step in import wizard - optionally create tables and assign guests during import
- Table shape selection (round, rectangle, square, oval, half-round, serpentine)
- Adjustable table capacity with smart shape-based defaults
- Auto-calculated table count based on guest count and capacity
- Four distribution strategies: Distribute Evenly, Keep Groups Together, Smart Optimization, Don't Assign
- Live preview of table assignments before importing
- Batch table creation via new `addTables` store function
- Marquee selection for selecting multiple tables/guests on canvas
- 32 new E2E tests for Table Assignment feature

## [0.4.1] - 2025-12-16

### Fixed
- Mobile viewport detection now uses CSS media queries (matchMedia) for reliable breakpoint detection in headless browsers
- Mobile E2E tests now run reliably in CI with proper device emulation
- Re-added e2e-mobile CI job that runs mobile-specific tests with Mobile Chrome project

## [0.4.0] - 2025-12-15

### Added
- CSV/Excel import wizard for bulk guest import with smart column detection
- Auto-detection of common guest fields (First Name, Last Name, Email, Group, etc.)
- Full Name column splitting - automatically separates "John Smith" into first/last name
- Wedding-specific column support (Partner, RSVP Status, Meal Choice, Plus One)
- Corporate event columns (Company, Title, Department)
- Preview and validation step before importing
- Ability to exclude specific rows from import
- Mobile-friendly hamburger menu for toolbar on small screens
- Mobile bottom navigation bar for quick view switching
- Shared E2E test utilities for mobile-aware testing

### Changed
- Guest data model now uses separate firstName/lastName fields
- Toolbar adapts to mobile viewport with hamburger menu pattern
- E2E tests updated to support both mobile and desktop viewports

### Fixed
- Mobile tests now properly interact with hamburger menu instead of desktop toolbar
- Grid controls tests skip appropriately on mobile viewports
- Mouse wheel tests skip on mobile WebKit (unsupported)

## [0.3.0] - 2025-12-15

### Added
- Redesigned landing page with warm, inviting visual theme
- Feature cards highlighting Smart Seating, Visual Floor Plans, and Works Everywhere
- Use case tags showing versatility (Weddings, Corporate, Galas, etc.)
- Coming Soon section previewing AI-Powered Seating and Guest Import features
- Email capture with Google Forms integration for updates
- Social preview image for sharing on Twitter, LinkedIn, and Facebook
- SEO meta tags for better discoverability
- Privacy trust line in footer reassuring users about local data storage
- Comprehensive E2E test suite for landing page (30 new tests)

### Changed
- Updated header branding to match landing page style with script font for "Craft"
- CTA button text changed from "Launch App" to "Start Planning Free"
- Page title updated to "TableCraft - Free Event Seating Chart Planner"

## [0.2.0] - 2025-12-10

### Added
- Dark mode toggle - switch between light, dark, and system themes
- Theme preference persists across sessions via localStorage
- E2E tests for theme toggle functionality

### Fixed
- Toast notification text contrast now readable in both light and dark modes

## [0.1.0] - 2025-12-09

### Added
- Highlight animation for newly created tables with pulsing glow effect
- Highlight animation for newly created guests with visual feedback
- Auto-selection and canvas panning to newly added guests
- E2E tests for new table visibility animations
- E2E tests for new guest visibility animations

### Changed
- Add Table dropdown now opens to the right instead of left for better UX

### Fixed
- Improved canvas zoom default to better showcase tables
- Add Table dropdown now properly appears above canvas elements
