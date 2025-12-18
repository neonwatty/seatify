import type { EventType } from '../../../types';
import type { ColumnMapping, GuestField } from '../types';

// Pattern matching for field detection
type FieldPatterns = Record<GuestField | 'fullName', RegExp[]>;

/**
 * Detected source platform for imported CSV files.
 * Some platforms have known column formats that enable better auto-detection.
 */
export type SourcePlatform =
  | 'rsvpify'      // Verified: official documentation
  | 'zola'         // Verified: official FAQ
  // Coming soon - need further verification:
  // | 'joy'       // Partially verified: help center
  // | 'theknot'   // Unverified: based on user reports
  // | 'eventbrite'// Generic: uses customizable exports
  | 'generic';     // Unknown source

/**
 * Information about detected source platform
 */
export interface SourcePlatformInfo {
  platform: SourcePlatform;
  confidence: 'high' | 'medium' | 'low';
  /** User-facing note about potential mapping adjustments */
  note?: string;
}

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

// =============================================================================
// Platform-Specific Patterns
// These patterns are based on known CSV export formats from popular platforms.
// =============================================================================

/**
 * RSVPify patterns (VERIFIED from official help center)
 * Source: https://help.rsvpify.com/en/articles/4335965
 */
const RSVPIFY_PATTERNS: Partial<FieldPatterns> = {
  firstName: [/^first[_\s-]?name$/i],
  lastName: [/^last[_\s-]?name$/i],
  email: [/^email[_\s-]?address$/i],
  group: [
    /^group[_\s-]?id$/i,           // RSVPify uses "Group ID" for party grouping
    /^tags$/i,                      // RSVPify also supports Tags for categorization
  ],
  notes: [
    /^title$/i,                     // RSVPify "Title" field (Mr., Mrs., etc.)
  ],
  // Note: "Additional Guest(s) Allowed (+1's)" is RSVPify-specific but not mapped to our fields
};

/**
 * Zola patterns (VERIFIED from official FAQ)
 * Source: https://www.zola.com/faq/360038289992
 * Note: Zola uses single "Name" column (full name), not separate first/last
 */
const ZOLA_PATTERNS: Partial<FieldPatterns> = {
  fullName: [
    /^name$/i,                      // Zola uses single "Name" column
  ],
  email: [
    /^email[_\s-]?address$/i,
  ],
  // Note: Zola splits address into: Street Address, City, State, Zip Code
  // "Plus One" column accepts Yes/Y/name or No/N - not directly mappable
};

// =============================================================================
// COMING SOON - Platforms pending further verification
// =============================================================================

/**
 * Joy (WithJoy) patterns - COMING SOON
 * Status: Partially verified from help center
 * Source: https://withjoy.com/help/articles/8309207
 * Note: Joy has additional columns in their Google Sheets template that need verification
 */
// const JOY_PATTERNS: Partial<FieldPatterns> = {
//   firstName: [/^first[_\s-]?name$/i],
//   lastName: [/^last[_\s-]?name$/i],
//   group: [
//     /^party$/i,                     // Joy uses "Party" for grouping guests
//     /^tags$/i,                      // Joy "Tags" use pipe separator (|)
//   ],
//   notes: [
//     /^name[_\s-]?on[_\s-]?envelope$/i,  // Joy-specific envelope addressing
//   ],
// };

/**
 * The Knot patterns - COMING SOON
 * Status: Unverified - based on user reports
 * Note: The Knot's official documentation is not publicly accessible.
 * These patterns are based on community reports and need testing with real exports.
 */
// const THEKNOT_PATTERNS: Partial<FieldPatterns> = {
//   fullName: [
//     /^name[_\s-]?line[_\s-]?1$/i,   // The Knot "Name Line 1" (primary guest)
//   ],
//   notes: [
//     /^name[_\s-]?line[_\s-]?2$/i,   // The Knot "Name Line 2" (secondary, e.g., couples)
//   ],
//   rsvpStatus: [
//     /^rsvp[_\s-]?status$/i,
//   ],
//   dietaryRestrictions: [
//     /^meal[_\s-]?choice$/i,         // The Knot meal selection
//   ],
// };

/**
 * Eventbrite patterns - COMING SOON
 * Status: Generic - exports are customizable
 * Note: Eventbrite allows users to select which columns to export, so there's
 * no single standard format. Need to identify common default columns.
 */
// const EVENTBRITE_PATTERNS: Partial<FieldPatterns> = {
//   rsvpStatus: [
//     /^attendee[_\s-]?status$/i,
//     /^order[_\s-]?status$/i,
//   ],
//   group: [
//     /^ticket[_\s-]?type$/i,         // Can be used to group by ticket type
//   ],
// };

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
 * Detect the source platform based on column headers.
 * This helps apply platform-specific patterns for better auto-detection.
 */
export function detectSourcePlatform(headers: string[]): SourcePlatformInfo {
  const headerSet = new Set(headers.map((h) => h.toLowerCase().trim()));
  const headerArray = [...headerSet];

  // RSVPify detection (high confidence - verified patterns)
  // Distinctive: "Group ID" column
  if (headerSet.has('group id')) {
    return {
      platform: 'rsvpify',
      confidence: 'high',
    };
  }

  // Zola detection (high confidence - verified patterns)
  // Distinctive: Single "Name" column + "Plus One" column
  // Also check for "Additional Guest" columns (Zola uses "Additional Guest 1", etc.)
  const hasZolaAdditionalGuest = headerArray.some((h) => /^additional\s*guest\s*\d+$/i.test(h));
  if (
    headerSet.has('name') &&
    !headerSet.has('first name') &&
    !headerSet.has('last name') &&
    (headerSet.has('plus one') || hasZolaAdditionalGuest)
  ) {
    return {
      platform: 'zola',
      confidence: 'high',
    };
  }

  // =========================================================================
  // COMING SOON - Detection for platforms pending verification
  // =========================================================================

  // The Knot detection - COMING SOON
  // Distinctive: "Name Line 1" column
  // if (headerArray.some((h) => /^name\s*line\s*1$/i.test(h))) {
  //   return {
  //     platform: 'theknot',
  //     confidence: 'medium',
  //     note: 'The Knot format detected. Column mappings may need manual adjustment.',
  //   };
  // }

  // Joy detection - COMING SOON
  // Distinctive: Has "Party" + "Tags" together, or "Name on Envelope"
  // if (
  //   (headerSet.has('party') && headerSet.has('tags')) ||
  //   headerArray.some((h) => /^name\s*on\s*envelope$/i.test(h))
  // ) {
  //   return {
  //     platform: 'joy',
  //     confidence: 'medium',
  //     note: 'Joy format detected. Some columns may need manual mapping.',
  //   };
  // }

  // Eventbrite detection - COMING SOON
  // Distinctive: "Order #" or "Ticket Type" + "Attendee Status"
  // if (
  //   headerSet.has('order #') ||
  //   (headerSet.has('ticket type') && headerArray.some((h) => /attendee\s*status/i.test(h)))
  // ) {
  //   return {
  //     platform: 'eventbrite',
  //     confidence: 'low',
  //     note: 'Eventbrite format detected. Eventbrite exports are customizable, so mappings may vary.',
  //   };
  // }

  // Generic / unknown source
  return {
    platform: 'generic',
    confidence: 'low',
  };
}

/**
 * Get platform-specific patterns to merge with base patterns
 */
function getPlatformPatterns(platform: SourcePlatform): Partial<FieldPatterns> {
  switch (platform) {
    case 'rsvpify':
      return RSVPIFY_PATTERNS;
    case 'zola':
      return ZOLA_PATTERNS;
    // Coming soon:
    // case 'joy':
    //   return JOY_PATTERNS;
    // case 'theknot':
    //   return THEKNOT_PATTERNS;
    // case 'eventbrite':
    //   return EVENTBRITE_PATTERNS;
    default:
      return {};
  }
}

/**
 * User-friendly platform display names
 */
export const PLATFORM_DISPLAY_NAMES: Record<SourcePlatform, string> = {
  rsvpify: 'RSVPify',
  zola: 'Zola',
  // Coming soon:
  // joy: 'Joy',
  // theknot: 'The Knot',
  // eventbrite: 'Eventbrite',
  generic: 'Unknown',
};

/**
 * Auto-detect column mappings based on header names.
 * Optionally accepts a source platform to apply platform-specific patterns.
 */
export function autoDetectMappings(
  headers: string[],
  sampleData: string[][],
  eventType: EventType,
  sourcePlatform?: SourcePlatform
): ColumnMapping[] {
  // Start with base patterns
  const patterns = { ...BASE_FIELD_PATTERNS };

  // Helper to merge patterns (new patterns get priority)
  const mergePatterns = (additionalPatterns: Partial<FieldPatterns>) => {
    Object.entries(additionalPatterns).forEach(([field, fieldPatterns]) => {
      if (fieldPatterns) {
        patterns[field as keyof FieldPatterns] = [
          ...fieldPatterns,
          ...patterns[field as keyof FieldPatterns],
        ];
      }
    });
  };

  // 1. Apply platform-specific patterns first (highest priority)
  if (sourcePlatform && sourcePlatform !== 'generic') {
    mergePatterns(getPlatformPatterns(sourcePlatform));
  }

  // 2. Apply event-type-specific patterns
  if (eventType === 'wedding') {
    mergePatterns(WEDDING_PATTERNS);
  } else if (eventType === 'corporate') {
    mergePatterns(CORPORATE_PATTERNS);
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
          let confidence = pattern.source.startsWith('^') ? 0.95 : 0.7;

          // Boost confidence slightly for platform-specific matches
          if (sourcePlatform && sourcePlatform !== 'generic') {
            const platformPatterns = getPlatformPatterns(sourcePlatform);
            const platformFieldPatterns = platformPatterns[field as keyof FieldPatterns];
            if (platformFieldPatterns?.some((p) => p.source === pattern.source)) {
              confidence = Math.min(confidence + 0.03, 0.98);
            }
          }

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
