import type {
  Guest,
  ProjectGuest,
  DuplicateGuestMatch,
  DuplicateDetectionResult,
} from '@/types';

/**
 * Calculate Levenshtein distance between two strings
 * Used for fuzzy name matching
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  // Initialize matrix
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  // Fill matrix
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j] + 1 // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Calculate similarity score between two strings (0-1)
 * 1 = identical, 0 = completely different
 */
function stringSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length === 0 || b.length === 0) return 0;

  const distance = levenshteinDistance(a.toLowerCase(), b.toLowerCase());
  const maxLength = Math.max(a.length, b.length);
  return 1 - distance / maxLength;
}

/**
 * Normalize an email address for comparison
 */
function normalizeEmail(email: string | undefined | null): string {
  if (!email) return '';
  return email.toLowerCase().trim();
}

/**
 * Normalize a name for comparison
 * Handles common variations like accents, hyphens, apostrophes
 */
function normalizeName(name: string | undefined | null): string {
  if (!name) return '';
  return name
    .toLowerCase()
    .trim()
    // Remove accents
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    // Standardize separators
    .replace(/[-']/g, ' ')
    // Remove extra spaces
    .replace(/\s+/g, ' ');
}

/**
 * Get full name from a guest object
 */
function getFullName(guest: Pick<Guest | ProjectGuest, 'firstName' | 'lastName'>): string {
  return `${guest.firstName || ''} ${guest.lastName || ''}`.trim();
}

/**
 * Calculate confidence score for a name match
 */
function calculateNameMatchConfidence(
  existingGuest: ProjectGuest,
  newGuest: Guest | ProjectGuest
): number {
  const existingFirst = normalizeName(existingGuest.firstName);
  const existingLast = normalizeName(existingGuest.lastName);
  const newFirst = normalizeName(newGuest.firstName);
  const newLast = normalizeName(newGuest.lastName);

  // Calculate similarity for first and last names separately
  const firstNameSimilarity = stringSimilarity(existingFirst, newFirst);
  const lastNameSimilarity = stringSimilarity(existingLast, newLast);

  // Weight last name more heavily (often more reliable)
  const weightedScore = firstNameSimilarity * 0.4 + lastNameSimilarity * 0.6;

  // Bonus for matching additional fields
  let bonus = 0;

  // Same company
  if (
    existingGuest.company &&
    'company' in newGuest &&
    newGuest.company &&
    normalizeName(existingGuest.company) === normalizeName(newGuest.company)
  ) {
    bonus += 0.1;
  }

  // Same phone (if available)
  if (
    existingGuest.phone &&
    'phone' in newGuest &&
    newGuest.phone &&
    existingGuest.phone.replace(/\D/g, '') === newGuest.phone.replace(/\D/g, '')
  ) {
    bonus += 0.15;
  }

  return Math.min(1, weightedScore + bonus);
}

/**
 * Detect duplicate guests when merging events into a project
 *
 * @param existingGuests - Guests already in the project's master list
 * @param newGuests - Guests being added (from an event being moved to the project)
 * @param options - Detection options
 * @returns Detection result with exact matches, fuzzy matches, and new guests
 */
export function detectDuplicateGuests(
  existingGuests: ProjectGuest[],
  newGuests: Array<Guest | ProjectGuest>,
  options: {
    /** Minimum similarity score (0-1) to consider a fuzzy match. Default: 0.85 */
    fuzzyThreshold?: number;
    /** Whether to check for fuzzy name matches. Default: true */
    enableFuzzyMatching?: boolean;
  } = {}
): DuplicateDetectionResult {
  const { fuzzyThreshold = 0.85, enableFuzzyMatching = true } = options;

  const exactMatches: DuplicateGuestMatch[] = [];
  const fuzzyMatches: DuplicateGuestMatch[] = [];
  const newGuestsResult: Array<Guest | ProjectGuest> = [];

  // Build email lookup for existing guests
  const existingByEmail = new Map<string, ProjectGuest>();
  for (const guest of existingGuests) {
    const email = normalizeEmail(guest.email);
    if (email) {
      existingByEmail.set(email, guest);
    }
  }

  // Process each new guest
  for (const newGuest of newGuests) {
    let matched = false;

    // Check for exact email match first
    const newEmail = normalizeEmail(newGuest.email);
    if (newEmail && existingByEmail.has(newEmail)) {
      const existingGuest = existingByEmail.get(newEmail)!;
      exactMatches.push({
        existingGuest,
        newGuest,
        matchType: 'exact_email',
        confidence: 1.0,
      });
      matched = true;
    }

    // If no email match and fuzzy matching is enabled, check for name similarity
    if (!matched && enableFuzzyMatching) {
      let bestMatch: { guest: ProjectGuest; confidence: number } | null = null;

      for (const existingGuest of existingGuests) {
        const confidence = calculateNameMatchConfidence(existingGuest, newGuest);

        if (confidence >= fuzzyThreshold) {
          if (!bestMatch || confidence > bestMatch.confidence) {
            bestMatch = { guest: existingGuest, confidence };
          }
        }
      }

      if (bestMatch) {
        fuzzyMatches.push({
          existingGuest: bestMatch.guest,
          newGuest,
          matchType: 'fuzzy_name',
          confidence: bestMatch.confidence,
        });
        matched = true;
      }
    }

    // If no match found, it's a new guest
    if (!matched) {
      newGuestsResult.push(newGuest);
    }
  }

  return {
    exactMatches,
    fuzzyMatches,
    newGuests: newGuestsResult,
  };
}

/**
 * Merge data from a new guest into an existing project guest
 * Prefers existing data but fills in missing fields from new guest
 */
export function mergeGuestData(
  existing: ProjectGuest,
  incoming: Guest | ProjectGuest
): Partial<ProjectGuest> {
  return {
    // Keep existing identifiers
    id: existing.id,
    projectId: existing.projectId,

    // Prefer existing names (more likely to be canonical)
    firstName: existing.firstName || incoming.firstName,
    lastName: existing.lastName || incoming.lastName,

    // Fill in missing contact info
    email: existing.email || incoming.email,
    phone: existing.phone || ('phone' in incoming ? incoming.phone : undefined),

    // Fill in missing profile data
    company: existing.company || incoming.company,
    jobTitle: existing.jobTitle || incoming.jobTitle,
    industry: existing.industry || incoming.industry,
    profileSummary: existing.profileSummary || ('profileSummary' in incoming ? incoming.profileSummary : undefined),

    // Merge group/notes (combine if both exist)
    groupName: existing.groupName || ('groupName' in incoming ? incoming.groupName : ('group' in incoming ? incoming.group : undefined)),
    notes: existing.notes && incoming.notes
      ? `${existing.notes}\n---\n${incoming.notes}`
      : existing.notes || incoming.notes,

    // Fill in missing accessibility/dietary info
    dietaryRestrictions:
      existing.dietaryRestrictions ||
      ('dietaryRestrictions' in incoming && typeof incoming.dietaryRestrictions === 'string'
        ? incoming.dietaryRestrictions
        : Array.isArray(incoming.dietaryRestrictions)
          ? incoming.dietaryRestrictions.join(', ')
          : undefined),
    accessibilityNeeds:
      existing.accessibilityNeeds ||
      ('accessibilityNeeds' in incoming && typeof incoming.accessibilityNeeds === 'string'
        ? incoming.accessibilityNeeds
        : Array.isArray(incoming.accessibilityNeeds)
          ? incoming.accessibilityNeeds.join(', ')
          : undefined),
  };
}

/**
 * Convert a standalone event Guest to a ProjectGuest format
 */
export function convertGuestToProjectGuest(
  guest: Guest,
  projectId: string
): Omit<ProjectGuest, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    projectId,
    firstName: guest.firstName,
    lastName: guest.lastName,
    email: guest.email,
    company: guest.company,
    jobTitle: guest.jobTitle,
    industry: guest.industry,
    profileSummary: guest.profileSummary,
    groupName: guest.group,
    notes: guest.notes,
    dietaryRestrictions: guest.dietaryRestrictions?.join(', '),
    accessibilityNeeds: guest.accessibilityNeeds?.join(', '),
  };
}

// Re-export types for convenience
export type { DuplicateGuestMatch, DuplicateDetectionResult };
