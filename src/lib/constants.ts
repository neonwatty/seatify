// Application constants

// Demo event UUID - this is a fixed ID that allows unauthenticated users to view a sample event
export const DEMO_EVENT_ID = '00000000-0000-0000-0000-000000000001';

// Check if an event ID is the demo event
export function isDemoEvent(eventId: string): boolean {
  return eventId === DEMO_EVENT_ID;
}
