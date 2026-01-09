import type { Table, Guest, Constraint, SurveyQuestion } from '../types';

export const demoTables: Table[] = [
  { id: 't1', name: 'Table 1', shape: 'round', capacity: 6, x: 200, y: 200, width: 120, height: 120 },
  { id: 't2', name: 'Table 2', shape: 'round', capacity: 6, x: 400, y: 200, width: 120, height: 120 },
  { id: 't3', name: 'Table 3', shape: 'round', capacity: 6, x: 300, y: 380, width: 120, height: 120 },
];

export const demoGuests: Guest[] = [
  // Assigned guests - includes an "avoid" pair at the same table for visible conflict
  { id: 'g1', firstName: 'Alice', lastName: 'Johnson', rsvpStatus: 'confirmed', tableId: 't1', relationships: [{ guestId: 'g2', type: 'partner', strength: 5 }] },
  { id: 'g2', firstName: 'Bob', lastName: 'Johnson', rsvpStatus: 'confirmed', tableId: 't1', relationships: [{ guestId: 'g1', type: 'partner', strength: 5 }] },
  // Carol and David AVOID each other but are at the same table — optimizer will fix this
  { id: 'g3', firstName: 'Carol', lastName: 'Smith', rsvpStatus: 'confirmed', tableId: 't2', relationships: [{ guestId: 'g4', type: 'avoid', strength: 5 }] },
  { id: 'g4', firstName: 'David', lastName: 'Brown', rsvpStatus: 'confirmed', tableId: 't2', relationships: [{ guestId: 'g5', type: 'friend', strength: 3 }, { guestId: 'g3', type: 'avoid', strength: 5 }] },
  // Unassigned guests - optimizer will seat these automatically
  { id: 'g5', firstName: 'Emma', lastName: 'Davis', rsvpStatus: 'confirmed', relationships: [{ guestId: 'g4', type: 'friend', strength: 3 }, { guestId: 'g8', type: 'family', strength: 4 }] },
  { id: 'g6', firstName: 'Frank', lastName: 'Wilson', rsvpStatus: 'confirmed', relationships: [{ guestId: 'g7', type: 'avoid', strength: 5 }] },
  { id: 'g7', firstName: 'Grace', lastName: 'Lee', rsvpStatus: 'confirmed', relationships: [{ guestId: 'g6', type: 'avoid', strength: 5 }] },
  // Henry is Emma's sibling — they have a "must sit together" constraint
  { id: 'g8', firstName: 'Henry', lastName: 'Taylor', rsvpStatus: 'confirmed', relationships: [{ guestId: 'g5', type: 'family', strength: 4 }] },
  { id: 'g9', firstName: 'Ivy', lastName: 'Martinez', rsvpStatus: 'confirmed', relationships: [] },
  { id: 'g10', firstName: 'Jack', lastName: 'Anderson', rsvpStatus: 'confirmed', relationships: [] },
];

export const demoConstraints: Constraint[] = [
  // Emma and Henry are siblings — must sit together (both unassigned, optimizer will seat together)
  { id: 'c1', type: 'must_sit_together', guestIds: ['g5', 'g8'], priority: 'required', description: 'Emma and Henry are siblings' },
  // David and Jack are business partners — should be at same table (David at t2, Jack unassigned)
  { id: 'c2', type: 'same_table', guestIds: ['g4', 'g10'], priority: 'preferred', description: 'David and Jack are business partners' },
];

export const demoSurveyQuestions: SurveyQuestion[] = [];

export const demoEventMetadata = {
  name: 'Demo Event',
  date: '2025-06-15',
  eventType: 'party' as const,
};
