import { describe, it, expect } from 'vitest';
import { guestsToCSV, exportDataToCSV } from './csvExport';
import type { Guest, Table } from '../types';

// Helper to create a mock guest
const createGuest = (overrides: Partial<Guest> = {}): Guest => ({
  id: `guest-${Math.random().toString(36).substr(2, 9)}`,
  firstName: 'Test',
  lastName: 'Guest',
  rsvpStatus: 'confirmed',
  relationships: [],
  interests: [],
  dietaryRestrictions: [],
  accessibilityNeeds: [],
  ...overrides,
});

// Helper to create a mock table
const createTable = (overrides: Partial<Table> = {}): Table => ({
  id: `table-${Math.random().toString(36).substr(2, 9)}`,
  name: 'Table 1',
  shape: 'round',
  capacity: 8,
  x: 100,
  y: 100,
  width: 100,
  height: 100,
  rotation: 0,
  ...overrides,
});

describe('CSV Export', () => {
  describe('guestsToCSV', () => {
    it('should export basic guest data', () => {
      const guests = [
        createGuest({
          firstName: 'John',
          lastName: 'Doe',
          rsvpStatus: 'confirmed',
        }),
      ];

      const csv = guestsToCSV(guests, []);

      expect(csv).toContain('John');
      expect(csv).toContain('Doe');
      expect(csv).toContain('confirmed');
    });

    it('should include CSV headers', () => {
      const csv = guestsToCSV([], []);

      expect(csv).toContain('First Name');
      expect(csv).toContain('Last Name');
      expect(csv).toContain('Email');
      expect(csv).toContain('Company');
      expect(csv).toContain('Job Title');
      expect(csv).toContain('Industry');
      expect(csv).toContain('Group');
      expect(csv).toContain('RSVP Status');
      expect(csv).toContain('Notes');
      expect(csv).toContain('Table');
      expect(csv).toContain('Interests');
      expect(csv).toContain('Dietary Restrictions');
      expect(csv).toContain('Accessibility Needs');
    });

    it('should escape commas in fields', () => {
      const guests = [
        createGuest({
          firstName: 'John, Jr.',
          lastName: 'Doe',
        }),
      ];

      const csv = guestsToCSV(guests, []);

      // Should be quoted
      expect(csv).toContain('"John, Jr."');
    });

    it('should escape quotes in fields', () => {
      const guests = [
        createGuest({
          firstName: 'John "Jack"',
          lastName: 'Doe',
        }),
      ];

      const csv = guestsToCSV(guests, []);

      // Should escape quotes as ""
      expect(csv).toContain('""Jack""');
    });

    it('should escape newlines in fields', () => {
      const guests = [
        createGuest({
          notes: 'Line 1\nLine 2',
        }),
      ];

      const csv = guestsToCSV(guests, []);

      // Should wrap in quotes
      expect(csv).toContain('"Line 1\nLine 2"');
    });

    it('should handle Unicode characters', () => {
      const guests = [
        createGuest({
          firstName: 'Jos\u00e9',
          lastName: "O'Brien",
        }),
      ];

      const csv = guestsToCSV(guests, []);

      expect(csv).toContain('Jos\u00e9');
      expect(csv).toContain("O'Brien");
    });

    it('should handle empty guest list', () => {
      const csv = guestsToCSV([], []);

      // Should still have headers
      expect(csv).toContain('First Name');
      expect(csv).toContain('Last Name');
      // Should only have header line
      expect(csv.split('\n').length).toBe(1);
    });

    it('should handle array fields', () => {
      const guests = [
        createGuest({
          interests: ['Photography', 'Travel'],
          dietaryRestrictions: ['Vegetarian', 'Nut allergy'],
          accessibilityNeeds: ['Wheelchair access'],
        }),
      ];

      const csv = guestsToCSV(guests, []);

      // Arrays should be joined with semicolons
      expect(csv).toContain('Photography; Travel');
      expect(csv).toContain('Vegetarian; Nut allergy');
      expect(csv).toContain('Wheelchair access');
    });

    it('should lookup table name from table ID', () => {
      const table = createTable({ id: 'table-1', name: 'Head Table' });
      const guests = [
        createGuest({
          tableId: 'table-1',
        }),
      ];

      const csv = guestsToCSV(guests, [table]);

      expect(csv).toContain('Head Table');
    });

    it('should handle missing table ID', () => {
      const guests = [
        createGuest({
          tableId: undefined,
        }),
      ];

      const csv = guestsToCSV(guests, []);

      // Should have empty table column, not throw
      const lines = csv.split('\n');
      expect(lines.length).toBe(2); // header + 1 guest
    });

    it('should handle non-existent table ID', () => {
      const guests = [
        createGuest({
          tableId: 'nonexistent-table',
        }),
      ];

      const csv = guestsToCSV(guests, []);

      // Should have empty table name
      const lines = csv.split('\n');
      expect(lines.length).toBe(2);
    });

    it('should handle null/undefined fields gracefully', () => {
      const guests = [
        {
          id: 'guest-1',
          firstName: 'John',
          lastName: 'Doe',
          rsvpStatus: 'confirmed' as const,
          relationships: [],
          email: undefined,
          company: undefined,
          jobTitle: undefined,
          industry: undefined,
          group: undefined,
          notes: undefined,
          interests: undefined,
          dietaryRestrictions: undefined,
          accessibilityNeeds: undefined,
        },
      ];

      // Should not throw
      const csv = guestsToCSV(guests, []);
      expect(csv).toContain('John');
      expect(csv).toContain('Doe');
    });

    it('should export multiple guests correctly', () => {
      const guests = [
        createGuest({ firstName: 'Alice', lastName: 'Anderson' }),
        createGuest({ firstName: 'Bob', lastName: 'Brown' }),
        createGuest({ firstName: 'Carol', lastName: 'Clark' }),
      ];

      const csv = guestsToCSV(guests, []);

      const lines = csv.split('\n');
      expect(lines.length).toBe(4); // header + 3 guests
      expect(csv).toContain('Alice');
      expect(csv).toContain('Bob');
      expect(csv).toContain('Carol');
    });

    it('should default RSVP status to pending', () => {
      // Test with missing rsvpStatus (simulating incomplete data)
      const guests = [
        {
          id: 'guest-1',
          firstName: 'John',
          lastName: 'Doe',
          rsvpStatus: undefined as unknown as Guest['rsvpStatus'],
          relationships: [],
          interests: [],
          dietaryRestrictions: [],
          accessibilityNeeds: [],
        },
      ] as Guest[];

      const csv = guestsToCSV(guests, []);

      expect(csv).toContain('pending');
    });

    it('should handle special characters in names', () => {
      const guests = [
        createGuest({
          firstName: 'Marie-Claire',
          lastName: 'von M\u00fcller',
        }),
      ];

      const csv = guestsToCSV(guests, []);

      expect(csv).toContain('Marie-Claire');
      expect(csv).toContain('von M\u00fcller');
    });

    it('should properly format multiple tables', () => {
      const tables = [
        createTable({ id: 'table-1', name: 'Table 1' }),
        createTable({ id: 'table-2', name: 'Table 2' }),
        createTable({ id: 'table-3', name: 'VIP Table' }),
      ];
      const guests = [
        createGuest({ firstName: 'Alice', tableId: 'table-1' }),
        createGuest({ firstName: 'Bob', tableId: 'table-2' }),
        createGuest({ firstName: 'Carol', tableId: 'table-3' }),
      ];

      const csv = guestsToCSV(guests, tables);

      expect(csv).toContain('Table 1');
      expect(csv).toContain('Table 2');
      expect(csv).toContain('VIP Table');
    });
  });

  describe('exportDataToCSV', () => {
    it('should export ExportGuest data correctly', () => {
      const exportData = [
        {
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          company: 'Acme Inc',
          jobTitle: 'Engineer',
          industry: 'Tech',
          group: 'Groom Side',
          rsvpStatus: 'confirmed',
          notes: 'VIP guest',
          tableName: 'Head Table',
          interests: 'Photography; Travel',
          dietaryRestrictions: 'Vegetarian',
          accessibilityNeeds: '',
        },
      ];

      const csv = exportDataToCSV(exportData);

      expect(csv).toContain('John');
      expect(csv).toContain('Doe');
      expect(csv).toContain('john@example.com');
      expect(csv).toContain('Acme Inc');
      expect(csv).toContain('Engineer');
      expect(csv).toContain('Tech');
      expect(csv).toContain('Groom Side');
      expect(csv).toContain('confirmed');
      expect(csv).toContain('VIP guest');
      expect(csv).toContain('Head Table');
      expect(csv).toContain('Photography; Travel');
      expect(csv).toContain('Vegetarian');
    });

    it('should include all headers', () => {
      const csv = exportDataToCSV([]);

      expect(csv).toContain('First Name');
      expect(csv).toContain('Last Name');
      expect(csv).toContain('Email');
      expect(csv).toContain('Company');
      expect(csv).toContain('Job Title');
      expect(csv).toContain('Industry');
      expect(csv).toContain('Group');
      expect(csv).toContain('RSVP Status');
      expect(csv).toContain('Notes');
      expect(csv).toContain('Table');
      expect(csv).toContain('Interests');
      expect(csv).toContain('Dietary Restrictions');
      expect(csv).toContain('Accessibility Needs');
    });

    it('should handle empty data', () => {
      const csv = exportDataToCSV([]);

      // Should only have headers
      expect(csv.split('\n').length).toBe(1);
    });

    it('should escape special characters', () => {
      const exportData = [
        {
          firstName: 'John, Jr.',
          lastName: 'Doe "The Man"',
          email: 'john@example.com',
          company: 'Line 1\nLine 2',
          jobTitle: '',
          industry: '',
          group: '',
          rsvpStatus: 'confirmed',
          notes: '',
          tableName: '',
          interests: '',
          dietaryRestrictions: '',
          accessibilityNeeds: '',
        },
      ];

      const csv = exportDataToCSV(exportData);

      expect(csv).toContain('"John, Jr."');
      expect(csv).toContain('""The Man""');
      expect(csv).toContain('"Line 1\nLine 2"');
    });

    it('should default RSVP status to pending for empty', () => {
      const exportData = [
        {
          firstName: 'John',
          lastName: 'Doe',
          email: '',
          company: '',
          jobTitle: '',
          industry: '',
          group: '',
          rsvpStatus: '',
          notes: '',
          tableName: '',
          interests: '',
          dietaryRestrictions: '',
          accessibilityNeeds: '',
        },
      ];

      const csv = exportDataToCSV(exportData);

      expect(csv).toContain('pending');
    });

    it('should export multiple guests', () => {
      const exportData = [
        {
          firstName: 'Alice',
          lastName: 'Anderson',
          email: 'alice@example.com',
          company: '',
          jobTitle: '',
          industry: '',
          group: '',
          rsvpStatus: 'confirmed',
          notes: '',
          tableName: 'Table 1',
          interests: '',
          dietaryRestrictions: '',
          accessibilityNeeds: '',
        },
        {
          firstName: 'Bob',
          lastName: 'Brown',
          email: 'bob@example.com',
          company: '',
          jobTitle: '',
          industry: '',
          group: '',
          rsvpStatus: 'pending',
          notes: '',
          tableName: 'Table 2',
          interests: '',
          dietaryRestrictions: '',
          accessibilityNeeds: '',
        },
      ];

      const csv = exportDataToCSV(exportData);

      const lines = csv.split('\n');
      expect(lines.length).toBe(3); // header + 2 guests
      expect(csv).toContain('Alice');
      expect(csv).toContain('Bob');
    });
  });
});
