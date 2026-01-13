# iOS Safari Workflows

> Auto-generated workflow documentation for Seatify (Web App in iOS Safari)
> Last updated: 2026-01-12
> Test URL: https://seatify-git-next-migration-jermwatts-projects.vercel.app

## Overview

Seatify is a responsive web application. These workflows test the mobile web experience in Safari on iOS Simulator, focusing on touch interactions, responsive layouts, and mobile-specific UI patterns.

## Quick Reference

| Workflow | Purpose | Steps |
|----------|---------|-------|
| Mobile Landing Page | Test responsive landing page | 6 |
| Mobile Authentication | Touch-friendly auth flows | 5 |
| Mobile Dashboard | Event list on mobile | 5 |
| Mobile Canvas - Basic | Canvas load and navigation | 6 |
| Mobile Touch Gestures | Pinch, pan, tap interactions | 7 |
| Mobile Guest Management | Add/manage guests on mobile | 6 |
| Mobile Table Interaction | Add/edit tables via touch | 6 |
| Mobile Context Menus | Long-press interactions | 5 |
| Mobile Sidebar | Collapsible sidebar behavior | 5 |
| Mobile Forms | Form input on touch devices | 5 |

---

## Simulator Setup

**Prerequisites for automation:**
- iOS Simulator: iPhone 15 Pro (or similar)
- Safari configured with:
  - JavaScript enabled
  - Cookies enabled
  - Pop-ups allowed for test domain
- Device orientation: Portrait (primary), Landscape (secondary tests)

**One-time Setup:**
1. Boot iOS Simulator
2. Open Safari
3. Navigate to test URL
4. Dismiss any "Add to Home Screen" prompts

---

## Core Workflows

### Workflow 1: Mobile Landing Page

> Tests the responsive landing page layout and interactions on mobile Safari.

1. Open landing page in Safari
   - Launch Safari on iOS Simulator
   - Navigate to https://seatify-git-next-migration-jermwatts-projects.vercel.app/
   - Wait for page to fully load
   - Verify page renders without horizontal scroll

2. Verify mobile hero section
   - Verify "Seatify" logo is visible and properly sized
   - Verify hero heading is readable (appropriate font size)
   - Verify "Start Planning Free" button is tap-friendly (44pt minimum)
   - Verify trust badges are visible

3. Test mobile navigation
   - Look for hamburger menu icon (if present)
   - Tap menu icon to expand navigation
   - Verify navigation options are visible
   - Tap outside to close menu

4. Scroll through content
   - Swipe up to scroll down the page
   - Verify feature cards stack vertically (not grid)
   - Verify images resize appropriately
   - Verify no horizontal overflow occurs

5. Test FAQ accordion
   - Scroll to FAQ section
   - Tap on a FAQ question
   - Verify answer expands with animation
   - Tap again to collapse
   - Verify touch targets are adequate size

6. Test CTA buttons
   - Tap "Start Planning Free" button
   - Verify navigation to appropriate page
   - Use back gesture (swipe from edge) to return
   - Verify page state is preserved

---

### Workflow 2: Mobile Authentication

> Tests login and signup forms on mobile Safari with touch keyboard.

1. Navigate to login page
   - Navigate to /login
   - Verify page loads in mobile layout
   - Verify form is centered and readable
   - Verify "Seatify" logo displays correctly

2. Test form input with touch keyboard
   - Tap on Email field
   - Verify iOS keyboard appears
   - Type email address using keyboard
   - Tap "Next" or tab to Password field
   - Type password
   - Tap "Done" to dismiss keyboard

3. Test form submission
   - Tap "Sign In" button
   - Verify button is responsive to touch
   - Verify loading state displays
   - Wait for response

4. Test Google OAuth button
   - Tap "Continue with Google" button
   - Verify OAuth popup or redirect initiates
   - [MANUAL] Complete Google sign-in if testing full flow
   - Verify return to app after OAuth

5. Test signup link navigation
   - Navigate to /login
   - Tap "Sign up" link
   - Verify navigation to signup page
   - Verify form renders correctly on mobile

---

### Workflow 3: Mobile Dashboard

> Tests the event list dashboard on mobile viewport.

**Prerequisites:**
- User is logged in

1. View dashboard on mobile
   - Navigate to /dashboard
   - Verify "My Events" heading is visible
   - Verify layout is single-column on mobile
   - Verify header fits mobile width

2. Test empty state (if applicable)
   - Verify empty state message is readable
   - Verify "New Event" button is prominent
   - Tap "New Event" button
   - Verify modal opens

3. Test create event modal
   - Verify modal fits mobile screen
   - Tap Event Name field
   - Type event name with keyboard
   - Tap Event Type dropdown
   - Verify dropdown is touch-friendly
   - Select an option
   - Tap "Create Event" button

4. View event cards
   - Verify event cards display correctly
   - Verify card text is readable
   - Verify edit/delete buttons are accessible
   - Tap on event card
   - Verify navigation to canvas

5. Test pull-to-refresh (if implemented)
   - Pull down from top of event list
   - Verify refresh indicator appears
   - Wait for refresh to complete

---

## Feature Workflows

### Workflow 4: Mobile Canvas - Basic

> Tests basic canvas functionality on mobile Safari.

**Prerequisites:**
- User has an event with tables

1. Load canvas on mobile
   - Navigate to event canvas page
   - Wait for canvas to fully load
   - Verify canvas renders without errors
   - Verify toolbar is visible (may be condensed)

2. Verify mobile toolbar
   - Look for mobile floating action button (FAB) or condensed toolbar
   - Tap FAB/menu button if present
   - Verify menu options appear
   - Verify "Add Table", "Add Guest" options accessible

3. View tables on canvas
   - Verify tables render at appropriate size
   - Verify table labels are readable
   - Verify table seat indicators are visible

4. Test single-finger pan
   - Touch and drag on empty canvas area
   - Verify canvas pans with finger movement
   - Release and verify position holds

5. Test zoom controls (buttons)
   - Locate zoom +/- buttons
   - Tap "+" to zoom in
   - Verify canvas zooms
   - Tap "-" to zoom out
   - Verify canvas zooms out

6. Test recenter button
   - Pan canvas away from tables
   - Tap recenter/home button
   - Verify canvas centers on content

---

### Workflow 5: Mobile Touch Gestures

> Tests pinch-zoom, two-finger pan, and other touch gestures.

**Prerequisites:**
- Event canvas is loaded

1. Test pinch-to-zoom
   - Place two fingers on canvas (simulated)
   - Pinch outward to zoom in
   - Verify canvas zooms in smoothly
   - Pinch inward to zoom out
   - Verify canvas zooms out

2. Test two-finger pan
   - Place two fingers on canvas
   - Drag both fingers in same direction
   - Verify canvas pans
   - Verify smooth movement

3. Test tap to select table
   - Single tap on a table
   - Verify table shows selection indicator
   - Tap on empty area
   - Verify selection clears

4. Test double-tap (if implemented)
   - Double-tap on empty canvas
   - Verify zoom-in behavior (if implemented)
   - Or verify no unintended action

5. Test tap on guest chip
   - Tap on guest in sidebar/list
   - Verify guest is selected
   - Verify selection UI feedback

6. Test scroll in sidebar
   - If sidebar is visible, swipe up/down in sidebar
   - Verify list scrolls independently of canvas
   - Verify momentum scrolling works

7. Verify gesture conflicts
   - Pan on canvas doesn't scroll page
   - Zoom on canvas doesn't trigger Safari zoom
   - No accidental navigation gestures

---

### Workflow 6: Mobile Guest Management

> Tests adding and managing guests on mobile.

**Prerequisites:**
- Event canvas is loaded

1. Open add guest form
   - Tap "Add Guest" button (may be in menu)
   - Verify modal/sheet slides up
   - Verify form fits mobile screen

2. Fill guest form with touch keyboard
   - Tap First Name field
   - Verify keyboard appears
   - Type "John"
   - Tap Next or tap Last Name field
   - Type "Smith"
   - Dismiss keyboard (tap Done or outside)

3. Select RSVP status
   - Tap RSVP Status dropdown/picker
   - Verify picker appears (iOS style or custom)
   - Select "Confirmed"
   - Verify selection shows

4. Toggle dietary restrictions
   - Scroll down in form if needed
   - Tap checkboxes for dietary restrictions
   - Verify checkboxes toggle correctly
   - Verify touch targets are adequate

5. Save guest
   - Tap "Add Guest" or "Save" button
   - Verify modal closes
   - Verify guest appears in list
   - Verify keyboard is dismissed

6. Edit guest on mobile
   - Tap on guest in list
   - Tap edit button or double-tap
   - Verify edit form opens with data
   - Make a change and save

---

### Workflow 7: Mobile Table Interaction

> Tests adding and interacting with tables on mobile.

**Prerequisites:**
- Event canvas is loaded

1. Add table via mobile menu
   - Tap mobile FAB/menu button
   - Tap "Add Table" or "Add Round Table"
   - Verify table appears on canvas
   - Verify table is visible in viewport

2. Select table with tap
   - Tap on the table
   - Verify selection state shows
   - Verify selection toolbar appears (if applicable)

3. Drag table to move
   - Touch and hold on selected table
   - Drag to new position
   - Verify table follows finger
   - Release to drop
   - Verify table stays at new position

4. Test table capacity display
   - Verify table shows seat count (e.g., "0/8")
   - Add a guest to table
   - Verify count updates (e.g., "1/8")

5. Access table options
   - Long-press on table
   - Verify context menu appears
   - Verify options are tap-friendly
   - Tap outside to dismiss

6. Delete table
   - Long-press on table
   - Tap "Delete" option
   - Verify confirmation (if any)
   - Confirm deletion
   - Verify table removed

---

### Workflow 8: Mobile Context Menus

> Tests long-press context menus throughout the app.

**Prerequisites:**
- Event with tables and guests

1. Context menu on table
   - Long-press on a table (hold ~500ms)
   - Verify context menu appears
   - Verify menu options are readable
   - Verify adequate touch targets
   - Tap outside to dismiss

2. Context menu on guest
   - Long-press on guest in sidebar
   - Verify context menu appears
   - Verify "Edit", "Delete" options visible
   - Tap an option to test action

3. Context menu on canvas
   - Long-press on empty canvas area
   - Verify context menu appears
   - Verify "Add Table" options present
   - Tap "Add Round Table"
   - Verify table added

4. Context menu on seated guest
   - Long-press on guest seated at table
   - Verify context menu shows
   - Verify "Remove from Table" option
   - Test the action

5. Dismiss context menu
   - Open any context menu
   - Tap outside the menu
   - Verify menu dismisses
   - Verify no action triggered

---

### Workflow 9: Mobile Sidebar

> Tests the collapsible sidebar on mobile.

**Prerequisites:**
- Event canvas is loaded

1. Check sidebar visibility
   - On narrow viewport, sidebar may be collapsed
   - Look for sidebar toggle button (hamburger or guests icon)
   - Note initial state

2. Toggle sidebar open
   - Tap sidebar toggle button
   - Verify sidebar slides in or expands
   - Verify sidebar content is visible
   - Verify guest list shows

3. Interact with sidebar content
   - Scroll within sidebar (swipe up/down)
   - Verify independent scroll from canvas
   - Tap on a guest
   - Verify selection works

4. Toggle sidebar closed
   - Tap sidebar toggle button again
   - Verify sidebar collapses/slides out
   - Verify canvas has more space
   - Verify toggle button remains accessible

5. Test sidebar in landscape
   - Rotate device to landscape
   - Verify sidebar behavior adapts
   - Verify content remains accessible
   - Rotate back to portrait

---

### Workflow 10: Mobile Forms

> Tests form interactions specific to mobile Safari.

**Prerequisites:**
- Various forms accessible (guest form, event form)

1. Test keyboard appearance
   - Tap on text input field
   - Verify iOS keyboard slides up
   - Verify form scrolls to keep input visible
   - Verify input is not obscured

2. Test keyboard types
   - Tap email field
   - Verify email keyboard shows (@ symbol accessible)
   - Tap number field (if any)
   - Verify numeric keyboard shows

3. Test form scrolling
   - Open long form (guest form with all fields)
   - With keyboard open, scroll within form
   - Verify smooth scrolling
   - Verify can reach all fields

4. Test dropdown/picker
   - Tap on dropdown field (Event Type, RSVP)
   - Verify iOS-style picker or custom dropdown
   - Select an option
   - Verify selection applies
   - Verify picker dismisses

5. Test form submission
   - Fill required fields
   - Tap submit button
   - Verify keyboard dismisses (if open)
   - Verify success feedback
   - Verify navigation/modal behavior

---

## Edge Case Workflows

### Workflow 11: Mobile Orientation Changes

> Tests app behavior when device orientation changes.

1. Load canvas in portrait
   - Open canvas page in portrait orientation
   - Note current layout and element positions

2. Rotate to landscape
   - Rotate device to landscape
   - Verify layout adapts without breaking
   - Verify canvas content remains visible
   - Verify toolbar repositions appropriately

3. Interact in landscape
   - Pan and zoom canvas
   - Verify gestures work correctly
   - Select a table
   - Verify selection works

4. Rotate back to portrait
   - Rotate device back to portrait
   - Verify layout returns to mobile-optimized view
   - Verify no content is lost
   - Verify zoom level is appropriate

5. Test form in both orientations
   - Open guest form in portrait
   - Start filling out form
   - Rotate to landscape
   - Verify form data persists
   - Verify keyboard adapts

---

### Workflow 12: Mobile Safari Navigation

> Tests Safari-specific navigation behaviors.

1. Test back gesture
   - Navigate from dashboard to canvas
   - Swipe from left edge to trigger back
   - Verify navigation back to dashboard
   - Verify state is preserved

2. Test forward navigation
   - After going back, swipe from right edge
   - Verify forward navigation works
   - Verify canvas reloads correctly

3. Test Safari tab behavior
   - Open new Safari tab
   - Return to app tab
   - Verify app state is preserved
   - Verify no re-authentication needed

4. Test page reload
   - On canvas page, pull down to reload (or tap reload)
   - Verify page reloads successfully
   - Verify data persists (from server)

5. Test "Add to Home Screen" (if PWA)
   - Tap Safari share button
   - Select "Add to Home Screen"
   - [MANUAL] Verify app icon appears on home screen
   - [MANUAL] Launch from home screen
   - [MANUAL] Verify standalone experience

---

### Workflow 13: Mobile Error Handling

> Tests error states and offline behavior on mobile.

1. Test network error
   - Enable Airplane Mode in Simulator
   - Try to perform an action (save guest)
   - Verify error message appears
   - Verify error is readable on mobile
   - Disable Airplane Mode

2. Test slow network
   - [MANUAL] Throttle network in Simulator settings
   - Load canvas page
   - Verify loading indicators appear
   - Verify no timeout/crash on slow load

3. Test form validation
   - Open guest form
   - Leave required fields empty
   - Tap Save
   - Verify validation errors appear
   - Verify error messages fit mobile screen

4. Test session expiry
   - [MANUAL] Wait for session to expire (or clear cookies)
   - Try to access protected page
   - Verify redirect to login
   - Verify no app crash

5. Test 404 page
   - Navigate to non-existent URL
   - Verify 404 page displays correctly on mobile
   - Verify navigation options available

---

## Notes for Test Automation

### iOS Simulator MCP Usage

**Supported Actions:**
- `ui_tap` - Tap at coordinates
- `ui_type` - Type ASCII text
- `ui_swipe` - Swipe gestures
- `ui_describe_all` - Get accessibility tree
- `screenshot` - Capture current state

**Limitations:**
- Emoji and special characters not supported in `ui_type`
- System dialogs (permissions) require manual setup
- Pinch-to-zoom must be simulated via buttons
- Safari navigation gestures may need coordinate-based swipes

### Recommended Viewport
- iPhone 15 Pro: 393 x 852 points
- iPhone SE: 375 x 667 points (test small screens)
- iPad: Test responsive breakpoints separately

### Pre-Configuration for Safari
1. Settings > Safari > Clear History and Website Data
2. Navigate to test URL
3. Allow any permission prompts
4. Sign in to test account
5. Save credentials if testing auth flows repeatedly
