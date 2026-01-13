# Browser Workflows

> Auto-generated workflow documentation for Seatify
> Last updated: 2026-01-12

## Quick Reference

| Workflow | Purpose | Steps |
|----------|---------|-------|
| First-Time User Onboarding | Landing to dashboard flow | 8 |
| Returning User Login | Email and Google OAuth login | 6 |
| Create New Event | Create event from dashboard | 5 |
| Add and Configure Tables | Add tables to canvas | 7 |
| Add and Manage Guests | Guest CRUD operations | 8 |
| Assign Guests to Tables | Drag-drop and batch assignment | 6 |
| Define Guest Relationships | Create guest relationships | 5 |
| Optimize Seating | Run seating algorithm | 5 |
| Canvas Navigation | Pan, zoom, search | 6 |
| Multi-Select Operations | Batch operations | 5 |
| Import Guests | CSV/Excel import | 6 |
| Export and Share | Export JSON, share link | 5 |
| Empty States | New event validation | 4 |
| Delete Operations | Delete guests, tables, events | 6 |
| Undo/Redo Operations | History functionality | 5 |

---

## Core Workflows

### Workflow 1: First-Time User Onboarding

> Tests the complete journey from landing page to creating first event.

**Prerequisites:**
- User has no existing account
- Browser at landing page URL

1. View the landing page
   - Navigate to https://seatify-git-next-migration-jermwatts-projects.vercel.app/
   - Verify "Seatify" logo displays in Caveat font (coral/salmon color)
   - Verify hero section shows "Free Seating Chart Maker" heading
   - Verify "Start Planning Free" button is visible
   - Verify trust badges appear: "100% Private", "No Signup", "No Credit Card"

2. Explore features section
   - Scroll down to view feature cards
   - Verify "Smart Seating" feature card is visible
   - Verify "Visual Floor Plans" feature card is visible
   - Verify "Works Everywhere" feature card is visible

3. View FAQ section
   - Scroll to FAQ section
   - Click on first FAQ question to expand
   - Verify answer content appears
   - Click again to collapse
   - Verify answer collapses

4. Navigate to signup
   - Click "Sign up" link in navigation or footer
   - Verify signup page loads
   - Verify "Seatify" logo displays correctly
   - Verify "Create your account" heading appears

5. Complete signup form
   - Type test email in the Email field
   - Type password (min 6 characters) in Password field
   - Type same password in Confirm Password field
   - Click "Create Account" button
   - Verify loading state shows "Creating account..."

6. Handle email verification (if enabled)
   - [MANUAL] Check email for verification link
   - [MANUAL] Click verification link
   - Verify redirect to login or dashboard

7. Access dashboard
   - After verification, navigate to /dashboard
   - Verify dashboard loads with "My Events" heading
   - Verify empty state shows "Create your first event"

8. Verify final state
   - Verify user is logged in (user menu visible in header)
   - Verify "New Event" button is visible
   - Verify dashboard header shows "Seatify" logo

---

### Workflow 2: Returning User Login

> Tests login flow with email/password and Google OAuth.

**Prerequisites:**
- User has existing account

1. Navigate to login page
   - Navigate to /login
   - Verify "Seatify" logo displays in Caveat font
   - Verify "Welcome back" heading appears
   - Verify email and password fields are visible

2. Test email/password login
   - Type email in Email field
   - Type password in Password field
   - Click "Sign In" button
   - Verify loading state shows "Signing in..."

3. Verify successful login
   - Verify redirect to /dashboard
   - Verify "My Events" heading appears
   - Verify user menu shows in header

4. Test Google OAuth login (alternative flow)
   - Navigate to /login
   - Click "Continue with Google" button
   - [MANUAL] Select Google account in popup
   - [MANUAL] Authorize access
   - Verify redirect to /dashboard after OAuth callback

5. Test login error handling
   - Navigate to /login
   - Type invalid email/password
   - Click "Sign In" button
   - Verify error message appears (red text)

6. Test signup link
   - Verify "Don't have an account? Sign up" link works
   - Click "Sign up" link
   - Verify navigation to /signup page

---

### Workflow 3: Create New Event

> Tests creating a new event from the dashboard.

**Prerequisites:**
- User is logged in
- User is on dashboard page

1. Open create event modal
   - Navigate to /dashboard
   - Click "New Event" button
   - Verify modal appears with "Create New Event" heading
   - Verify form fields: Event Name, Event Type dropdown

2. Fill event details
   - Type "Test Wedding" in Event Name field
   - Click Event Type dropdown
   - Select "Wedding" from options
   - Verify selection shows in dropdown

3. Submit event creation
   - Click "Create Event" button
   - Verify loading state on button
   - Verify modal closes on success

4. Verify event created
   - Verify redirect to canvas page (/dashboard/events/[id]/canvas)
   - Verify event name "Test Wedding" shows in header
   - Verify canvas loads with empty state (no tables)

5. Return to dashboard
   - Click back button or "My Events" link
   - Verify new event card appears in dashboard
   - Verify event card shows name "Test Wedding"
   - Verify event card shows "0 tables, 0 guests"

---

## Feature Workflows

### Workflow 4: Add and Configure Tables

> Tests adding round and rectangle tables to the canvas.

**Prerequisites:**
- User has an event open on canvas page

1. Add round table via toolbar
   - Locate "Add" dropdown button in toolbar
   - Click "Add" dropdown
   - Select "Round Table" option
   - Verify round table appears on canvas
   - Verify table shows "0/8" capacity indicator

2. Add rectangle table via toolbar
   - Click "Add" dropdown again
   - Select "Rectangle Table" option
   - Verify rectangle table appears on canvas
   - Verify table shows "0/10" capacity indicator

3. Add table via context menu
   - Right-click on empty canvas area
   - Verify context menu appears
   - Click "Add Round Table" option
   - Verify new round table appears at click location

4. Select and move table
   - Click on a table to select it
   - Verify table shows selection border
   - Drag table to new position
   - Verify table moves with cursor
   - Release to drop table
   - Verify table stays at new position

5. Edit table properties
   - Double-click on table, OR right-click and select "Edit"
   - Verify properties panel appears
   - Change table name in name field
   - Change capacity using number input
   - Verify changes reflect on table display

6. Rotate table (rectangle)
   - Select a rectangle table
   - Locate rotation handle or control
   - Drag to rotate, OR use rotation input
   - Verify table rotates on canvas

7. Verify final state
   - Verify all added tables are visible on canvas
   - Verify table count updates in toolbar/header
   - Verify tables can be panned into view

---

### Workflow 5: Add and Manage Guests

> Tests guest creation and editing flow.

**Prerequisites:**
- User has an event open on canvas page

1. Open add guest form
   - Click "Add Guest" button in toolbar or sidebar
   - Verify guest form modal appears
   - Verify "Add Guest" heading shows

2. Fill guest basic info
   - Type "John" in First Name field
   - Type "Smith" in Last Name field
   - Type "john@example.com" in Email field
   - Verify fields accept input

3. Set RSVP status
   - Locate RSVP Status dropdown
   - Click dropdown and select "Confirmed"
   - Verify selection shows "Confirmed"

4. Add dietary restrictions
   - Locate Dietary Restrictions section
   - Check "Vegetarian" checkbox
   - Check "Gluten-Free" checkbox
   - Verify checkboxes are checked

5. Save guest
   - Click "Add Guest" or "Save" button
   - Verify modal closes
   - Verify guest appears in sidebar guest list
   - Verify guest shows as "Unassigned"

6. Edit existing guest
   - Click on guest in sidebar to select
   - Double-click or click edit button
   - Verify guest form opens with existing data
   - Modify last name to "Johnson"
   - Click "Save Changes" button
   - Verify name updates in sidebar

7. Add guest via quick add
   - Click "Add Guest" button
   - Type "Jane Doe" in name fields
   - Click "Save & Add Another" button
   - Verify form clears but stays open
   - Type another guest "Bob Wilson"
   - Click "Add Guest" to save and close

8. Verify guest list
   - Verify all guests appear in sidebar
   - Verify guest count updates
   - Verify unassigned guests section shows guests

---

### Workflow 6: Assign Guests to Tables

> Tests drag-drop guest assignment and batch assignment.

**Prerequisites:**
- Event has at least 2 tables and 4 guests

1. Drag guest to table
   - Locate unassigned guest in sidebar
   - Click and drag guest toward a table
   - Verify table highlights when hovering over it
   - Drop guest on table
   - Verify guest appears at table seat
   - Verify guest moves from "Unassigned" to "Assigned" section

2. Drag guest to swap seats
   - Drag an assigned guest to a different table
   - Drop on table with available seats
   - Verify guest moves to new table
   - Verify previous table shows freed seat

3. Swap two guests
   - Drag an assigned guest over another assigned guest
   - Verify swap indicator appears
   - Drop to complete swap
   - Verify guests exchange positions

4. Unassign guest from table
   - Right-click on seated guest
   - Select "Remove from Table" or "Unassign"
   - Verify guest moves back to sidebar unassigned list
   - Verify table seat count decreases

5. Batch assign multiple guests
   - Hold Ctrl/Cmd and click multiple guests in sidebar
   - Verify multiple guests are selected
   - Locate "Assign to Table" dropdown in selection toolbar
   - Select target table from dropdown
   - Verify all selected guests assign to table

6. Verify final state
   - Verify table seat counts are accurate
   - Verify assigned/unassigned sections are correct
   - Verify no duplicate guest assignments

---

### Workflow 7: Define Guest Relationships

> Tests creating relationships between guests.

**Prerequisites:**
- Event has at least 3 guests

1. Open guest for editing
   - Double-click on a guest in sidebar
   - Verify guest form modal opens
   - Scroll to "Relationships" section

2. Add partner relationship
   - Click "Add Relationship" button
   - Select another guest from dropdown
   - Select "Partner" from relationship type dropdown
   - Set strength slider to 5 (highest)
   - Click "Add" button
   - Verify relationship appears in list

3. Add colleague relationship
   - Click "Add Relationship" button again
   - Select a different guest
   - Select "Colleague" from type dropdown
   - Set strength to 3
   - Click "Add" button
   - Verify second relationship appears

4. Add "avoid" relationship
   - Click "Add Relationship" button
   - Select another guest
   - Select "Avoid" from type dropdown
   - Set strength to 5
   - Click "Add" button
   - Verify avoid relationship shows (possibly with warning styling)

5. Save and verify
   - Click "Save Changes" button
   - Verify modal closes
   - Re-open guest to verify relationships persisted
   - Verify all three relationships show

---

### Workflow 8: Optimize Seating

> Tests the seating optimization algorithm.

**Prerequisites:**
- Event has multiple tables with capacity
- Event has multiple guests with some relationships defined
- Some guests should be assigned, some unassigned

1. Review pre-optimization state
   - Note current seating arrangement
   - Note guests with relationships
   - Verify "Optimize" button is visible in toolbar

2. Run optimization
   - Click "Optimize" button in toolbar
   - Verify loading state appears
   - Wait for optimization to complete
   - Verify success feedback (toast or visual)

3. Review optimized seating
   - Verify guests have been reassigned
   - Verify partners are seated together (same table)
   - Verify "avoid" relationships are separated

4. Test reset/undo optimization
   - Locate "Reset" button (appears after optimization)
   - Click "Reset" button
   - Verify seating reverts to pre-optimization state

5. Verify scoring
   - Run optimization again
   - Check if seating score indicator shows improvement
   - Verify relationship-based assignments

---

### Workflow 9: Canvas Navigation

> Tests pan, zoom, and navigation features.

**Prerequisites:**
- Event has tables on canvas

1. Test zoom controls
   - Locate zoom controls (+ / - buttons)
   - Click "+" button to zoom in
   - Verify canvas zooms in
   - Click "-" button to zoom out
   - Verify canvas zooms out

2. Test scroll wheel zoom
   - Hold Ctrl/Cmd key
   - Scroll mouse wheel up
   - Verify canvas zooms in
   - Scroll mouse wheel down
   - Verify canvas zooms out

3. Test pan/drag
   - Click and drag on empty canvas area
   - Verify canvas pans with cursor
   - Release and verify position holds

4. Test recenter button
   - Pan canvas far from center
   - Click recenter button (target icon)
   - Verify canvas centers on content

5. Test guest search
   - Click on search input in canvas
   - Type a guest name
   - Verify matching guest highlights
   - Verify canvas pans to show highlighted guest

6. Test minimap navigation (if available)
   - Locate minimap in corner
   - Click on different area of minimap
   - Verify canvas pans to that area

---

### Workflow 10: Multi-Select Operations

> Tests selecting and operating on multiple items.

**Prerequisites:**
- Event has at least 4 tables

1. Marquee select tables
   - Click and drag on empty canvas to start marquee
   - Drag selection box over multiple tables
   - Release to complete selection
   - Verify multiple tables show selection state

2. Ctrl/Cmd click multi-select
   - Click on one table to select
   - Ctrl/Cmd + click on another table
   - Verify both tables are selected
   - Ctrl/Cmd + click on first table again
   - Verify first table deselects

3. Select all tables
   - Right-click on canvas
   - Click "Select All Tables" in context menu
   - Verify all tables are selected

4. Batch delete tables
   - Select multiple tables
   - Locate delete button in selection toolbar
   - Click delete button
   - Verify confirmation appears (if any)
   - Confirm deletion
   - Verify selected tables are removed

5. Clear selection
   - Select multiple items
   - Click on empty canvas area
   - Verify selection clears
   - Or click "Clear" button in selection toolbar

---

### Workflow 11: Import Guests

> Tests importing guests from CSV/Excel file.

**Prerequisites:**
- User has a CSV file with guest data
- Columns: First Name, Last Name, Email (optional)

1. Open import wizard
   - Click "Import" button in toolbar
   - Verify import wizard modal opens
   - Verify file upload area is visible

2. Upload file
   - [MANUAL] Click to browse or drag CSV/Excel file
   - [MANUAL] Select file from system dialog
   - Verify file uploads and preview appears

3. Map columns
   - Verify column mapping interface shows
   - Map "First Name" column to First Name field
   - Map "Last Name" column to Last Name field
   - Map "Email" column to Email field (if present)

4. Preview import
   - Verify preview shows mapped guest data
   - Verify row count matches file
   - Check for any validation errors

5. Complete import
   - Click "Import" or "Confirm" button
   - Verify loading state during import
   - Verify success message appears

6. Verify imported guests
   - Close import wizard
   - Verify new guests appear in sidebar
   - Verify guest count increased
   - Spot check a few imported names

---

### Workflow 12: Export and Share

> Tests exporting event data and sharing.

**Prerequisites:**
- Event has tables and guests

1. Export event as JSON
   - Click "Export" button in toolbar
   - [MANUAL] Verify file download starts
   - [MANUAL] Check downloaded JSON contains event data

2. Open share modal
   - Click "Share" button in header
   - Verify share modal opens
   - Verify shareable URL is displayed

3. Copy share link
   - Click "Copy" button next to URL
   - Verify "Copied!" feedback appears
   - [MANUAL] Paste elsewhere to verify link copied

4. Toggle QR code
   - Click "Show QR Code" toggle
   - Verify QR code image appears
   - Verify QR code is scannable

5. Close and verify
   - Click close button or outside modal
   - Verify modal closes
   - Navigate to shared URL to verify it works

---

## Edge Case Workflows

### Workflow 13: Empty States

> Tests empty state displays and prompts.

**Prerequisites:**
- User is logged in

1. View empty dashboard
   - Navigate to /dashboard with no events
   - Verify empty state message appears
   - Verify "Create your first event" prompt
   - Verify "New Event" button is prominent

2. View empty canvas
   - Create new event
   - Verify canvas shows empty state
   - Verify "Add your first table" prompt or hint
   - Verify toolbar is accessible

3. View empty guest list
   - On canvas with tables but no guests
   - Check sidebar guest section
   - Verify "No guests yet" message
   - Verify "Add Guest" button is prominent

4. Verify calls-to-action work
   - Click empty state CTA buttons
   - Verify appropriate action triggers (add table, add guest, etc.)

---

### Workflow 14: Delete Operations

> Tests deletion of guests, tables, and events.

**Prerequisites:**
- Event has guests and tables

1. Delete single guest
   - Right-click on guest in sidebar
   - Select "Delete Guest" option
   - Verify confirmation dialog (if any)
   - Confirm deletion
   - Verify guest removed from list

2. Delete single table
   - Right-click on table
   - Select "Delete Table" option
   - Verify confirmation if table has guests
   - Confirm deletion
   - Verify table removed from canvas
   - Verify seated guests become unassigned

3. Batch delete guests
   - Select multiple guests in sidebar
   - Click delete button in selection toolbar
   - Confirm batch deletion
   - Verify all selected guests removed

4. Delete event from dashboard
   - Navigate to /dashboard
   - Click delete button on event card (trash icon)
   - Verify confirmation modal appears
   - Confirm deletion
   - Verify event removed from list

5. Cancel delete operation
   - Initiate a delete action
   - Click "Cancel" on confirmation
   - Verify item is NOT deleted
   - Verify item remains in place

6. Verify cascade behavior
   - Delete a table with assigned guests
   - Verify guests are unassigned (not deleted)
   - Verify guest data preserved

---

### Workflow 15: Undo/Redo Operations

> Tests history undo and redo functionality.

**Prerequisites:**
- Event is open on canvas

1. Make undoable action
   - Add a new table to canvas
   - Verify table appears
   - Note table position

2. Undo action
   - Click Undo button in toolbar, OR press Cmd/Ctrl+Z
   - Verify table disappears
   - Verify canvas state reverts

3. Redo action
   - Click Redo button, OR press Cmd/Ctrl+Shift+Z
   - Verify table reappears
   - Verify table in same position

4. Multiple undo steps
   - Add table, then add guest, then move table
   - Undo three times
   - Verify each action reverts in order
   - Redo to restore

5. Verify undo limit
   - Perform many actions (more than history limit)
   - Attempt to undo all
   - Verify undo stops at history limit
   - Verify no errors occur

---

## Mobile-Specific Workflows

> Note: These workflows test mobile/touch interactions.

### Workflow M1: Mobile Canvas Interaction

**Prerequisites:**
- Open app on mobile device or in mobile viewport

1. Touch to select table
   - Tap on a table
   - Verify selection state shows

2. Long press for context menu
   - Long press on table
   - Verify context menu appears
   - Tap outside to dismiss

3. Pinch to zoom
   - Two-finger pinch outward
   - Verify canvas zooms in
   - Pinch inward to zoom out

4. Two-finger pan
   - Place two fingers on canvas
   - Drag to pan
   - Verify canvas moves

5. Mobile toolbar
   - Locate floating action button (FAB)
   - Tap to open mobile menu
   - Verify menu options appear

---

## Notes for Test Automation

### Browser Requirements
- Chrome recommended (Claude-in-Chrome compatible)
- Viewport: 1280x800 minimum for desktop tests
- Mobile tests: 390x844 (iPhone viewport)

### Test Data
- Use unique email addresses for signup tests
- CSV import file should have 5-10 guests minimum
- Events should have 3-5 tables for multi-select tests

### Known Limitations
- File upload/download requires [MANUAL] intervention
- Google OAuth popup requires [MANUAL] completion
- Email verification requires [MANUAL] email check
- Browser permission dialogs cannot be automated
