'use client';

import { useCallback } from 'react';
import { useStore } from '@/store/useStore';
import { insertTable, updateTable, deleteTable, type TableInput } from '@/actions/tables';
import { insertGuests, updateGuests, deleteGuests, insertRelationships, deleteRelationship, type GuestInput } from '@/actions/guests';
import {
  insertConstraint,
  updateConstraint as updateConstraintAction,
  deleteConstraint as deleteConstraintAction,
} from '@/actions/constraints';
import {
  insertVenueElement,
  updateVenueElement as updateVenueElementAction,
  deleteVenueElement as deleteVenueElementAction,
} from '@/actions/venueElements';
import type { TableShape, Guest, RelationshipType, Constraint, VenueElement } from '@/types';

/**
 * Hook that provides store actions with automatic Supabase persistence.
 * Use this instead of directly calling store methods when you want changes
 * to be saved to the database.
 */
export function useSyncToSupabase() {
  const store = useStore();
  const eventId = store.event.id;
  const isAuthenticated = eventId && eventId !== 'default';

  // Table operations with persistence
  const addTableWithSync = useCallback(async (shape: TableShape, x: number, y: number) => {
    // Track demo action if in demo mode
    if (store.isDemo) {
      store.trackDemoAction('addedTable');
    }

    // Add to local store first (optimistic update)
    store.addTable(shape, x, y);

    // Get the newly added table from the store
    const tables = useStore.getState().event.tables;
    const newTable = tables[tables.length - 1];

    // Persist to Supabase if authenticated
    if (isAuthenticated && newTable) {
      const tableInput: TableInput = {
        id: newTable.id,
        name: newTable.name,
        shape: newTable.shape,
        capacity: newTable.capacity,
        x: newTable.x,
        y: newTable.y,
        width: newTable.width,
        height: newTable.height,
        rotation: newTable.rotation,
      };

      const result = await insertTable(eventId, tableInput);
      if (result.error) {
        console.error('Failed to persist table:', result.error);
      }
    }
  }, [store, eventId, isAuthenticated]);

  const updateTableWithSync = useCallback(async (
    id: string,
    updates: Partial<{ name: string; shape: TableShape; capacity: number; x: number; y: number; width: number; height: number; rotation: number }>
  ) => {
    // Update local store first
    store.updateTable(id, updates);

    // Persist to Supabase if authenticated
    if (isAuthenticated) {
      const table = useStore.getState().event.tables.find(t => t.id === id);
      if (table) {
        const tableInput: TableInput = {
          id: table.id,
          name: table.name,
          shape: table.shape,
          capacity: table.capacity,
          x: table.x,
          y: table.y,
          width: table.width,
          height: table.height,
          rotation: table.rotation,
        };

        const result = await updateTable(eventId, tableInput);
        if (result.error) {
          console.error('Failed to persist table update:', result.error);
        }
      }
    }
  }, [store, eventId, isAuthenticated]);

  const removeTableWithSync = useCallback(async (id: string) => {
    // Remove from local store first
    store.removeTable(id);

    // Persist to Supabase if authenticated
    if (isAuthenticated) {
      const result = await deleteTable(eventId, id);
      if (result.error) {
        console.error('Failed to delete table from database:', result.error);
      }
    }
  }, [store, eventId, isAuthenticated]);

  const moveTableWithSync = useCallback(async (id: string, x: number, y: number) => {
    // Move in local store first
    store.moveTable(id, x, y);

    // Persist to Supabase if authenticated
    if (isAuthenticated) {
      const table = useStore.getState().event.tables.find(t => t.id === id);
      if (table) {
        const tableInput: TableInput = {
          id: table.id,
          name: table.name,
          shape: table.shape,
          capacity: table.capacity,
          x: table.x,
          y: table.y,
          width: table.width,
          height: table.height,
          rotation: table.rotation,
        };

        const result = await updateTable(eventId, tableInput);
        if (result.error) {
          console.error('Failed to persist table move:', result.error);
        }
      }
    }
  }, [store, eventId, isAuthenticated]);

  // Guest operations with persistence
  const addGuestWithSync = useCallback(async (guest: Omit<Guest, 'id' | 'relationships' | 'rsvpStatus'>) => {
    // Add to local store first
    const guestId = store.addGuest(guest);

    // Get the newly added guest
    const newGuest = useStore.getState().event.guests.find(g => g.id === guestId);

    // Persist to Supabase if authenticated
    if (isAuthenticated && newGuest) {
      const guestInput: GuestInput = {
        id: newGuest.id,
        firstName: newGuest.firstName,
        lastName: newGuest.lastName,
        email: newGuest.email,
        company: newGuest.company,
        jobTitle: newGuest.jobTitle,
        industry: newGuest.industry,
        profileSummary: newGuest.profileSummary,
        group: newGuest.group,
        rsvpStatus: newGuest.rsvpStatus,
        notes: newGuest.notes,
        tableId: newGuest.tableId,
        seatIndex: newGuest.seatIndex,
        interests: newGuest.interests,
        dietaryRestrictions: newGuest.dietaryRestrictions,
        accessibilityNeeds: newGuest.accessibilityNeeds,
      };

      const result = await insertGuests(eventId, [guestInput]);
      if (result.error) {
        console.error('Failed to persist guest:', result.error);
      }
    }

    return guestId;
  }, [store, eventId, isAuthenticated]);

  const updateGuestWithSync = useCallback(async (id: string, updates: Partial<Guest>) => {
    // Update local store first
    store.updateGuest(id, updates);

    // Persist to Supabase if authenticated
    if (isAuthenticated) {
      const guest = useStore.getState().event.guests.find(g => g.id === id);
      if (guest) {
        const guestInput: GuestInput = {
          id: guest.id,
          firstName: guest.firstName,
          lastName: guest.lastName,
          email: guest.email,
          company: guest.company,
          jobTitle: guest.jobTitle,
          industry: guest.industry,
          profileSummary: guest.profileSummary,
          group: guest.group,
          rsvpStatus: guest.rsvpStatus,
          notes: guest.notes,
          tableId: guest.tableId,
          seatIndex: guest.seatIndex,
          interests: guest.interests,
          dietaryRestrictions: guest.dietaryRestrictions,
          accessibilityNeeds: guest.accessibilityNeeds,
        };

        const result = await updateGuests(eventId, [guestInput]);
        if (result.error) {
          console.error('Failed to persist guest update:', result.error);
        }
      }
    }
  }, [store, eventId, isAuthenticated]);

  const removeGuestWithSync = useCallback(async (id: string) => {
    // Remove from local store first
    store.removeGuest(id);

    // Persist to Supabase if authenticated
    if (isAuthenticated) {
      const result = await deleteGuests(eventId, [id]);
      if (result.error) {
        console.error('Failed to delete guest from database:', result.error);
      }
    }
  }, [store, eventId, isAuthenticated]);

  const assignGuestToTableWithSync = useCallback(async (guestId: string, tableId: string | undefined, seatIndex?: number) => {
    // Track demo action if in demo mode
    if (store.isDemo) {
      store.trackDemoAction('movedGuest');
    }

    // Update local store first
    store.assignGuestToTable(guestId, tableId, seatIndex);

    // Persist to Supabase if authenticated
    if (isAuthenticated) {
      const guest = useStore.getState().event.guests.find(g => g.id === guestId);
      if (guest) {
        const guestInput: GuestInput = {
          id: guest.id,
          firstName: guest.firstName,
          lastName: guest.lastName,
          tableId: guest.tableId,
          seatIndex: guest.seatIndex,
        };

        const result = await updateGuests(eventId, [guestInput]);
        if (result.error) {
          console.error('Failed to persist guest assignment:', result.error);
        }
      }
    }
  }, [store, eventId, isAuthenticated]);

  const unassignGuestFromTableWithSync = useCallback(async (guestId: string) => {
    // Update local store first (use updateGuest to clear table assignment)
    store.updateGuest(guestId, { tableId: undefined, seatIndex: undefined });

    // Persist to Supabase if authenticated
    if (isAuthenticated) {
      const guest = useStore.getState().event.guests.find(g => g.id === guestId);
      if (guest) {
        const guestInput: GuestInput = {
          id: guest.id,
          firstName: guest.firstName,
          lastName: guest.lastName,
          tableId: undefined,
          seatIndex: undefined,
        };

        const result = await updateGuests(eventId, [guestInput]);
        if (result.error) {
          console.error('Failed to persist guest unassignment:', result.error);
        }
      }
    }
  }, [store, eventId, isAuthenticated]);

  // Detach guest from table and place on canvas
  const detachGuestFromTableWithSync = useCallback(async (guestId: string, canvasX: number, canvasY: number) => {
    // Update local store first
    store.detachGuestFromTable(guestId, canvasX, canvasY);

    // Persist to Supabase if authenticated
    if (isAuthenticated) {
      const guest = useStore.getState().event.guests.find(g => g.id === guestId);
      if (guest) {
        const guestInput: GuestInput = {
          id: guest.id,
          firstName: guest.firstName,
          lastName: guest.lastName,
          tableId: undefined,
          seatIndex: undefined,
        };

        const result = await updateGuests(eventId, [guestInput]);
        if (result.error) {
          console.error('Failed to persist guest detachment:', result.error);
        }
      }
    }
  }, [store, eventId, isAuthenticated]);

  // Swap seats between two guests
  const swapGuestSeatsWithSync = useCallback(async (guestId1: string, guestId2: string) => {
    // Update local store first
    store.swapGuestSeats(guestId1, guestId2);

    // Persist both guests to Supabase if authenticated
    if (isAuthenticated) {
      const guest1 = useStore.getState().event.guests.find(g => g.id === guestId1);
      const guest2 = useStore.getState().event.guests.find(g => g.id === guestId2);

      if (guest1 && guest2) {
        const guestInputs: GuestInput[] = [
          {
            id: guest1.id,
            firstName: guest1.firstName,
            lastName: guest1.lastName,
            tableId: guest1.tableId,
            seatIndex: guest1.seatIndex,
          },
          {
            id: guest2.id,
            firstName: guest2.firstName,
            lastName: guest2.lastName,
            tableId: guest2.tableId,
            seatIndex: guest2.seatIndex,
          },
        ];

        const result = await updateGuests(eventId, guestInputs);
        if (result.error) {
          console.error('Failed to persist seat swap:', result.error);
        }
      }
    }
  }, [store, eventId, isAuthenticated]);

  // Add a quick guest with canvas position
  const addQuickGuestWithSync = useCallback(async (canvasX: number, canvasY: number) => {
    // Add to local store first
    const guestId = store.addQuickGuest(canvasX, canvasY);

    // Get the newly added guest
    const newGuest = useStore.getState().event.guests.find(g => g.id === guestId);

    // Persist to Supabase if authenticated
    if (isAuthenticated && newGuest) {
      const guestInput: GuestInput = {
        id: newGuest.id,
        firstName: newGuest.firstName,
        lastName: newGuest.lastName,
        email: newGuest.email,
        company: newGuest.company,
        jobTitle: newGuest.jobTitle,
        industry: newGuest.industry,
        profileSummary: newGuest.profileSummary,
        group: newGuest.group,
        rsvpStatus: newGuest.rsvpStatus,
        notes: newGuest.notes,
        tableId: newGuest.tableId,
        seatIndex: newGuest.seatIndex,
        interests: newGuest.interests,
        dietaryRestrictions: newGuest.dietaryRestrictions,
        accessibilityNeeds: newGuest.accessibilityNeeds,
      };

      const result = await insertGuests(eventId, [guestInput]);
      if (result.error) {
        console.error('Failed to persist quick guest:', result.error);
      }
    }

    return guestId;
  }, [store, eventId, isAuthenticated]);

  // Add relationship between two guests
  const addRelationshipWithSync = useCallback(async (
    guestId: string,
    targetGuestId: string,
    type: RelationshipType,
    strength: number
  ) => {
    // Update local store first
    store.addRelationship(guestId, targetGuestId, type, strength);

    // Persist to Supabase if authenticated
    if (isAuthenticated) {
      const result = await insertRelationships(eventId, [{
        guestId,
        relatedGuestId: targetGuestId,
        type,
        strength,
      }]);
      if (result.error) {
        console.error('Failed to persist relationship:', result.error);
      }
    }
  }, [store, eventId, isAuthenticated]);

  // Remove relationship between two guests
  const removeRelationshipWithSync = useCallback(async (guestId: string, targetGuestId: string) => {
    // Update local store first
    store.removeRelationship(guestId, targetGuestId);

    // Persist to Supabase if authenticated
    if (isAuthenticated) {
      const result = await deleteRelationship(eventId, guestId, targetGuestId);
      if (result.error) {
        console.error('Failed to delete relationship:', result.error);
      }
    }
  }, [store, eventId, isAuthenticated]);

  // Constraint operations with persistence
  const addConstraintWithSync = useCallback(async (constraint: Omit<Constraint, 'id'>) => {
    // Track demo action if in demo mode
    if (store.isDemo) {
      store.trackDemoAction('addedConstraint');
    }

    // Add to local store first (optimistic update)
    store.addConstraint(constraint);

    // Get the newly added constraint from the store
    const constraints = useStore.getState().event.constraints;
    const newConstraint = constraints[constraints.length - 1];

    // Persist to Supabase if authenticated
    if (isAuthenticated && newConstraint) {
      const result = await insertConstraint(eventId, {
        id: newConstraint.id,
        type: newConstraint.type,
        priority: newConstraint.priority,
        guestIds: newConstraint.guestIds,
        description: newConstraint.description,
      });

      if (result.error) {
        console.error('Failed to persist constraint:', result.error);
      }
    }
  }, [store, eventId, isAuthenticated]);

  const updateConstraintWithSync = useCallback(async (
    constraintId: string,
    updates: Partial<Omit<Constraint, 'id'>>
  ) => {
    // Update local store first
    store.updateConstraint(constraintId, updates);

    // Persist to Supabase if authenticated
    if (isAuthenticated) {
      const result = await updateConstraintAction(eventId, constraintId, {
        type: updates.type,
        priority: updates.priority,
        guestIds: updates.guestIds,
        description: updates.description,
      });

      if (result.error) {
        console.error('Failed to persist constraint update:', result.error);
      }
    }
  }, [store, eventId, isAuthenticated]);

  const removeConstraintWithSync = useCallback(async (constraintId: string) => {
    // Remove from local store first
    store.removeConstraint(constraintId);

    // Persist to Supabase if authenticated
    if (isAuthenticated) {
      const result = await deleteConstraintAction(eventId, constraintId);

      if (result.error) {
        console.error('Failed to delete constraint:', result.error);
      }
    }
  }, [store, eventId, isAuthenticated]);

  // Venue element operations with persistence
  const addVenueElementWithSync = useCallback(async (type: VenueElement['type'], x: number, y: number) => {
    // Add to local store first
    store.addVenueElement(type, x, y);

    // Get the newly added element from the store
    const elements = useStore.getState().event.venueElements;
    const newElement = elements[elements.length - 1];

    // Persist to Supabase if authenticated
    if (isAuthenticated && newElement) {
      const result = await insertVenueElement(eventId, {
        id: newElement.id,
        type: newElement.type,
        label: newElement.label || '',
        x: newElement.x,
        y: newElement.y,
        width: newElement.width,
        height: newElement.height,
        rotation: newElement.rotation,
      });

      if (result.error) {
        console.error('Failed to persist venue element:', result.error);
      }
    }
  }, [store, eventId, isAuthenticated]);

  const updateVenueElementWithSync = useCallback(async (
    elementId: string,
    updates: Partial<Omit<VenueElement, 'id'>>
  ) => {
    // Update local store first
    store.updateVenueElement(elementId, updates);

    // Persist to Supabase if authenticated
    if (isAuthenticated) {
      const element = useStore.getState().event.venueElements.find(e => e.id === elementId);
      if (element) {
        const result = await updateVenueElementAction(eventId, {
          id: element.id,
          type: element.type,
          label: element.label || '',
          x: element.x,
          y: element.y,
          width: element.width,
          height: element.height,
          rotation: element.rotation,
        });

        if (result.error) {
          console.error('Failed to persist venue element update:', result.error);
        }
      }
    }
  }, [store, eventId, isAuthenticated]);

  const removeVenueElementWithSync = useCallback(async (elementId: string) => {
    // Remove from local store first
    store.removeVenueElement(elementId);

    // Persist to Supabase if authenticated
    if (isAuthenticated) {
      const result = await deleteVenueElementAction(eventId, elementId);

      if (result.error) {
        console.error('Failed to delete venue element:', result.error);
      }
    }
  }, [store, eventId, isAuthenticated]);

  const moveVenueElementWithSync = useCallback(async (elementId: string, x: number, y: number) => {
    // Move in local store first
    store.moveVenueElement(elementId, x, y);

    // Persist to Supabase if authenticated
    if (isAuthenticated) {
      const element = useStore.getState().event.venueElements.find(e => e.id === elementId);
      if (element) {
        const result = await updateVenueElementAction(eventId, {
          id: element.id,
          type: element.type,
          label: element.label || '',
          x: element.x,
          y: element.y,
          width: element.width,
          height: element.height,
          rotation: element.rotation,
        });

        if (result.error) {
          console.error('Failed to persist venue element move:', result.error);
        }
      }
    }
  }, [store, eventId, isAuthenticated]);

  return {
    // Synced table operations
    addTable: addTableWithSync,
    updateTable: updateTableWithSync,
    removeTable: removeTableWithSync,
    moveTable: moveTableWithSync,

    // Synced guest operations
    addGuest: addGuestWithSync,
    addQuickGuest: addQuickGuestWithSync,
    updateGuest: updateGuestWithSync,
    removeGuest: removeGuestWithSync,
    assignGuestToTable: assignGuestToTableWithSync,
    unassignGuestFromTable: unassignGuestFromTableWithSync,
    detachGuestFromTable: detachGuestFromTableWithSync,
    swapGuestSeats: swapGuestSeatsWithSync,
    addRelationship: addRelationshipWithSync,
    removeRelationship: removeRelationshipWithSync,

    // Synced constraint operations
    addConstraint: addConstraintWithSync,
    updateConstraint: updateConstraintWithSync,
    removeConstraint: removeConstraintWithSync,

    // Synced venue element operations
    addVenueElement: addVenueElementWithSync,
    updateVenueElement: updateVenueElementWithSync,
    removeVenueElement: removeVenueElementWithSync,
    moveVenueElement: moveVenueElementWithSync,

    // Original store for non-synced operations
    store,

    // Helper to check if we're in authenticated mode
    isAuthenticated,
  };
}
