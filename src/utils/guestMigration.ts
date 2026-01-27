/**
 * Guest Migration Utilities
 *
 * Handles migrating guests from standalone events into project master lists,
 * including duplicate detection, data merging, and relationship migration.
 */

import type {
  Guest,
  ProjectGuest,
  DuplicateGuestMatch,
  DuplicateDetectionResult,
  ProjectGuestRelationship,
} from '@/types';
import {
  detectDuplicateGuests,
  mergeGuestData,
  convertGuestToProjectGuest,
} from './duplicateDetection';

type MergeAction = 'merge' | 'keep_both' | 'skip';

interface MergeDecision {
  matchIndex: number;
  action: MergeAction;
}

interface MigrationDecisions {
  exactMatchDecisions: MergeDecision[];
  fuzzyMatchDecisions: MergeDecision[];
}

interface MigrationPlan {
  /** Guests to merge with existing project guests (updates to existing records) */
  guestsToMerge: Array<{
    existingGuestId: string;
    mergedData: Partial<ProjectGuest>;
    sourceGuestId: string;
  }>;

  /** New guests to add to the project */
  guestsToAdd: Array<Omit<ProjectGuest, 'id' | 'createdAt' | 'updatedAt'>>;

  /** Guests that will be skipped */
  guestsSkipped: Array<{ guestId: string; guestName: string; reason: string }>;

  /** Mapping from old event guest IDs to new project guest IDs (for relationship migration) */
  guestIdMapping: Map<string, string>;
}

interface RelationshipMigrationPlan {
  /** Relationships to create at project level */
  relationshipsToCreate: Array<
    Omit<ProjectGuestRelationship, 'id' | 'createdAt' | 'updatedAt'>
  >;

  /** Relationships that couldn't be migrated */
  relationshipsSkipped: Array<{
    sourceGuestId: string;
    targetGuestId: string;
    reason: string;
  }>;
}

/**
 * Create a migration plan based on duplicate detection results and user decisions
 */
export function createMigrationPlan(
  detectionResult: DuplicateDetectionResult,
  decisions: MigrationDecisions,
  projectId: string
): MigrationPlan {
  const guestsToMerge: MigrationPlan['guestsToMerge'] = [];
  const guestsToAdd: MigrationPlan['guestsToAdd'] = [];
  const guestsSkipped: MigrationPlan['guestsSkipped'] = [];
  const guestIdMapping = new Map<string, string>();

  // Process exact matches
  detectionResult.exactMatches.forEach((match, index) => {
    const decision = decisions.exactMatchDecisions[index]?.action || 'merge';
    processMatch(match, decision, 'exact_email');
  });

  // Process fuzzy matches
  detectionResult.fuzzyMatches.forEach((match, index) => {
    const decision = decisions.fuzzyMatchDecisions[index]?.action || 'merge';
    processMatch(match, decision, 'fuzzy_name');
  });

  // Process new guests (always add)
  detectionResult.newGuests.forEach((guest) => {
    const projectGuest = convertGuestToProjectGuest(guest as Guest, projectId);
    guestsToAdd.push(projectGuest);
    // ID mapping will be updated after creation with actual IDs
  });

  function processMatch(
    match: DuplicateGuestMatch,
    action: MergeAction,
    matchType: string
  ) {
    const newGuestId = match.newGuest.id;
    const existingGuestId = match.existingGuest.id;
    const guestName = `${match.newGuest.firstName} ${match.newGuest.lastName}`;

    switch (action) {
      case 'merge':
        // Merge data from new guest into existing
        const mergedData = mergeGuestData(match.existingGuest, match.newGuest);
        guestsToMerge.push({
          existingGuestId,
          mergedData,
          sourceGuestId: newGuestId,
        });
        // Map old ID to existing project guest ID
        guestIdMapping.set(newGuestId, existingGuestId);
        break;

      case 'keep_both':
        // Add as new guest
        const projectGuest = convertGuestToProjectGuest(match.newGuest as Guest, projectId);
        guestsToAdd.push(projectGuest);
        // ID mapping will be updated after creation
        break;

      case 'skip':
        guestsSkipped.push({
          guestId: newGuestId,
          guestName,
          reason: `Skipped (${matchType} match with ${match.existingGuest.firstName} ${match.existingGuest.lastName})`,
        });
        break;
    }
  }

  return {
    guestsToMerge,
    guestsToAdd,
    guestsSkipped,
    guestIdMapping,
  };
}

/**
 * Create a relationship migration plan based on event relationships and guest ID mapping
 */
export function createRelationshipMigrationPlan(
  eventGuests: Guest[],
  guestIdMapping: Map<string, string>,
  projectId: string,
  existingRelationships: ProjectGuestRelationship[]
): RelationshipMigrationPlan {
  const relationshipsToCreate: RelationshipMigrationPlan['relationshipsToCreate'] = [];
  const relationshipsSkipped: RelationshipMigrationPlan['relationshipsSkipped'] = [];

  // Build a set of existing relationships for quick lookup
  const existingRelationshipSet = new Set(
    existingRelationships.map((r) => `${r.guestId}-${r.relatedGuestId}`)
  );

  // Extract all relationships from event guests
  for (const guest of eventGuests) {
    if (!guest.relationships || guest.relationships.length === 0) continue;

    const sourceProjectGuestId = guestIdMapping.get(guest.id);
    if (!sourceProjectGuestId) {
      // Source guest was skipped
      guest.relationships.forEach((rel) => {
        relationshipsSkipped.push({
          sourceGuestId: guest.id,
          targetGuestId: rel.guestId,
          reason: 'Source guest was skipped',
        });
      });
      continue;
    }

    for (const relationship of guest.relationships) {
      const targetProjectGuestId = guestIdMapping.get(relationship.guestId);

      if (!targetProjectGuestId) {
        relationshipsSkipped.push({
          sourceGuestId: guest.id,
          targetGuestId: relationship.guestId,
          reason: 'Target guest was skipped',
        });
        continue;
      }

      // Check if relationship already exists (in either direction)
      const relationshipKey1 = `${sourceProjectGuestId}-${targetProjectGuestId}`;
      const relationshipKey2 = `${targetProjectGuestId}-${sourceProjectGuestId}`;

      if (existingRelationshipSet.has(relationshipKey1) || existingRelationshipSet.has(relationshipKey2)) {
        // Relationship already exists, skip
        continue;
      }

      // Map event relationship type to project relationship type
      const projectRelationshipType = mapRelationshipType(relationship.type);

      relationshipsToCreate.push({
        projectId,
        guestId: sourceProjectGuestId,
        relatedGuestId: targetProjectGuestId,
        relationshipType: projectRelationshipType,
        strength: relationship.strength,
      });

      // Add to set to prevent duplicates
      existingRelationshipSet.add(relationshipKey1);
    }
  }

  return {
    relationshipsToCreate,
    relationshipsSkipped,
  };
}

/**
 * Map event-level relationship type to project-level relationship type
 */
function mapRelationshipType(
  eventType: string
): ProjectGuestRelationship['relationshipType'] {
  // Both use the same types, but this provides a place for future mapping
  const validTypes = ['family', 'friend', 'colleague', 'acquaintance', 'partner', 'prefer', 'avoid'];

  if (validTypes.includes(eventType)) {
    return eventType as ProjectGuestRelationship['relationshipType'];
  }

  // Default fallback
  return 'acquaintance';
}

/**
 * Prepare event data for migration preview
 * Returns duplicate detection result without making any changes
 */
export function prepareMigrationPreview(
  existingProjectGuests: ProjectGuest[],
  eventGuests: Guest[],
  options?: {
    fuzzyThreshold?: number;
    enableFuzzyMatching?: boolean;
  }
): DuplicateDetectionResult {
  return detectDuplicateGuests(existingProjectGuests, eventGuests, options);
}

/**
 * Calculate migration summary stats
 */
export function calculateMigrationSummary(
  detectionResult: DuplicateDetectionResult,
  decisions: MigrationDecisions
): {
  totalGuests: number;
  toMerge: number;
  toAdd: number;
  toSkip: number;
  newOnly: number;
} {
  let toMerge = 0;
  let toAdd = 0;
  let toSkip = 0;

  decisions.exactMatchDecisions.forEach((d) => {
    switch (d.action) {
      case 'merge': toMerge++; break;
      case 'keep_both': toAdd++; break;
      case 'skip': toSkip++; break;
    }
  });

  decisions.fuzzyMatchDecisions.forEach((d) => {
    switch (d.action) {
      case 'merge': toMerge++; break;
      case 'keep_both': toAdd++; break;
      case 'skip': toSkip++; break;
    }
  });

  const newOnly = detectionResult.newGuests.length;

  return {
    totalGuests: detectionResult.exactMatches.length +
                 detectionResult.fuzzyMatches.length +
                 detectionResult.newGuests.length,
    toMerge,
    toAdd: toAdd + newOnly,
    toSkip,
    newOnly,
  };
}

// Re-export types and functions from duplicateDetection for convenience
export type { MergeAction, MergeDecision, MigrationDecisions, MigrationPlan, RelationshipMigrationPlan };
export { detectDuplicateGuests, mergeGuestData, convertGuestToProjectGuest };
