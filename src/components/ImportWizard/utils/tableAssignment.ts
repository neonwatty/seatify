import type { Guest } from '../../../types';
import type { DistributionStrategy } from '../types';
import { getFullName } from '../../../types';

/**
 * Compute a preview of how guests will be distributed across tables
 * Returns a Map of tableIndex -> array of guest names
 */
export function computeTableAssignmentPreview(
  guests: Partial<Guest>[],
  tableCount: number,
  tableCapacity: number,
  strategy: DistributionStrategy
): Map<number, string[]> {
  const preview = new Map<number, string[]>();

  if (tableCount === 0 || strategy === 'skip') {
    return preview;
  }

  // Initialize empty tables
  for (let i = 0; i < tableCount; i++) {
    preview.set(i, []);
  }

  switch (strategy) {
    case 'even':
      distributeEvenly(guests, preview, tableCapacity);
      break;
    case 'groups':
    case 'optimized':
      // For preview, use group-based distribution
      // Full optimization happens on actual import
      distributeByGroups(guests, preview, tableCapacity);
      break;
  }

  return preview;
}

/**
 * Distribute guests evenly across tables using round-robin
 */
function distributeEvenly(
  guests: Partial<Guest>[],
  tables: Map<number, string[]>,
  tableCapacity: number
): void {
  let currentTable = 0;
  const tableCount = tables.size;

  guests.forEach((guest) => {
    const guestName = getFullName({
      firstName: guest.firstName || '',
      lastName: guest.lastName || '',
    } as Guest);

    // Find next table with space
    let attempts = 0;
    while (attempts < tableCount) {
      const tableGuests = tables.get(currentTable) || [];
      if (tableGuests.length < tableCapacity) {
        tableGuests.push(guestName);
        tables.set(currentTable, tableGuests);
        currentTable = (currentTable + 1) % tableCount;
        break;
      }
      currentTable = (currentTable + 1) % tableCount;
      attempts++;
    }
  });
}

/**
 * Distribute guests keeping groups together when possible
 */
function distributeByGroups(
  guests: Partial<Guest>[],
  tables: Map<number, string[]>,
  tableCapacity: number
): void {
  const tableCount = tables.size;

  // Group guests by their group field
  const groupedGuests = new Map<string, Partial<Guest>[]>();
  const ungroupedGuests: Partial<Guest>[] = [];

  guests.forEach((guest) => {
    if (guest.group) {
      const group = groupedGuests.get(guest.group) || [];
      group.push(guest);
      groupedGuests.set(guest.group, group);
    } else {
      ungroupedGuests.push(guest);
    }
  });

  // Sort groups by size (largest first for better packing)
  const sortedGroups = Array.from(groupedGuests.entries()).sort(
    (a, b) => b[1].length - a[1].length
  );

  let currentTable = 0;

  // Assign groups to tables
  for (const [, groupGuests] of sortedGroups) {
    // Find a table that can fit the group (or most of it)
    let bestTable = currentTable;
    let bestSpace = -1;

    for (let t = 0; t < tableCount; t++) {
      const tableGuests = tables.get(t) || [];
      const space = tableCapacity - tableGuests.length;
      if (space >= groupGuests.length && space > bestSpace) {
        bestTable = t;
        bestSpace = space;
        break; // Found a table that fits the whole group
      }
      if (space > bestSpace) {
        bestTable = t;
        bestSpace = space;
      }
    }

    // Add group members to the best table (may overflow to next tables)
    let tableIndex = bestTable;
    for (const guest of groupGuests) {
      const guestName = getFullName({
        firstName: guest.firstName || '',
        lastName: guest.lastName || '',
      } as Guest);

      // Find next table with space
      let attempts = 0;
      while (attempts < tableCount) {
        const tableGuests = tables.get(tableIndex) || [];
        if (tableGuests.length < tableCapacity) {
          tableGuests.push(guestName);
          tables.set(tableIndex, tableGuests);
          break;
        }
        tableIndex = (tableIndex + 1) % tableCount;
        attempts++;
      }
    }

    currentTable = (bestTable + 1) % tableCount;
  }

  // Distribute ungrouped guests to fill remaining space
  for (const guest of ungroupedGuests) {
    const guestName = getFullName({
      firstName: guest.firstName || '',
      lastName: guest.lastName || '',
    } as Guest);

    let tableIndex = 0;
    let attempts = 0;
    while (attempts < tableCount) {
      const tableGuests = tables.get(tableIndex) || [];
      if (tableGuests.length < tableCapacity) {
        tableGuests.push(guestName);
        tables.set(tableIndex, tableGuests);
        break;
      }
      tableIndex = (tableIndex + 1) % tableCount;
      attempts++;
    }
  }
}

/**
 * Create table assignment map for actual import
 * Returns: Map<guestIndex, tableIndex>
 */
export function computeFinalTableAssignments(
  guests: Partial<Guest>[],
  tableCount: number,
  tableCapacity: number,
  strategy: DistributionStrategy
): Map<number, number> {
  const assignments = new Map<number, number>();

  if (tableCount === 0 || strategy === 'skip') {
    return assignments;
  }

  // Create guest name to index mapping for lookup
  const guestNameToIndices = new Map<string, number[]>();
  guests.forEach((guest, index) => {
    const name = getFullName({
      firstName: guest.firstName || '',
      lastName: guest.lastName || '',
    } as Guest);
    const indices = guestNameToIndices.get(name) || [];
    indices.push(index);
    guestNameToIndices.set(name, indices);
  });

  // Get preview distribution
  const preview = computeTableAssignmentPreview(
    guests,
    tableCount,
    tableCapacity,
    strategy
  );

  // Track which indices we've assigned to handle duplicate names
  const assignedIndices = new Set<number>();

  // Convert preview to assignments
  preview.forEach((guestNames, tableIndex) => {
    guestNames.forEach((name) => {
      const indices = guestNameToIndices.get(name) || [];
      // Find first unassigned index with this name
      for (const idx of indices) {
        if (!assignedIndices.has(idx)) {
          assignments.set(idx, tableIndex);
          assignedIndices.add(idx);
          break;
        }
      }
    });
  });

  return assignments;
}

/**
 * Calculate optimal table positions in a grid layout
 */
export function calculateTablePositions(
  tableCount: number,
  tableWidth: number,
  tableHeight: number
): { x: number; y: number }[] {
  const positions: { x: number; y: number }[] = [];

  if (tableCount === 0) {
    return positions;
  }

  // Calculate grid dimensions
  const cols = Math.ceil(Math.sqrt(tableCount));

  // Spacing between tables
  const spacingX = tableWidth * 0.8;
  const spacingY = tableHeight * 0.8;

  // Starting position (leave margin)
  const startX = 150;
  const startY = 150;

  for (let i = 0; i < tableCount; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    positions.push({
      x: startX + col * (tableWidth + spacingX),
      y: startY + row * (tableHeight + spacingY),
    });
  }

  return positions;
}
