import type { EventType } from '../../../types';
import type { ColumnMapping, GuestField } from '../types';

// Pattern matching for field detection
type FieldPatterns = Record<GuestField | 'fullName', RegExp[]>;

const BASE_FIELD_PATTERNS: FieldPatterns = {
  firstName: [
    /^first[_\s-]?name$/i,
    /^fname$/i,
    /^given[_\s-]?name$/i,
    /^first$/i,
    /^forename$/i,
  ],
  lastName: [
    /^last[_\s-]?name$/i,
    /^lname$/i,
    /^surname$/i,
    /^family[_\s-]?name$/i,
    /^last$/i,
  ],
  fullName: [
    /^(full[_\s-]?)?name$/i,
    /^guest[_\s-]?name$/i,
    /^attendee[_\s-]?name$/i,
  ],
  email: [
    /^e[_\s-]?mail$/i,
    /^email[_\s-]?address$/i,
  ],
  company: [
    /^company$/i,
    /^organization$/i,
    /^org$/i,
    /^employer$/i,
    /^firm$/i,
    /^business$/i,
  ],
  jobTitle: [
    /^(job[_\s-]?)?title$/i,
    /^position$/i,
    /^role$/i,
    /^designation$/i,
  ],
  industry: [
    /^industry$/i,
    /^sector$/i,
    /^field$/i,
  ],
  interests: [
    /^interests?$/i,
    /^hobbies?$/i,
  ],
  dietaryRestrictions: [
    /^diet(ary)?$/i,
    /^meal[_\s-]?(choice|preference|type)?$/i,
    /^food[_\s-]?(restriction|allergy|preference)?$/i,
    /^allergies?$/i,
    /^dietary[_\s-]?(restrictions?|requirements?|needs?)?$/i,
  ],
  accessibilityNeeds: [
    /^accessibility$/i,
    /^access[_\s-]?needs?$/i,
    /^special[_\s-]?needs?$/i,
    /^accommodations?$/i,
  ],
  group: [
    /^group$/i,
    /^party$/i,
    /^team$/i,
    /^category$/i,
  ],
  rsvpStatus: [
    /^rsvp$/i,
    /^status$/i,
    /^attending$/i,
    /^response$/i,
    /^confirmed?$/i,
  ],
  notes: [
    /^notes?$/i,
    /^comments?$/i,
    /^remarks?$/i,
    /^special[_\s-]?requests?$/i,
    /^additional[_\s-]?info$/i,
  ],
};

// Wedding-specific patterns (higher priority for wedding events)
const WEDDING_PATTERNS: Partial<FieldPatterns> = {
  group: [
    /^guest[_\s-]?of$/i,
    /^(bride|groom)('?s)?[_\s-]?(side|family|guest)?$/i,
    /^side$/i,
    /^party$/i,
    /^table[_\s-]?group$/i,
  ],
};

// Corporate-specific patterns (higher priority for corporate events)
const CORPORATE_PATTERNS: Partial<FieldPatterns> = {
  group: [
    /^department$/i,
    /^team$/i,
    /^division$/i,
    /^unit$/i,
  ],
};

/**
 * Detect event type from column headers
 */
export function detectEventType(headers: string[]): EventType {
  const headerStr = headers.join(' ').toLowerCase();

  // Wedding indicators
  const weddingIndicators = [
    /bride/i,
    /groom/i,
    /wedding/i,
    /party/i,
    /guest[_\s-]?of/i,
    /side/i,
    /ceremony/i,
    /reception/i,
  ];

  const weddingScore = weddingIndicators.reduce(
    (score, pattern) => score + (pattern.test(headerStr) ? 1 : 0),
    0
  );

  // Corporate indicators
  const corporateIndicators = [
    /company/i,
    /department/i,
    /title/i,
    /role/i,
    /organization/i,
    /team/i,
    /division/i,
  ];

  const corporateScore = corporateIndicators.reduce(
    (score, pattern) => score + (pattern.test(headerStr) ? 1 : 0),
    0
  );

  // Gala indicators
  const galaIndicators = [/gala/i, /charity/i, /fundraiser/i, /benefit/i, /auction/i];

  const galaScore = galaIndicators.reduce(
    (score, pattern) => score + (pattern.test(headerStr) ? 1 : 0),
    0
  );

  // Determine event type based on highest score
  if (weddingScore > corporateScore && weddingScore > galaScore && weddingScore >= 1) {
    return 'wedding';
  }
  if (corporateScore > weddingScore && corporateScore > galaScore && corporateScore >= 2) {
    return 'corporate';
  }
  if (galaScore > weddingScore && galaScore > corporateScore && galaScore >= 1) {
    return 'gala';
  }

  return 'party'; // Default
}

/**
 * Auto-detect column mappings based on header names
 */
export function autoDetectMappings(
  headers: string[],
  sampleData: string[][],
  eventType: EventType
): ColumnMapping[] {
  // Merge patterns based on event type
  const patterns = { ...BASE_FIELD_PATTERNS };

  if (eventType === 'wedding') {
    Object.entries(WEDDING_PATTERNS).forEach(([field, fieldPatterns]) => {
      patterns[field as keyof FieldPatterns] = [
        ...fieldPatterns,
        ...patterns[field as keyof FieldPatterns],
      ];
    });
  } else if (eventType === 'corporate') {
    Object.entries(CORPORATE_PATTERNS).forEach(([field, fieldPatterns]) => {
      patterns[field as keyof FieldPatterns] = [
        ...fieldPatterns,
        ...patterns[field as keyof FieldPatterns],
      ];
    });
  }

  return headers.map((header, colIndex) => {
    const normalizedHeader = header.trim();
    const sampleValues = sampleData.slice(0, 3).map((row) => row[colIndex] || '');

    let bestMatch: { field: GuestField | 'fullName'; confidence: number } | null = null;

    // Try to match against all patterns
    for (const [field, fieldPatterns] of Object.entries(patterns)) {
      for (const pattern of fieldPatterns) {
        if (pattern.test(normalizedHeader)) {
          // Higher confidence for exact matches (patterns starting with ^)
          const confidence = pattern.source.startsWith('^') ? 0.95 : 0.7;
          if (!bestMatch || confidence > bestMatch.confidence) {
            bestMatch = { field: field as GuestField | 'fullName', confidence };
          }
        }
      }
    }

    // If no match but header contains "name" somewhere, suggest fullName with lower confidence
    if (!bestMatch && /name/i.test(normalizedHeader)) {
      bestMatch = { field: 'fullName', confidence: 0.5 };
    }

    return {
      sourceColumn: normalizedHeader,
      targetField: bestMatch?.field ?? null,
      confidence: bestMatch?.confidence ?? 0,
      sampleValues,
    };
  });
}

/**
 * Check if required fields are mapped
 */
export function hasRequiredMappings(mappings: ColumnMapping[]): boolean {
  const mappedFields = new Set(mappings.map((m) => m.targetField).filter(Boolean));

  // Need either firstName + lastName, or fullName
  const hasFirstName = mappedFields.has('firstName');
  const hasLastName = mappedFields.has('lastName');
  const hasFullName = mappedFields.has('fullName');

  return (hasFirstName && hasLastName) || hasFullName;
}

/**
 * Get missing required fields
 */
export function getMissingRequiredFields(mappings: ColumnMapping[]): string[] {
  const mappedFields = new Set(mappings.map((m) => m.targetField).filter(Boolean));

  const hasFirstName = mappedFields.has('firstName');
  const hasLastName = mappedFields.has('lastName');
  const hasFullName = mappedFields.has('fullName');

  if (hasFullName || (hasFirstName && hasLastName)) {
    return [];
  }

  const missing: string[] = [];
  if (!hasFirstName && !hasFullName) missing.push('First Name');
  if (!hasLastName && !hasFullName) missing.push('Last Name');

  return missing;
}

/**
 * Split a full name into first and last name
 */
export function splitFullName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/);

  if (parts.length === 0) {
    return { firstName: '', lastName: '' };
  }

  if (parts.length === 1) {
    return { firstName: parts[0], lastName: '' };
  }

  // First word is first name, rest is last name
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(' '),
  };
}
