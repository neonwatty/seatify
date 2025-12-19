import pako from 'pako';
import type { Event, Guest, Table, VenueElement, Constraint, TableShape } from '../types';

// Version for future compatibility
const SHARE_DATA_VERSION = 1;

// Maximum URL length (leaving room for base URL)
const MAX_URL_DATA_LENGTH = 6000;

/**
 * Minified shareable event data structure
 * Uses short keys to minimize URL length
 */
export interface ShareableEventData {
  v: number;              // Version
  n: string;              // Event name
  d?: string;             // Event date
  T: ShareableTable[];    // Tables
  G: ShareableGuest[];    // Guests
  V?: ShareableVenueElement[]; // Venue elements (optional)
  C?: ShareableConstraint[];   // Constraints (optional)
}

export interface ShareableTable {
  i: string;   // id
  n: string;   // name
  s: string;   // shape
  c: number;   // capacity
  x: number;   // x position
  y: number;   // y position
  w: number;   // width
  h: number;   // height
  r?: number;  // rotation
}

export interface ShareableGuest {
  i: string;   // id
  f: string;   // firstName
  l: string;   // lastName
  t?: string;  // tableId
  s?: number;  // seatIndex
  g?: string;  // group
  dr?: string[]; // dietaryRestrictions
  an?: string[]; // accessibilityNeeds
  r?: number;  // rsvpStatus (0=pending, 1=confirmed, 2=declined)
}

export interface ShareableVenueElement {
  i: string;   // id
  t: string;   // type
  l: string;   // label
  x: number;   // x position
  y: number;   // y position
  w: number;   // width
  h: number;   // height
  r?: number;  // rotation
}

export interface ShareableConstraint {
  i: string;   // id
  t: string;   // type
  g: string[]; // guestIds
  p: number;   // priority (0=required, 1=preferred, 2=optional)
}

// RSVP status mapping
const RSVP_TO_NUMBER: Record<string, number> = {
  'pending': 0,
  'confirmed': 1,
  'declined': 2,
};

const NUMBER_TO_RSVP: Record<number, Guest['rsvpStatus']> = {
  0: 'pending',
  1: 'confirmed',
  2: 'declined',
};

// Priority mapping
const PRIORITY_TO_NUMBER: Record<string, number> = {
  'required': 0,
  'preferred': 1,
  'optional': 2,
};

const NUMBER_TO_PRIORITY: Record<number, Constraint['priority']> = {
  0: 'required',
  1: 'preferred',
  2: 'optional',
};

/**
 * Convert Event to minified shareable format
 */
export function minifyEventData(event: Event): ShareableEventData {
  const data: ShareableEventData = {
    v: SHARE_DATA_VERSION,
    n: event.name,
    T: event.tables.map(minifyTable),
    G: event.guests.map(minifyGuest),
  };

  // Add optional fields only if they have data
  if (event.date) {
    data.d = event.date;
  }

  if (event.venueElements.length > 0) {
    data.V = event.venueElements.map(minifyVenueElement);
  }

  if (event.constraints.length > 0) {
    data.C = event.constraints.map(minifyConstraint);
  }

  return data;
}

function minifyTable(table: Table): ShareableTable {
  const result: ShareableTable = {
    i: table.id,
    n: table.name,
    s: table.shape,
    c: table.capacity,
    x: Math.round(table.x),
    y: Math.round(table.y),
    w: Math.round(table.width),
    h: Math.round(table.height),
  };

  if (table.rotation) {
    result.r = table.rotation;
  }

  return result;
}

function minifyGuest(guest: Guest): ShareableGuest {
  const result: ShareableGuest = {
    i: guest.id,
    f: guest.firstName,
    l: guest.lastName,
  };

  if (guest.tableId) {
    result.t = guest.tableId;
  }
  if (guest.seatIndex !== undefined) {
    result.s = guest.seatIndex;
  }
  if (guest.group) {
    result.g = guest.group;
  }
  if (guest.dietaryRestrictions && guest.dietaryRestrictions.length > 0) {
    result.dr = guest.dietaryRestrictions;
  }
  if (guest.accessibilityNeeds && guest.accessibilityNeeds.length > 0) {
    result.an = guest.accessibilityNeeds;
  }
  if (guest.rsvpStatus !== 'pending') {
    result.r = RSVP_TO_NUMBER[guest.rsvpStatus];
  }

  return result;
}

function minifyVenueElement(element: VenueElement): ShareableVenueElement {
  const result: ShareableVenueElement = {
    i: element.id,
    t: element.type,
    l: element.label,
    x: Math.round(element.x),
    y: Math.round(element.y),
    w: Math.round(element.width),
    h: Math.round(element.height),
  };

  if (element.rotation) {
    result.r = element.rotation;
  }

  return result;
}

function minifyConstraint(constraint: Constraint): ShareableConstraint {
  return {
    i: constraint.id,
    t: constraint.type,
    g: constraint.guestIds,
    p: PRIORITY_TO_NUMBER[constraint.priority],
  };
}

/**
 * Expand minified data back to full Event structure
 */
export function expandShareableData(data: ShareableEventData): Partial<Event> {
  return {
    name: data.n,
    date: data.d,
    tables: data.T.map(expandTable),
    guests: data.G.map(expandGuest),
    venueElements: data.V?.map(expandVenueElement) || [],
    constraints: data.C?.map(expandConstraint) || [],
  };
}

function expandTable(table: ShareableTable): Table {
  const result: Table = {
    id: table.i,
    name: table.n,
    shape: table.s as TableShape,
    capacity: table.c,
    x: table.x,
    y: table.y,
    width: table.w,
    height: table.h,
  };

  if (table.r !== undefined) {
    result.rotation = table.r;
  }

  return result;
}

function expandGuest(guest: ShareableGuest): Guest {
  const result: Guest = {
    id: guest.i,
    firstName: guest.f,
    lastName: guest.l,
    relationships: [], // Relationships not included in share URL
    rsvpStatus: guest.r !== undefined ? NUMBER_TO_RSVP[guest.r] : 'pending',
  };

  if (guest.t) {
    result.tableId = guest.t;
  }
  if (guest.s !== undefined) {
    result.seatIndex = guest.s;
  }
  if (guest.g) {
    result.group = guest.g;
  }
  if (guest.dr) {
    result.dietaryRestrictions = guest.dr;
  }
  if (guest.an) {
    result.accessibilityNeeds = guest.an;
  }

  return result;
}

function expandVenueElement(element: ShareableVenueElement): VenueElement {
  const result: VenueElement = {
    id: element.i,
    type: element.t as VenueElement['type'],
    label: element.l,
    x: element.x,
    y: element.y,
    width: element.w,
    height: element.h,
  };

  if (element.r !== undefined) {
    result.rotation = element.r;
  }

  return result;
}

function expandConstraint(constraint: ShareableConstraint): Constraint {
  return {
    id: constraint.i,
    type: constraint.t as Constraint['type'],
    guestIds: constraint.g,
    priority: NUMBER_TO_PRIORITY[constraint.p],
  };
}

/**
 * Encode event data to a URL-safe string with compression
 */
export function encodeShareableUrl(event: Event): string {
  const minified = minifyEventData(event);
  const json = JSON.stringify(minified);

  // Compress the JSON
  const compressed = pako.deflate(json);

  // Convert to base64 URL-safe format
  const base64 = btoa(String.fromCharCode.apply(null, Array.from(compressed)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  return base64;
}

/**
 * Decode shareable URL data back to event data
 */
export function decodeShareableUrl(encoded: string): Partial<Event> | null {
  try {
    // Restore standard base64
    let base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
    // Add padding if needed
    while (base64.length % 4) {
      base64 += '=';
    }

    // Decode base64 to binary
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    // Decompress
    const decompressed = pako.inflate(bytes, { to: 'string' });
    const data = JSON.parse(decompressed) as ShareableEventData;

    // Validate version
    if (!data.v || data.v > SHARE_DATA_VERSION) {
      console.warn('Unsupported share data version:', data.v);
      return null;
    }

    // Validate basic structure
    if (!validateShareableData(data)) {
      return null;
    }

    return expandShareableData(data);
  } catch (error) {
    console.error('Failed to decode shareable URL:', error);
    return null;
  }
}

/**
 * Validate the basic structure of shareable data
 */
function validateShareableData(data: unknown): data is ShareableEventData {
  if (!data || typeof data !== 'object') return false;

  const d = data as Record<string, unknown>;

  return (
    typeof d.v === 'number' &&
    typeof d.n === 'string' &&
    Array.isArray(d.T) &&
    Array.isArray(d.G)
  );
}

/**
 * Generate the full shareable URL
 */
export function generateShareUrl(event: Event): string {
  const encoded = encodeShareableUrl(event);
  const baseUrl = window.location.origin + window.location.pathname;
  return `${baseUrl}#/share/${encoded}`;
}

/**
 * Check if URL data is too large
 */
export function isShareUrlTooLarge(event: Event): boolean {
  const encoded = encodeShareableUrl(event);
  return encoded.length > MAX_URL_DATA_LENGTH;
}

/**
 * Get estimated share URL length for an event
 */
export function getShareUrlLength(event: Event): number {
  return encodeShareableUrl(event).length;
}

/**
 * Parse share data from current URL hash
 */
export function parseShareDataFromHash(): Partial<Event> | null {
  const hash = window.location.hash;
  const match = hash.match(/^#\/share\/(.+)$/);

  if (!match) return null;

  return decodeShareableUrl(match[1]);
}

/**
 * Check if current URL is a share landing page
 */
export function isShareLandingPage(): boolean {
  return window.location.hash.startsWith('#/share/');
}

/**
 * Download event data as a file (fallback for large events)
 */
export function downloadEventDataFile(event: Event): void {
  const minified = minifyEventData(event);
  const json = JSON.stringify(minified, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `${event.name.replace(/[^a-z0-9]/gi, '_')}_seating.json`;
  link.click();

  URL.revokeObjectURL(url);
}

/**
 * Import event data from file
 */
export function importEventDataFile(file: File): Promise<Partial<Event> | null> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content) as ShareableEventData;

        if (!validateShareableData(data)) {
          resolve(null);
          return;
        }

        resolve(expandShareableData(data));
      } catch {
        resolve(null);
      }
    };
    reader.onerror = () => resolve(null);
    reader.readAsText(file);
  });
}
