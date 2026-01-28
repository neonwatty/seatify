import { describe, it, expect } from 'vitest';
import {
  createMigrationPlan,
  createRelationshipMigrationPlan,
  calculateMigrationSummary,
  prepareMigrationPreview,
} from './guestMigration';
import type {
  Guest,
  ProjectGuest,
  DuplicateDetectionResult,
  ProjectGuestRelationship,
} from '@/types';

describe('guestMigration', () => {
  // Helper to create a project guest
  const createProjectGuest = (overrides: Partial<ProjectGuest> = {}): ProjectGuest => ({
    id: 'pg-1',
    projectId: 'project-1',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
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

  describe('createMigrationPlan', () => {
    it('should merge exact matches when action is merge', () => {
      const detectionResult: DuplicateDetectionResult = {
        exactMatches: [
          {
            existingGuest: createProjectGuest({ id: 'pg-1' }),
            newGuest: createGuest({ id: 'g-1', company: 'New Company' }),
            matchType: 'exact_email',
            confidence: 1.0,
          },
        ],
        fuzzyMatches: [],
        newGuests: [],
      };

      const decisions = {
        exactMatchDecisions: [{ matchIndex: 0, action: 'merge' as const }],
        fuzzyMatchDecisions: [],
      };

      const plan = createMigrationPlan(detectionResult, decisions, 'project-1');

      expect(plan.guestsToMerge).toHaveLength(1);
      expect(plan.guestsToMerge[0].existingGuestId).toBe('pg-1');
      expect(plan.guestsToMerge[0].sourceGuestId).toBe('g-1');
      expect(plan.guestIdMapping.get('g-1')).toBe('pg-1');
      expect(plan.guestsToAdd).toHaveLength(0);
      expect(plan.guestsSkipped).toHaveLength(0);
    });

    it('should add guest when action is keep_both', () => {
      const detectionResult: DuplicateDetectionResult = {
        exactMatches: [
          {
            existingGuest: createProjectGuest({ id: 'pg-1' }),
            newGuest: createGuest({ id: 'g-1' }),
            matchType: 'exact_email',
            confidence: 1.0,
          },
        ],
        fuzzyMatches: [],
        newGuests: [],
      };

      const decisions = {
        exactMatchDecisions: [{ matchIndex: 0, action: 'keep_both' as const }],
        fuzzyMatchDecisions: [],
      };

      const plan = createMigrationPlan(detectionResult, decisions, 'project-1');

      expect(plan.guestsToAdd).toHaveLength(1);
      expect(plan.guestsToMerge).toHaveLength(0);
      expect(plan.guestsSkipped).toHaveLength(0);
    });

    it('should skip guest when action is skip', () => {
      const detectionResult: DuplicateDetectionResult = {
        exactMatches: [
          {
            existingGuest: createProjectGuest({ id: 'pg-1' }),
            newGuest: createGuest({ id: 'g-1' }),
            matchType: 'exact_email',
            confidence: 1.0,
          },
        ],
        fuzzyMatches: [],
        newGuests: [],
      };

      const decisions = {
        exactMatchDecisions: [{ matchIndex: 0, action: 'skip' as const }],
        fuzzyMatchDecisions: [],
      };

      const plan = createMigrationPlan(detectionResult, decisions, 'project-1');

      expect(plan.guestsSkipped).toHaveLength(1);
      expect(plan.guestsSkipped[0].guestId).toBe('g-1');
      expect(plan.guestsToMerge).toHaveLength(0);
      expect(plan.guestsToAdd).toHaveLength(0);
    });

    it('should always add new guests', () => {
      const detectionResult: DuplicateDetectionResult = {
        exactMatches: [],
        fuzzyMatches: [],
        newGuests: [
          createGuest({ id: 'g-1', firstName: 'Alice', lastName: 'Smith' }),
          createGuest({ id: 'g-2', firstName: 'Bob', lastName: 'Jones' }),
        ],
      };

      const decisions = {
        exactMatchDecisions: [],
        fuzzyMatchDecisions: [],
      };

      const plan = createMigrationPlan(detectionResult, decisions, 'project-1');

      expect(plan.guestsToAdd).toHaveLength(2);
      expect(plan.guestsToAdd[0].firstName).toBe('Alice');
      expect(plan.guestsToAdd[1].firstName).toBe('Bob');
    });

    it('should handle mixed decisions', () => {
      const detectionResult: DuplicateDetectionResult = {
        exactMatches: [
          {
            existingGuest: createProjectGuest({ id: 'pg-1' }),
            newGuest: createGuest({ id: 'g-1' }),
            matchType: 'exact_email',
            confidence: 1.0,
          },
        ],
        fuzzyMatches: [
          {
            existingGuest: createProjectGuest({ id: 'pg-2', firstName: 'Jane' }),
            newGuest: createGuest({ id: 'g-2', firstName: 'Jane' }),
            matchType: 'fuzzy_name',
            confidence: 0.9,
          },
        ],
        newGuests: [createGuest({ id: 'g-3', firstName: 'New' })],
      };

      const decisions = {
        exactMatchDecisions: [{ matchIndex: 0, action: 'merge' as const }],
        fuzzyMatchDecisions: [{ matchIndex: 0, action: 'skip' as const }],
      };

      const plan = createMigrationPlan(detectionResult, decisions, 'project-1');

      expect(plan.guestsToMerge).toHaveLength(1);
      expect(plan.guestsSkipped).toHaveLength(1);
      expect(plan.guestsToAdd).toHaveLength(1);
    });

    it('should default to merge when no decision provided', () => {
      const detectionResult: DuplicateDetectionResult = {
        exactMatches: [
          {
            existingGuest: createProjectGuest({ id: 'pg-1' }),
            newGuest: createGuest({ id: 'g-1' }),
            matchType: 'exact_email',
            confidence: 1.0,
          },
        ],
        fuzzyMatches: [],
        newGuests: [],
      };

      const decisions = {
        exactMatchDecisions: [], // No decision provided
        fuzzyMatchDecisions: [],
      };

      const plan = createMigrationPlan(detectionResult, decisions, 'project-1');

      expect(plan.guestsToMerge).toHaveLength(1);
    });
  });

  describe('createRelationshipMigrationPlan', () => {
    it('should migrate relationships when both guests are mapped', () => {
      const eventGuests: Guest[] = [
        createGuest({
          id: 'g-1',
          firstName: 'John',
          relationships: [
            { guestId: 'g-2', type: 'partner', strength: 5 },
          ],
        }),
        createGuest({ id: 'g-2', firstName: 'Jane' }),
      ];

      const guestIdMapping = new Map([
        ['g-1', 'pg-1'],
        ['g-2', 'pg-2'],
      ]);

      const plan = createRelationshipMigrationPlan(
        eventGuests,
        guestIdMapping,
        'project-1',
        []
      );

      expect(plan.relationshipsToCreate).toHaveLength(1);
      expect(plan.relationshipsToCreate[0].guestId).toBe('pg-1');
      expect(plan.relationshipsToCreate[0].relatedGuestId).toBe('pg-2');
      expect(plan.relationshipsToCreate[0].relationshipType).toBe('partner');
      expect(plan.relationshipsSkipped).toHaveLength(0);
    });

    it('should skip relationships when source guest is not mapped', () => {
      const eventGuests: Guest[] = [
        createGuest({
          id: 'g-1',
          relationships: [{ guestId: 'g-2', type: 'friend', strength: 3 }],
        }),
      ];

      const guestIdMapping = new Map<string, string>(); // Empty mapping

      const plan = createRelationshipMigrationPlan(
        eventGuests,
        guestIdMapping,
        'project-1',
        []
      );

      expect(plan.relationshipsToCreate).toHaveLength(0);
      expect(plan.relationshipsSkipped).toHaveLength(1);
      expect(plan.relationshipsSkipped[0].reason).toBe('Source guest was skipped');
    });

    it('should skip relationships when target guest is not mapped', () => {
      const eventGuests: Guest[] = [
        createGuest({
          id: 'g-1',
          relationships: [{ guestId: 'g-2', type: 'friend', strength: 3 }],
        }),
      ];

      const guestIdMapping = new Map([['g-1', 'pg-1']]); // Only source mapped

      const plan = createRelationshipMigrationPlan(
        eventGuests,
        guestIdMapping,
        'project-1',
        []
      );

      expect(plan.relationshipsToCreate).toHaveLength(0);
      expect(plan.relationshipsSkipped).toHaveLength(1);
      expect(plan.relationshipsSkipped[0].reason).toBe('Target guest was skipped');
    });

    it('should skip relationships that already exist', () => {
      const eventGuests: Guest[] = [
        createGuest({
          id: 'g-1',
          relationships: [{ guestId: 'g-2', type: 'friend', strength: 3 }],
        }),
      ];

      const guestIdMapping = new Map([
        ['g-1', 'pg-1'],
        ['g-2', 'pg-2'],
      ]);

      const existingRelationships: ProjectGuestRelationship[] = [
        {
          id: 'rel-1',
          projectId: 'project-1',
          guestId: 'pg-1',
          relatedGuestId: 'pg-2',
          relationshipType: 'friend',
          strength: 3,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      const plan = createRelationshipMigrationPlan(
        eventGuests,
        guestIdMapping,
        'project-1',
        existingRelationships
      );

      expect(plan.relationshipsToCreate).toHaveLength(0);
      expect(plan.relationshipsSkipped).toHaveLength(0); // Not skipped, just already exists
    });

    it('should not create duplicate relationships in same migration', () => {
      const eventGuests: Guest[] = [
        createGuest({
          id: 'g-1',
          relationships: [{ guestId: 'g-2', type: 'friend', strength: 3 }],
        }),
        createGuest({
          id: 'g-2',
          relationships: [{ guestId: 'g-1', type: 'friend', strength: 3 }], // Reverse
        }),
      ];

      const guestIdMapping = new Map([
        ['g-1', 'pg-1'],
        ['g-2', 'pg-2'],
      ]);

      const plan = createRelationshipMigrationPlan(
        eventGuests,
        guestIdMapping,
        'project-1',
        []
      );

      // Should only create one relationship, not both directions
      expect(plan.relationshipsToCreate).toHaveLength(1);
    });

    it('should handle guests with no relationships', () => {
      const eventGuests: Guest[] = [
        createGuest({ id: 'g-1', relationships: [] }),
        createGuest({ id: 'g-2', relationships: undefined as unknown as Guest['relationships'] }),
      ];

      const guestIdMapping = new Map([
        ['g-1', 'pg-1'],
        ['g-2', 'pg-2'],
      ]);

      const plan = createRelationshipMigrationPlan(
        eventGuests,
        guestIdMapping,
        'project-1',
        []
      );

      expect(plan.relationshipsToCreate).toHaveLength(0);
      expect(plan.relationshipsSkipped).toHaveLength(0);
    });
  });

  describe('calculateMigrationSummary', () => {
    it('should correctly count merge, add, and skip actions', () => {
      const detectionResult: DuplicateDetectionResult = {
        exactMatches: [
          { existingGuest: createProjectGuest(), newGuest: createGuest(), matchType: 'exact_email', confidence: 1 },
          { existingGuest: createProjectGuest(), newGuest: createGuest(), matchType: 'exact_email', confidence: 1 },
        ],
        fuzzyMatches: [
          { existingGuest: createProjectGuest(), newGuest: createGuest(), matchType: 'fuzzy_name', confidence: 0.9 },
        ],
        newGuests: [createGuest(), createGuest()],
      };

      const decisions = {
        exactMatchDecisions: [
          { matchIndex: 0, action: 'merge' as const },
          { matchIndex: 1, action: 'skip' as const },
        ],
        fuzzyMatchDecisions: [
          { matchIndex: 0, action: 'keep_both' as const },
        ],
      };

      const summary = calculateMigrationSummary(detectionResult, decisions);

      expect(summary.totalGuests).toBe(5);
      expect(summary.toMerge).toBe(1);
      expect(summary.toAdd).toBe(3); // 1 keep_both + 2 new
      expect(summary.toSkip).toBe(1);
      expect(summary.newOnly).toBe(2);
    });

    it('should handle empty results', () => {
      const detectionResult: DuplicateDetectionResult = {
        exactMatches: [],
        fuzzyMatches: [],
        newGuests: [],
      };

      const decisions = {
        exactMatchDecisions: [],
        fuzzyMatchDecisions: [],
      };

      const summary = calculateMigrationSummary(detectionResult, decisions);

      expect(summary.totalGuests).toBe(0);
      expect(summary.toMerge).toBe(0);
      expect(summary.toAdd).toBe(0);
      expect(summary.toSkip).toBe(0);
      expect(summary.newOnly).toBe(0);
    });
  });

  describe('prepareMigrationPreview', () => {
    it('should return duplicate detection results', () => {
      const existingGuests = [
        createProjectGuest({ id: 'pg-1', email: 'john@example.com', firstName: 'John', lastName: 'Existing' }),
      ];
      const eventGuests = [
        createGuest({ id: 'g-1', email: 'john@example.com', firstName: 'John', lastName: 'Match' }),
        createGuest({ id: 'g-2', email: 'new@example.com', firstName: 'New', lastName: 'Guest' }),
      ];

      const result = prepareMigrationPreview(existingGuests, eventGuests);

      // One exact match by email, one new guest
      expect(result.exactMatches).toHaveLength(1);
      expect(result.exactMatches[0].newGuest.email).toBe('john@example.com');
      expect(result.fuzzyMatches).toHaveLength(0);
      expect(result.newGuests).toHaveLength(1);
      expect(result.newGuests[0].email).toBe('new@example.com');
    });

    it('should pass through options', () => {
      const existingGuests = [
        createProjectGuest({ id: 'pg-1', firstName: 'John', email: undefined }),
      ];
      const eventGuests = [
        createGuest({ id: 'g-1', firstName: 'John', email: undefined }),
      ];

      const resultWithFuzzy = prepareMigrationPreview(existingGuests, eventGuests, {
        enableFuzzyMatching: true,
      });

      const resultWithoutFuzzy = prepareMigrationPreview(existingGuests, eventGuests, {
        enableFuzzyMatching: false,
      });

      expect(resultWithFuzzy.fuzzyMatches).toHaveLength(1);
      expect(resultWithoutFuzzy.fuzzyMatches).toHaveLength(0);
    });
  });
});
