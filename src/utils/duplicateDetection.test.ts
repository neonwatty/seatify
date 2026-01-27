import { describe, it, expect } from 'vitest';
import {
  detectDuplicateGuests,
  mergeGuestData,
  convertGuestToProjectGuest,
} from './duplicateDetection';
import type { Guest, ProjectGuest } from '@/types';

describe('duplicateDetection', () => {
  // Helper to create a project guest
  const createProjectGuest = (overrides: Partial<ProjectGuest> = {}): ProjectGuest => ({
    id: 'pg-1',
    projectId: 'project-1',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    ...overrides,
  });

  // Helper to create a regular guest
  const createGuest = (overrides: Partial<Guest> = {}): Guest => ({
    id: 'g-1',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    relationships: [],
    rsvpStatus: 'pending',
    ...overrides,
  });

  describe('detectDuplicateGuests', () => {
    describe('exact email matching', () => {
      it('should detect exact email matches (case-insensitive)', () => {
        const existing = [createProjectGuest({ email: 'John@Example.com' })];
        const newGuests = [createGuest({ email: 'john@example.com' })];

        const result = detectDuplicateGuests(existing, newGuests);

        expect(result.exactMatches).toHaveLength(1);
        expect(result.exactMatches[0].matchType).toBe('exact_email');
        expect(result.exactMatches[0].confidence).toBe(1.0);
        expect(result.fuzzyMatches).toHaveLength(0);
        expect(result.newGuests).toHaveLength(0);
      });

      it('should handle emails with whitespace', () => {
        const existing = [createProjectGuest({ email: '  john@example.com  ' })];
        const newGuests = [createGuest({ email: 'john@example.com' })];

        const result = detectDuplicateGuests(existing, newGuests);

        expect(result.exactMatches).toHaveLength(1);
      });

      it('should not match guests without emails via email matching', () => {
        const existing = [createProjectGuest({ email: undefined })];
        const newGuests = [createGuest({ email: undefined })];

        const result = detectDuplicateGuests(existing, newGuests, {
          enableFuzzyMatching: false,
        });

        expect(result.exactMatches).toHaveLength(0);
        expect(result.newGuests).toHaveLength(1);
      });
    });

    describe('fuzzy name matching', () => {
      it('should detect fuzzy name matches for identical names', () => {
        const existing = [createProjectGuest({ email: undefined })];
        const newGuests = [createGuest({ email: undefined })];

        const result = detectDuplicateGuests(existing, newGuests);

        expect(result.fuzzyMatches).toHaveLength(1);
        expect(result.fuzzyMatches[0].matchType).toBe('fuzzy_name');
        expect(result.fuzzyMatches[0].confidence).toBe(1.0);
      });

      it('should detect fuzzy matches for minor typos', () => {
        const existing = [
          createProjectGuest({
            firstName: 'Jonathan',
            lastName: 'Smith',
            email: undefined,
          }),
        ];
        const newGuests = [
          createGuest({
            firstName: 'Jonathon', // typo
            lastName: 'Smith',
            email: undefined,
          }),
        ];

        const result = detectDuplicateGuests(existing, newGuests);

        expect(result.fuzzyMatches).toHaveLength(1);
        expect(result.fuzzyMatches[0].confidence).toBeGreaterThan(0.85);
      });

      it('should detect fuzzy matches for names with accents', () => {
        const existing = [
          createProjectGuest({
            firstName: 'José',
            lastName: 'García',
            email: undefined,
          }),
        ];
        const newGuests = [
          createGuest({
            firstName: 'Jose',
            lastName: 'Garcia',
            email: undefined,
          }),
        ];

        const result = detectDuplicateGuests(existing, newGuests);

        expect(result.fuzzyMatches).toHaveLength(1);
        expect(result.fuzzyMatches[0].confidence).toBe(1.0);
      });

      it('should handle hyphenated names', () => {
        const existing = [
          createProjectGuest({
            firstName: 'Mary-Jane',
            lastName: "O'Connor",
            email: undefined,
          }),
        ];
        const newGuests = [
          createGuest({
            firstName: 'Mary Jane',
            lastName: 'OConnor',
            email: undefined,
          }),
        ];

        const result = detectDuplicateGuests(existing, newGuests);

        expect(result.fuzzyMatches).toHaveLength(1);
        expect(result.fuzzyMatches[0].confidence).toBeGreaterThan(0.85);
      });

      it('should not match completely different names', () => {
        const existing = [
          createProjectGuest({
            firstName: 'Alice',
            lastName: 'Williams',
            email: undefined,
          }),
        ];
        const newGuests = [
          createGuest({
            firstName: 'Bob',
            lastName: 'Johnson',
            email: undefined,
          }),
        ];

        const result = detectDuplicateGuests(existing, newGuests);

        expect(result.fuzzyMatches).toHaveLength(0);
        expect(result.newGuests).toHaveLength(1);
      });

      it('should respect fuzzyThreshold option', () => {
        const existing = [
          createProjectGuest({
            firstName: 'Jonathan',
            lastName: 'Smith',
            email: undefined,
          }),
        ];
        const newGuests = [
          createGuest({
            firstName: 'Jon', // abbreviated
            lastName: 'Smith',
            email: undefined,
          }),
        ];

        // With high threshold, should not match
        const strictResult = detectDuplicateGuests(existing, newGuests, {
          fuzzyThreshold: 0.95,
        });
        expect(strictResult.fuzzyMatches).toHaveLength(0);

        // With lower threshold, should match
        const looseResult = detectDuplicateGuests(existing, newGuests, {
          fuzzyThreshold: 0.7,
        });
        expect(looseResult.fuzzyMatches).toHaveLength(1);
      });

      it('should disable fuzzy matching when option is false', () => {
        const existing = [createProjectGuest({ email: undefined })];
        const newGuests = [createGuest({ email: undefined })];

        const result = detectDuplicateGuests(existing, newGuests, {
          enableFuzzyMatching: false,
        });

        expect(result.fuzzyMatches).toHaveLength(0);
        expect(result.newGuests).toHaveLength(1);
      });

      it('should boost confidence for matching company', () => {
        const existing = [
          createProjectGuest({
            firstName: 'John',
            lastName: 'Smith',
            email: undefined,
            company: 'Acme Corp',
          }),
        ];
        const newGuests = [
          createGuest({
            firstName: 'Jon', // slightly different
            lastName: 'Smith',
            email: undefined,
            company: 'Acme Corp',
          }),
        ];

        const withCompany = detectDuplicateGuests(existing, newGuests, {
          fuzzyThreshold: 0.75,
        });

        const existingNoCompany = [
          createProjectGuest({
            firstName: 'John',
            lastName: 'Smith',
            email: undefined,
            company: undefined,
          }),
        ];
        const newGuestsNoCompany = [
          createGuest({
            firstName: 'Jon',
            lastName: 'Smith',
            email: undefined,
            company: undefined,
          }),
        ];

        const withoutCompany = detectDuplicateGuests(
          existingNoCompany,
          newGuestsNoCompany,
          { fuzzyThreshold: 0.75 }
        );

        // Both should match, but with company should have higher confidence
        expect(withCompany.fuzzyMatches).toHaveLength(1);
        expect(withoutCompany.fuzzyMatches).toHaveLength(1);
        expect(withCompany.fuzzyMatches[0].confidence).toBeGreaterThan(
          withoutCompany.fuzzyMatches[0].confidence
        );
      });
    });

    describe('email takes priority over fuzzy', () => {
      it('should prefer email match over fuzzy match', () => {
        const existing = [
          createProjectGuest({
            firstName: 'John',
            lastName: 'Doe',
            email: 'john@example.com',
          }),
          createProjectGuest({
            id: 'pg-2',
            firstName: 'John',
            lastName: 'Doe',
            email: 'johnd@company.com',
          }),
        ];
        const newGuests = [
          createGuest({
            firstName: 'John',
            lastName: 'Doe',
            email: 'john@example.com',
          }),
        ];

        const result = detectDuplicateGuests(existing, newGuests);

        // Should match by email, not create a fuzzy match
        expect(result.exactMatches).toHaveLength(1);
        expect(result.fuzzyMatches).toHaveLength(0);
      });
    });

    describe('multiple guests', () => {
      it('should handle multiple guests with mixed results', () => {
        const existing = [
          createProjectGuest({
            id: 'pg-1',
            firstName: 'John',
            lastName: 'Doe',
            email: 'john@example.com',
          }),
          createProjectGuest({
            id: 'pg-2',
            firstName: 'Jane',
            lastName: 'Smith',
            email: undefined,
          }),
        ];
        const newGuests = [
          createGuest({
            id: 'g-1',
            firstName: 'John',
            lastName: 'Doe',
            email: 'john@example.com',
          }), // exact match
          createGuest({
            id: 'g-2',
            firstName: 'Jane',
            lastName: 'Smith',
            email: undefined,
          }), // fuzzy match
          createGuest({
            id: 'g-3',
            firstName: 'Bob',
            lastName: 'Wilson',
            email: 'bob@example.com',
          }), // new guest
        ];

        const result = detectDuplicateGuests(existing, newGuests);

        expect(result.exactMatches).toHaveLength(1);
        expect(result.exactMatches[0].newGuest.id).toBe('g-1');

        expect(result.fuzzyMatches).toHaveLength(1);
        expect(result.fuzzyMatches[0].newGuest.id).toBe('g-2');

        expect(result.newGuests).toHaveLength(1);
        expect(result.newGuests[0].id).toBe('g-3');
      });

      it('should handle empty existing list', () => {
        const newGuests = [
          createGuest({ id: 'g-1' }),
          createGuest({ id: 'g-2' }),
        ];

        const result = detectDuplicateGuests([], newGuests);

        expect(result.exactMatches).toHaveLength(0);
        expect(result.fuzzyMatches).toHaveLength(0);
        expect(result.newGuests).toHaveLength(2);
      });

      it('should handle empty new guests list', () => {
        const existing = [createProjectGuest()];

        const result = detectDuplicateGuests(existing, []);

        expect(result.exactMatches).toHaveLength(0);
        expect(result.fuzzyMatches).toHaveLength(0);
        expect(result.newGuests).toHaveLength(0);
      });
    });
  });

  describe('mergeGuestData', () => {
    it('should preserve existing identifiers', () => {
      const existing = createProjectGuest({ id: 'pg-1', projectId: 'proj-1' });
      const incoming = createGuest({ id: 'g-1' });

      const merged = mergeGuestData(existing, incoming);

      expect(merged.id).toBe('pg-1');
      expect(merged.projectId).toBe('proj-1');
    });

    it('should prefer existing data for names', () => {
      const existing = createProjectGuest({
        firstName: 'Jonathan',
        lastName: 'Smith',
      });
      const incoming = createGuest({
        firstName: 'Jon',
        lastName: 'Smith',
      });

      const merged = mergeGuestData(existing, incoming);

      expect(merged.firstName).toBe('Jonathan');
    });

    it('should fill in missing contact info from incoming', () => {
      const existing = createProjectGuest({
        email: undefined,
        phone: undefined,
      });
      const incoming: Guest = {
        ...createGuest(),
        email: 'new@example.com',
      };

      const merged = mergeGuestData(existing, incoming);

      expect(merged.email).toBe('new@example.com');
    });

    it('should combine notes when both exist', () => {
      const existing = createProjectGuest({ notes: 'Existing note' });
      const incoming = createGuest({ notes: 'Incoming note' });

      const merged = mergeGuestData(existing, incoming);

      expect(merged.notes).toContain('Existing note');
      expect(merged.notes).toContain('Incoming note');
      expect(merged.notes).toContain('---');
    });

    it('should convert array dietary restrictions to string', () => {
      const existing = createProjectGuest({ dietaryRestrictions: undefined });
      const incoming = createGuest({
        dietaryRestrictions: ['Vegetarian', 'Gluten-free'],
      });

      const merged = mergeGuestData(existing, incoming);

      expect(merged.dietaryRestrictions).toBe('Vegetarian, Gluten-free');
    });
  });

  describe('convertGuestToProjectGuest', () => {
    it('should convert a Guest to ProjectGuest format', () => {
      const guest = createGuest({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        company: 'Acme',
        group: 'VIP',
        dietaryRestrictions: ['Vegetarian'],
        accessibilityNeeds: ['Wheelchair'],
      });

      const converted = convertGuestToProjectGuest(guest, 'project-123');

      expect(converted.projectId).toBe('project-123');
      expect(converted.firstName).toBe('John');
      expect(converted.lastName).toBe('Doe');
      expect(converted.email).toBe('john@example.com');
      expect(converted.company).toBe('Acme');
      expect(converted.groupName).toBe('VIP');
      expect(converted.dietaryRestrictions).toBe('Vegetarian');
      expect(converted.accessibilityNeeds).toBe('Wheelchair');
    });

    it('should handle missing optional fields', () => {
      const guest = createGuest({
        company: undefined,
        group: undefined,
        dietaryRestrictions: undefined,
      });

      const converted = convertGuestToProjectGuest(guest, 'project-123');

      expect(converted.company).toBeUndefined();
      expect(converted.groupName).toBeUndefined();
      expect(converted.dietaryRestrictions).toBeUndefined();
    });
  });
});
