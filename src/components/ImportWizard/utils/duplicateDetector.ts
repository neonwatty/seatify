import type { Guest } from '../../../types';
import { getFullName } from '../../../types';
import type { DuplicateCandidate } from '../types';

const DUPLICATE_THRESHOLD = 0.7; // 70% match score = potential duplicate

/**
 * Detect potential duplicates between new guests and existing guests
 */
export function detectDuplicates(
  newGuests: Partial<Guest>[],
  existingGuests: Guest[]
): DuplicateCandidate[] {
  const duplicates: DuplicateCandidate[] = [];

  for (let i = 0; i < newGuests.length; i++) {
    const newGuest = newGuests[i];

    for (const existing of existingGuests) {
      const { score, reasons } = calculateMatchScore(newGuest, existing);

      if (score >= DUPLICATE_THRESHOLD) {
        duplicates.push({
          newGuestIndex: i,
          newGuest,
          existingGuest: existing,
          matchScore: score,
          matchReasons: reasons,
        });
        // Only keep the best match for each new guest
        break;
      }
    }
  }

  return duplicates;
}

/**
 * Calculate match score between a new guest and existing guest
 */
function calculateMatchScore(
  newGuest: Partial<Guest>,
  existing: Guest
): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  let weightedScore = 0;
  let totalWeight = 0;

  // Email match (highest weight - definitive identifier)
  if (newGuest.email && existing.email) {
    totalWeight += 0.5;
    if (normalizeEmail(newGuest.email) === normalizeEmail(existing.email)) {
      weightedScore += 0.5;
      reasons.push('Same email');
    }
  }

  // Name similarity
  const newFullName = `${newGuest.firstName || ''} ${newGuest.lastName || ''}`
    .toLowerCase()
    .trim();
  const existingFullName = getFullName(existing).toLowerCase();

  if (newFullName && existingFullName) {
    totalWeight += 0.35;
    const nameSimilarity = calculateStringSimilarity(newFullName, existingFullName);

    if (nameSimilarity > 0.85) {
      weightedScore += 0.35 * nameSimilarity;
      if (nameSimilarity > 0.95) {
        reasons.push('Same name');
      } else {
        reasons.push('Similar name');
      }
    }
  }

  // Company + Name combo (for corporate events)
  if (newGuest.company && existing.company) {
    totalWeight += 0.15;
    const companySimilarity = calculateStringSimilarity(
      newGuest.company.toLowerCase(),
      existing.company.toLowerCase()
    );

    if (companySimilarity > 0.9) {
      // If same company and somewhat similar name, increase match confidence
      const nameSimilarity = calculateStringSimilarity(newFullName, existingFullName);
      if (nameSimilarity > 0.7) {
        weightedScore += 0.15;
        reasons.push('Same company');
      }
    }
  }

  // Normalize score if we have any weights
  const finalScore = totalWeight > 0 ? weightedScore / totalWeight : 0;

  return { score: finalScore, reasons };
}

/**
 * Normalize email for comparison
 */
function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

/**
 * Calculate similarity between two strings using Levenshtein distance
 * Returns a value between 0 (no similarity) and 1 (identical)
 */
function calculateStringSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  if (!a || !b) return 0;

  const distance = levenshteinDistance(a, b);
  const maxLength = Math.max(a.length, b.length);

  return 1 - distance / maxLength;
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  // Initialize first column
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  // Initialize first row
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  // Fill in the rest of the matrix
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
 * Get indices of new guests that are potential duplicates
 */
export function getDuplicateIndices(duplicates: DuplicateCandidate[]): Set<number> {
  return new Set(duplicates.map((d) => d.newGuestIndex));
}
