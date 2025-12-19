import type { Event, Table, Guest } from '../types';

// Type for jsPDF instance (needed since we're dynamically importing)
type jsPDFInstance = InstanceType<typeof import('jspdf').jsPDF>;

// Cached module reference to avoid re-loading
let jsPDFModule: typeof import('jspdf') | null = null;

/**
 * Lazily load jsPDF module (cached after first load)
 */
async function loadJsPDF(): Promise<typeof import('jspdf')> {
  if (jsPDFModule) {
    return jsPDFModule;
  }
  jsPDFModule = await import('jspdf');
  return jsPDFModule;
}

// Card size type
export type CardSize = 'compact' | 'standard' | 'large';

// Card dimensions in mm (jsPDF uses mm by default)
interface CardDimensions {
  width: number;
  height: number;
  margin: number;
}

// Table card size presets
export const TABLE_CARD_SIZES: Record<CardSize, CardDimensions> = {
  compact: {
    width: 76.2,  // 3 inches
    height: 50.8, // 2 inches (folded)
    margin: 6,
  },
  standard: {
    width: 101.6, // 4 inches
    height: 76.2, // 3 inches (folded)
    margin: 10,
  },
  large: {
    width: 127,   // 5 inches
    height: 101.6, // 4 inches (folded)
    margin: 12,
  },
};

// Place card size presets
export const PLACE_CARD_SIZES: Record<CardSize, CardDimensions> = {
  compact: {
    width: 63.5,  // 2.5 inches
    height: 38.1, // 1.5 inches
    margin: 4,
  },
  standard: {
    width: 88.9,  // 3.5 inches
    height: 50.8, // 2 inches
    margin: 5,
  },
  large: {
    width: 101.6, // 4 inches
    height: 63.5, // 2.5 inches
    margin: 6,
  },
};

// Default colors (used when no theme is specified)
const COLORS = {
  primary: '#F97066',
  text: '#1a1a1a',
  textLight: '#666666',
  border: '#e5e5e5',
};

// Color theme presets
export type ColorTheme = 'classic' | 'elegant' | 'modern' | 'nature' | 'romantic';

export interface ThemeColors {
  primary: string;
  text: string;
  textLight: string;
  border: string;
}

export const THEME_PRESETS: Record<ColorTheme, ThemeColors> = {
  classic: {
    primary: '#F97066', // Coral (app default)
    text: '#1a1a1a',
    textLight: '#666666',
    border: '#e5e5e5',
  },
  elegant: {
    primary: '#B8860B', // Dark goldenrod
    text: '#2c2c2c',
    textLight: '#5a5a5a',
    border: '#d4d4d4',
  },
  modern: {
    primary: '#3B82F6', // Blue
    text: '#1f2937',
    textLight: '#6b7280',
    border: '#e5e7eb',
  },
  nature: {
    primary: '#059669', // Emerald green
    text: '#1a1a1a',
    textLight: '#4b5563',
    border: '#d1d5db',
  },
  romantic: {
    primary: '#EC4899', // Pink
    text: '#1f1f1f',
    textLight: '#6b6b6b',
    border: '#f3e8ec',
  },
};

/**
 * Get theme colors by name, with fallback to classic
 */
function getThemeColors(theme?: ColorTheme): ThemeColors {
  return theme ? THEME_PRESETS[theme] : COLORS;
}

/**
 * Generate PDF with table tent cards
 * Each card is designed to fold in half and stand up
 */
export async function generateTableCardsPDF(
  event: Event,
  tables: Table[],
  options: TableCardPDFOptions = {}
): Promise<jsPDFInstance> {
  const { fontSize = 'medium', fontFamily = 'helvetica', showGuestCount = true, showEventName = true, colorTheme, cardSize = 'standard' } = options;
  const fontSizes = TABLE_CARD_FONT_SIZES[fontSize];
  const themeColors = getThemeColors(colorTheme);
  const cardDimensions = TABLE_CARD_SIZES[cardSize];
  const { jsPDF } = await loadJsPDF();

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'letter',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Calculate cards per page based on card size
  const cardsPerRow = Math.floor(pageWidth / (cardDimensions.width + 5)) || 1;
  const cardsPerCol = Math.floor(pageHeight / (cardDimensions.height + 5)) || 1;
  const cardsPerPage = cardsPerRow * cardsPerCol;

  // Calculate spacing
  const totalCardWidth = cardDimensions.width * cardsPerRow + 5 * (cardsPerRow - 1);
  const totalCardHeight = cardDimensions.height * cardsPerCol + 5 * (cardsPerCol - 1);
  const xOffset = (pageWidth - totalCardWidth) / 2;
  const yOffset = (pageHeight - totalCardHeight) / 2;

  tables.forEach((table, index) => {
    // Add new page if needed (not for first card)
    if (index > 0 && index % cardsPerPage === 0) {
      doc.addPage();
    }

    const positionOnPage = index % cardsPerPage;
    const col = positionOnPage % cardsPerRow;
    const row = Math.floor(positionOnPage / cardsPerRow);

    const x = xOffset + col * (cardDimensions.width + 5);
    const y = yOffset + row * (cardDimensions.height + 5);

    drawTableCard(doc, table, event, x, y, { fontSizes, fontFamily, showGuestCount, showEventName, themeColors, cardDimensions });
  });

  return doc;
}

/**
 * Draw a single table card
 */
function drawTableCard(
  doc: jsPDFInstance,
  table: Table,
  event: Event,
  x: number,
  y: number,
  options: {
    fontSizes: typeof TABLE_CARD_FONT_SIZES['medium'];
    fontFamily: FontFamily;
    showGuestCount: boolean;
    showEventName: boolean;
    themeColors: ThemeColors;
    cardDimensions: { width: number; height: number; margin: number };
  }
): void {
  const { fontSizes, fontFamily, showGuestCount, showEventName, themeColors, cardDimensions } = options;
  const { width, height, margin } = cardDimensions;

  // Draw card border (dashed for cutting guide)
  doc.setDrawColor(themeColors.border);
  doc.setLineDashPattern([2, 2], 0);
  doc.rect(x, y, width, height);

  // Draw fold line (center horizontal)
  const foldY = y + height / 2;
  doc.setLineDashPattern([1, 1], 0);
  doc.line(x + margin, foldY, x + width - margin, foldY);
  doc.setLineDashPattern([], 0);

  // Get guest count for this table
  const guestCount = event.guests.filter(g => g.tableId === table.id).length;

  // === TOP HALF (visible when folded, upside down for printing) ===
  // This will be the back when folded, so we draw it upside down
  doc.saveGraphicsState();

  // Draw table name (large, centered) - TOP HALF
  doc.setFontSize(fontSizes.tableName);
  doc.setFont(fontFamily, 'bold');
  doc.setTextColor(themeColors.text);

  const topCenterY = y + height / 4;
  doc.text(table.name, x + width / 2, topCenterY, {
    align: 'center',
    baseline: 'middle'
  });

  // Draw capacity info below name - TOP HALF (conditional)
  if (showGuestCount) {
    doc.setFontSize(fontSizes.guestCount);
    doc.setFont(fontFamily, 'normal');
    doc.setTextColor(themeColors.textLight);
    doc.text(
      `${guestCount} / ${table.capacity} guests`,
      x + width / 2,
      topCenterY + 12,
      { align: 'center' }
    );
  }

  doc.restoreGraphicsState();

  // === BOTTOM HALF (front when folded) ===
  const bottomCenterY = y + height * 3 / 4;

  // Draw table name (large, centered)
  doc.setFontSize(fontSizes.tableName);
  doc.setFont(fontFamily, 'bold');
  doc.setTextColor(themeColors.text);
  doc.text(table.name, x + width / 2, bottomCenterY, {
    align: 'center',
    baseline: 'middle'
  });

  // Draw event name (small, at bottom) - conditional
  if (showEventName) {
    doc.setFontSize(fontSizes.eventName);
    doc.setFont(fontFamily, 'italic');
    doc.setTextColor(themeColors.textLight);
    doc.text(event.name, x + width / 2, y + height - margin, {
      align: 'center'
    });
  }
}

// Font size configurations for place cards
const PLACE_CARD_FONT_SIZES = {
  small: {
    guestName: 12,
    tableName: 9,
    dietary: 7,
    eventName: 6,
  },
  medium: {
    guestName: 16,
    tableName: 11,
    dietary: 8,
    eventName: 7,
  },
  large: {
    guestName: 20,
    tableName: 13,
    dietary: 9,
    eventName: 8,
  },
};

// Font size configurations for table cards
const TABLE_CARD_FONT_SIZES = {
  small: {
    tableName: 22,
    guestCount: 10,
    eventName: 7,
  },
  medium: {
    tableName: 28,
    guestCount: 12,
    eventName: 9,
  },
  large: {
    tableName: 34,
    guestCount: 14,
    eventName: 11,
  },
};

export type FontSize = 'small' | 'medium' | 'large';
export type FontFamily = 'helvetica' | 'times' | 'courier';

export interface TableCardPDFOptions {
  fontSize?: FontSize;
  fontFamily?: FontFamily;
  showGuestCount?: boolean;
  showEventName?: boolean;
  colorTheme?: ColorTheme;
  cardSize?: CardSize;
}

export interface PlaceCardPDFOptions {
  includeTableName?: boolean;
  includeDietary?: boolean;
  fontSize?: FontSize;
  fontFamily?: FontFamily;
  colorTheme?: ColorTheme;
  cardSize?: CardSize;
}

/**
 * Generate PDF with place cards for guests
 */
export async function generatePlaceCardsPDF(
  event: Event,
  guests: Guest[],
  options: PlaceCardPDFOptions = {}
): Promise<jsPDFInstance> {
  const { includeTableName = true, includeDietary = true, fontSize = 'medium', fontFamily = 'helvetica', colorTheme, cardSize = 'standard' } = options;

  const fontSizes = PLACE_CARD_FONT_SIZES[fontSize];
  const themeColors = getThemeColors(colorTheme);
  const cardDimensions = PLACE_CARD_SIZES[cardSize];
  const { jsPDF } = await loadJsPDF();

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'letter',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Calculate cards per page based on card size
  const gapX = 5;
  const gapY = 5;
  const cardsPerRow = Math.floor((pageWidth + gapX) / (cardDimensions.width + gapX)) || 1;
  const cardsPerCol = Math.floor((pageHeight + gapY) / (cardDimensions.height + gapY)) || 1;
  const cardsPerPage = cardsPerRow * cardsPerCol;

  // Calculate spacing
  const totalCardWidth = cardDimensions.width * cardsPerRow + gapX * (cardsPerRow - 1);
  const totalCardHeight = cardDimensions.height * cardsPerCol + gapY * (cardsPerCol - 1);
  const xOffset = (pageWidth - totalCardWidth) / 2;
  const yOffset = (pageHeight - totalCardHeight) / 2;

  // Sort guests by table, then by name
  const sortedGuests = [...guests].sort((a, b) => {
    const tableA = event.tables.find(t => t.id === a.tableId)?.name || '';
    const tableB = event.tables.find(t => t.id === b.tableId)?.name || '';
    if (tableA !== tableB) return tableA.localeCompare(tableB);
    return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
  });

  sortedGuests.forEach((guest, index) => {
    // Add new page if needed (not for first card)
    if (index > 0 && index % cardsPerPage === 0) {
      doc.addPage();
    }

    const positionOnPage = index % cardsPerPage;
    const col = positionOnPage % cardsPerRow;
    const row = Math.floor(positionOnPage / cardsPerRow);

    const x = xOffset + col * (cardDimensions.width + gapX);
    const y = yOffset + row * (cardDimensions.height + gapY);

    const table = event.tables.find(t => t.id === guest.tableId);
    drawPlaceCard(doc, guest, table, event, x, y, { includeTableName, includeDietary, fontSizes, fontFamily, themeColors, cardDimensions });
  });

  return doc;
}

/**
 * Draw a single place card
 */
function drawPlaceCard(
  doc: jsPDFInstance,
  guest: Guest,
  table: Table | undefined,
  event: Event,
  x: number,
  y: number,
  options: { includeTableName: boolean; includeDietary: boolean; fontSizes: typeof PLACE_CARD_FONT_SIZES['medium']; fontFamily: FontFamily; themeColors: ThemeColors; cardDimensions: { width: number; height: number; margin: number } }
): void {
  const { fontSizes, fontFamily, themeColors, cardDimensions } = options;
  const { width, height, margin } = cardDimensions;

  // Draw card border
  doc.setDrawColor(themeColors.border);
  doc.setLineDashPattern([2, 2], 0);
  doc.rect(x, y, width, height);
  doc.setLineDashPattern([], 0);

  // Draw decorative line at top
  doc.setDrawColor(themeColors.primary);
  doc.setLineWidth(1);
  doc.line(x + margin, y + margin, x + width - margin, y + margin);
  doc.setLineWidth(0.2);

  // Guest name (large, centered)
  const guestName = `${guest.firstName} ${guest.lastName}`.trim();
  doc.setFontSize(fontSizes.guestName);
  doc.setFont(fontFamily, 'bold');
  doc.setTextColor(themeColors.text);

  const nameY = y + height / 2 - (options.includeTableName ? 4 : 0);
  doc.text(guestName, x + width / 2, nameY, {
    align: 'center',
    baseline: 'middle'
  });

  // Table name (if assigned and option enabled)
  if (options.includeTableName && table) {
    doc.setFontSize(fontSizes.tableName);
    doc.setFont(fontFamily, 'normal');
    doc.setTextColor(themeColors.textLight);
    doc.text(table.name, x + width / 2, nameY + 8, { align: 'center' });
  }

  // Dietary/accessibility icons (bottom right)
  if (options.includeDietary) {
    const indicators: string[] = [];

    if (guest.dietaryRestrictions?.length) {
      // Add dietary indicator
      indicators.push(...guest.dietaryRestrictions.map(d => getDietarySymbol(d)));
    }

    if (guest.accessibilityNeeds?.length) {
      indicators.push('\u267F'); // Wheelchair symbol
    }

    if (indicators.length > 0) {
      doc.setFontSize(fontSizes.dietary);
      doc.setTextColor(themeColors.textLight);
      doc.text(
        indicators.join(' '),
        x + width - margin,
        y + height - margin,
        { align: 'right' }
      );
    }
  }

  // Event name (small, bottom left)
  doc.setFontSize(fontSizes.eventName);
  doc.setFont(fontFamily, 'italic');
  doc.setTextColor(themeColors.textLight);
  doc.text(event.name, x + margin, y + height - margin);
}

/**
 * Get symbol for dietary restriction
 */
function getDietarySymbol(restriction: string): string {
  const symbols: Record<string, string> = {
    vegetarian: '\u{1F331}', // Seedling
    vegan: '\u{1F33F}', // Herb
    'gluten-free': 'GF',
    'dairy-free': 'DF',
    'nut-free': 'NF',
    halal: '\u{262A}', // Star and crescent
    kosher: '\u{2721}', // Star of David
    pescatarian: '\u{1F41F}', // Fish
  };
  return symbols[restriction.toLowerCase()] || restriction.charAt(0).toUpperCase();
}

/**
 * Download PDF with given filename
 */
export function downloadPDF(doc: jsPDFInstance, filename: string): void {
  doc.save(`${filename}.pdf`);
}

/**
 * Get PDF as blob for preview
 */
export function getPDFBlob(doc: jsPDFInstance): Blob {
  return doc.output('blob');
}

/**
 * Get PDF as data URL for preview in iframe
 */
export function getPDFDataUrl(doc: jsPDFInstance): string {
  return doc.output('dataurlstring');
}

/**
 * Generate table cards PDF and return as blob URL for preview
 */
export async function previewTableCards(
  event: Event,
  options?: TableCardPDFOptions
): Promise<string | null> {
  if (event.tables.length === 0) return null;

  const doc = await generateTableCardsPDF(event, event.tables, options);
  const blob = getPDFBlob(doc);
  return URL.createObjectURL(blob);
}

/**
 * Generate place cards PDF and return as blob URL for preview
 */
export async function previewPlaceCards(
  event: Event,
  options?: PlaceCardPDFOptions
): Promise<string | null> {
  // Only include confirmed guests with table assignments
  const guests = event.guests.filter(
    g => g.tableId && g.rsvpStatus === 'confirmed'
  );

  if (guests.length === 0) return null;

  const doc = await generatePlaceCardsPDF(event, guests, options);
  const blob = getPDFBlob(doc);
  return URL.createObjectURL(blob);
}

/**
 * Generate and download table cards PDF
 */
export async function downloadTableCards(
  event: Event,
  options?: TableCardPDFOptions
): Promise<void> {
  if (event.tables.length === 0) return;

  const doc = await generateTableCardsPDF(event, event.tables, options);
  const filename = `${event.name.replace(/\s+/g, '-').toLowerCase()}-table-cards`;
  downloadPDF(doc, filename);
}

/**
 * Generate and download place cards PDF
 */
export async function downloadPlaceCards(
  event: Event,
  options?: PlaceCardPDFOptions
): Promise<void> {
  // Only include confirmed guests with table assignments
  const guests = event.guests.filter(
    g => g.tableId && g.rsvpStatus === 'confirmed'
  );

  if (guests.length === 0) return;

  const doc = await generatePlaceCardsPDF(event, guests, options);
  const filename = `${event.name.replace(/\s+/g, '-').toLowerCase()}-place-cards`;
  downloadPDF(doc, filename);
}
