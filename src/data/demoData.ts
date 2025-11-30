import type { Table, Guest, Constraint, SurveyQuestion } from '../types';

export const demoTables: Table[] = [
  { id: 't1', name: 'Table 1', shape: 'round', capacity: 6, x: 200, y: 200, width: 120, height: 120 },
  { id: 't2', name: 'Table 2', shape: 'round', capacity: 6, x: 400, y: 200, width: 120, height: 120 },
  { id: 't3', name: 'Table 3', shape: 'round', capacity: 6, x: 300, y: 380, width: 120, height: 120 },
];

export const demoGuests: Guest[] = [
  // Assigned guests (5)
  { id: 'g1', name: 'Alice Johnson', rsvpStatus: 'confirmed', tableId: 't1', relationships: [{ guestId: 'g2', type: 'partner', strength: 5 }] },
  { id: 'g2', name: 'Bob Johnson', rsvpStatus: 'confirmed', tableId: 't1', relationships: [{ guestId: 'g1', type: 'partner', strength: 5 }] },
  { id: 'g3', name: 'Carol Smith', rsvpStatus: 'confirmed', tableId: 't2', relationships: [] },
  { id: 'g4', name: 'David Brown', rsvpStatus: 'confirmed', tableId: 't2', relationships: [{ guestId: 'g5', type: 'friend', strength: 3 }] },
  { id: 'g5', name: 'Emma Davis', rsvpStatus: 'confirmed', tableId: 't3', relationships: [{ guestId: 'g4', type: 'friend', strength: 3 }] },
  // Unassigned guests (5)
  { id: 'g6', name: 'Frank Wilson', rsvpStatus: 'confirmed', relationships: [] },
  { id: 'g7', name: 'Grace Lee', rsvpStatus: 'confirmed', relationships: [] },
  { id: 'g8', name: 'Henry Taylor', rsvpStatus: 'confirmed', relationships: [] },
  { id: 'g9', name: 'Ivy Martinez', rsvpStatus: 'confirmed', relationships: [] },
  { id: 'g10', name: 'Jack Anderson', rsvpStatus: 'confirmed', relationships: [] },
];

export const demoConstraints: Constraint[] = [];

export const demoSurveyQuestions: SurveyQuestion[] = [];

export const demoEventMetadata = {
  name: 'Demo Event',
  date: '2025-06-15',
  type: 'social' as const,
};
