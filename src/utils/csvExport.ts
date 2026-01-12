import type { Guest, Table } from '../types';
import { getFullName } from '../types';

interface ExportGuest {
  firstName: string;
  lastName: string;
  email: string;
  company: string;
  jobTitle: string;
  industry: string;
  group: string;
  rsvpStatus: string;
  notes: string;
  tableName: string;
  interests: string;
  dietaryRestrictions: string;
  accessibilityNeeds: string;
}

/**
 * Convert guests to CSV format
 */
export function guestsToCSV(guests: Guest[], tables: Table[]): string {
  // Create a map of table IDs to names
  const tableMap = new Map(tables.map(t => [t.id, t.name]));

  // CSV headers
  const headers = [
    'First Name',
    'Last Name',
    'Email',
    'Company',
    'Job Title',
    'Industry',
    'Group',
    'RSVP Status',
    'Notes',
    'Table',
    'Interests',
    'Dietary Restrictions',
    'Accessibility Needs',
  ];

  // Convert guests to rows
  const rows = guests.map(guest => {
    const tableName = guest.tableId ? (tableMap.get(guest.tableId) || '') : '';

    return [
      guest.firstName || '',
      guest.lastName || '',
      guest.email || '',
      guest.company || '',
      guest.jobTitle || '',
      guest.industry || '',
      guest.group || '',
      guest.rsvpStatus || 'pending',
      guest.notes || '',
      tableName,
      (guest.interests || []).join('; '),
      (guest.dietaryRestrictions || []).join('; '),
      (guest.accessibilityNeeds || []).join('; '),
    ];
  });

  // Escape CSV values
  const escapeCSV = (value: string): string => {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  };

  // Build CSV string
  const headerLine = headers.map(escapeCSV).join(',');
  const dataLines = rows.map(row => row.map(escapeCSV).join(','));

  return [headerLine, ...dataLines].join('\n');
}

/**
 * Download guests as CSV file
 */
export function downloadGuestsAsCSV(
  guests: Guest[],
  tables: Table[],
  eventName: string = 'guests'
): void {
  const csv = guestsToCSV(guests, tables);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `${eventName.replace(/[^a-z0-9]/gi, '_')}_guests.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Transform database export format to CSV
 */
export function exportDataToCSV(exportData: ExportGuest[]): string {
  const headers = [
    'First Name',
    'Last Name',
    'Email',
    'Company',
    'Job Title',
    'Industry',
    'Group',
    'RSVP Status',
    'Notes',
    'Table',
    'Interests',
    'Dietary Restrictions',
    'Accessibility Needs',
  ];

  const rows = exportData.map(guest => [
    guest.firstName || '',
    guest.lastName || '',
    guest.email || '',
    guest.company || '',
    guest.jobTitle || '',
    guest.industry || '',
    guest.group || '',
    guest.rsvpStatus || 'pending',
    guest.notes || '',
    guest.tableName || '',
    guest.interests || '',
    guest.dietaryRestrictions || '',
    guest.accessibilityNeeds || '',
  ]);

  const escapeCSV = (value: string): string => {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  };

  const headerLine = headers.map(escapeCSV).join(',');
  const dataLines = rows.map(row => row.map(escapeCSV).join(','));

  return [headerLine, ...dataLines].join('\n');
}
