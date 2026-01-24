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
 * Draw watermark on PDF page
 * Adds "Made with Seatify" text at the bottom of each page
 */
function drawWatermark(
  doc: jsPDFInstance,
  pageWidth: number,
  pageHeight: number
): void {
  const watermarkText = 'Made with Seatify';
  const watermarkUrl = 'seatify.app';

  // Save current state
  doc.saveGraphicsState();

  // Semi-transparent light gray
  doc.setTextColor(180, 180, 180);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');

  // Position at bottom center of page
  const y = pageHeight - 5;
  doc.text(`${watermarkText} • ${watermarkUrl}`, pageWidth / 2, y, {
    align: 'center',
  });

  doc.restoreGraphicsState();
}

/**
 * Draw custom logo on PDF page
 * Adds the custom logo at the bottom right corner of each page
 */
async function drawCustomLogo(
  doc: jsPDFInstance,
  pageWidth: number,
  pageHeight: number,
  logoUrl: string
): Promise<void> {
  try {
    // Logo dimensions (max 15mm height, maintain aspect ratio)
    const maxHeight = 12;
    const maxWidth = 40;
    const margin = 5;

    // Add the image
    // jsPDF addImage can handle base64 data URLs directly
    doc.addImage(
      logoUrl,
      'AUTO', // Auto-detect format
      pageWidth - maxWidth - margin, // x position (right aligned)
      pageHeight - maxHeight - margin, // y position (bottom)
      maxWidth,
      maxHeight,
      undefined, // alias
      'FAST' // compression
    );
  } catch (error) {
    console.error('Failed to add custom logo to PDF:', error);
    // If logo fails, just skip it
  }
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
  const { fontSize = 'medium', fontFamily = 'helvetica', showGuestCount = true, showEventName = true, colorTheme, cardSize = 'standard', showWatermark = false, customLogoUrl } = options;
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

  // Add custom logo or watermark to all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    if (customLogoUrl) {
      // Pro users get custom logo
      await drawCustomLogo(doc, pageWidth, pageHeight, customLogoUrl);
    } else if (showWatermark) {
      // Free users get watermark
      drawWatermark(doc, pageWidth, pageHeight);
    }
  }

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

  // Draw decorative accent lines using theme color
  doc.setDrawColor(themeColors.primary);
  doc.setLineWidth(1.5);
  // Top half accent line (at the top of the card)
  doc.line(x + margin, y + margin, x + width - margin, y + margin);
  // Bottom half accent line (just below the fold, at top of bottom half)
  doc.line(x + margin, foldY + margin, x + width - margin, foldY + margin);
  doc.setLineWidth(0.2);

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
  showWatermark?: boolean; // If true, adds "Made with Seatify" watermark
  customLogoUrl?: string | null; // Base64 data URL for custom logo (Pro feature)
}

export interface PlaceCardPDFOptions {
  includeTableName?: boolean;
  includeDietary?: boolean;
  fontSize?: FontSize;
  fontFamily?: FontFamily;
  colorTheme?: ColorTheme;
  cardSize?: CardSize;
  showWatermark?: boolean; // If true, adds "Made with Seatify" watermark
  customLogoUrl?: string | null; // Base64 data URL for custom logo (Pro feature)
}

/**
 * Generate PDF with place cards for guests
 */
export async function generatePlaceCardsPDF(
  event: Event,
  guests: Guest[],
  options: PlaceCardPDFOptions = {}
): Promise<jsPDFInstance> {
  const { includeTableName = true, includeDietary = true, fontSize = 'medium', fontFamily = 'helvetica', colorTheme, cardSize = 'standard', showWatermark = false, customLogoUrl } = options;

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

  // Add custom logo or watermark to all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    if (customLogoUrl) {
      // Pro users get custom logo
      await drawCustomLogo(doc, pageWidth, pageHeight, customLogoUrl);
    } else if (showWatermark) {
      // Free users get watermark
      drawWatermark(doc, pageWidth, pageHeight);
    }
  }

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

export interface BulkPDFOptions {
  tableCardOptions?: TableCardPDFOptions;
  placeCardOptions?: PlaceCardPDFOptions;
  customLogoUrl?: string | null;
}

export interface SeatingChartPDFOptions {
  showGuestCount?: boolean;
  showEventInfo?: boolean;
  showUnassignedGuests?: boolean;
  colorTheme?: ColorTheme;
  showWatermark?: boolean;
  customLogoUrl?: string | null;
}

export interface BulkPDFResult {
  tableCardsDownloaded: boolean;
  placeCardsDownloaded: boolean;
  tableCount: number;
  guestCount: number;
}

/**
 * Generate and download all PDFs at once (table cards + place cards)
 * Downloads both files sequentially with a small delay to avoid browser blocking
 */
export async function downloadAllPDFs(
  event: Event,
  options?: BulkPDFOptions
): Promise<BulkPDFResult> {
  const result: BulkPDFResult = {
    tableCardsDownloaded: false,
    placeCardsDownloaded: false,
    tableCount: 0,
    guestCount: 0,
  };

  // Download table cards if tables exist
  if (event.tables.length > 0) {
    const tableCardOpts = {
      ...options?.tableCardOptions,
      customLogoUrl: options?.customLogoUrl,
    };
    const tableDoc = await generateTableCardsPDF(event, event.tables, tableCardOpts);
    const tableFilename = `${event.name.replace(/\s+/g, '-').toLowerCase()}-table-cards`;
    downloadPDF(tableDoc, tableFilename);
    result.tableCardsDownloaded = true;
    result.tableCount = event.tables.length;
  }

  // Small delay to ensure browser handles multiple downloads
  await new Promise(resolve => setTimeout(resolve, 500));

  // Download place cards if there are confirmed seated guests
  const seatedConfirmedGuests = event.guests.filter(
    g => g.tableId && g.rsvpStatus === 'confirmed'
  );

  if (seatedConfirmedGuests.length > 0) {
    const placeCardOpts = {
      ...options?.placeCardOptions,
      customLogoUrl: options?.customLogoUrl,
    };
    const placeDoc = await generatePlaceCardsPDF(event, seatedConfirmedGuests, placeCardOpts);
    const placeFilename = `${event.name.replace(/\s+/g, '-').toLowerCase()}-place-cards`;
    downloadPDF(placeDoc, placeFilename);
    result.placeCardsDownloaded = true;
    result.guestCount = seatedConfirmedGuests.length;
  }

  return result;
}

/**
 * Generate a full seating chart overview PDF
 * Shows all tables with their assigned guests in a printable format
 */
export async function generateSeatingChartPDF(
  event: Event,
  options: SeatingChartPDFOptions = {}
): Promise<jsPDFInstance> {
  const { showGuestCount = true, showEventInfo = true, showUnassignedGuests = true, colorTheme, showWatermark = false, customLogoUrl } = options;
  const themeColors = getThemeColors(colorTheme);
  const { jsPDF } = await loadJsPDF();

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'letter',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - (margin * 2);

  let currentY = margin;

  // Helper to add a new page if needed
  const checkPageBreak = (neededHeight: number) => {
    if (currentY + neededHeight > pageHeight - margin) {
      doc.addPage();
      currentY = margin;
      return true;
    }
    return false;
  };

  // === Header Section ===
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(themeColors.text);
  doc.text(event.name, pageWidth / 2, currentY + 8, { align: 'center' });
  currentY += 15;

  // Event subtitle
  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(themeColors.textLight);
  doc.text('Seating Chart', pageWidth / 2, currentY, { align: 'center' });
  currentY += 10;

  // Decorative line
  doc.setDrawColor(themeColors.primary);
  doc.setLineWidth(1);
  doc.line(margin + 30, currentY, pageWidth - margin - 30, currentY);
  currentY += 10;

  // === Event Stats Section ===
  if (showEventInfo) {
    doc.setFontSize(10);
    doc.setTextColor(themeColors.textLight);

    const totalGuests = event.guests.length;
    const confirmedGuests = event.guests.filter(g => g.rsvpStatus === 'confirmed').length;
    const assignedGuests = event.guests.filter(g => g.tableId).length;
    const totalCapacity = event.tables.reduce((sum, t) => sum + t.capacity, 0);

    const statsText = `${event.tables.length} Tables • ${totalGuests} Guests (${confirmedGuests} Confirmed) • ${assignedGuests} Seated • ${totalCapacity} Total Capacity`;
    doc.text(statsText, pageWidth / 2, currentY, { align: 'center' });
    currentY += 12;
  }

  // === Tables Section ===
  // Sort tables by name
  const sortedTables = [...event.tables].sort((a, b) => a.name.localeCompare(b.name));

  for (const table of sortedTables) {
    const tableGuests = event.guests
      .filter(g => g.tableId === table.id)
      .sort((a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`));

    // Calculate height needed for this table
    const headerHeight = 10;
    const guestRowHeight = 6;
    const tableHeight = headerHeight + (Math.max(tableGuests.length, 1) * guestRowHeight) + 8;

    checkPageBreak(tableHeight);

    // Table header background
    doc.setFillColor(themeColors.primary);
    doc.roundedRect(margin, currentY, contentWidth, 8, 1, 1, 'F');

    // Table name
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text(table.name, margin + 4, currentY + 5.5);

    // Guest count on right
    if (showGuestCount) {
      const countText = `${tableGuests.length} / ${table.capacity}`;
      doc.setFontSize(10);
      doc.text(countText, pageWidth - margin - 4, currentY + 5.5, { align: 'right' });
    }

    currentY += 10;

    // Guest list
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(themeColors.text);
    doc.setFontSize(10);

    if (tableGuests.length === 0) {
      doc.setTextColor(themeColors.textLight);
      doc.setFont('helvetica', 'italic');
      doc.text('No guests assigned', margin + 8, currentY + 4);
      currentY += guestRowHeight;
    } else {
      // Two-column layout for guests
      const colWidth = contentWidth / 2;
      const halfCount = Math.ceil(tableGuests.length / 2);

      for (let i = 0; i < halfCount; i++) {
        const guest1 = tableGuests[i];
        const guest2 = tableGuests[i + halfCount];

        // First column
        const name1 = `${guest1.firstName} ${guest1.lastName}`;
        const dietary1 = guest1.dietaryRestrictions?.length ? ' *' : '';
        doc.text(`• ${name1}${dietary1}`, margin + 4, currentY + 4);

        // Second column
        if (guest2) {
          const name2 = `${guest2.firstName} ${guest2.lastName}`;
          const dietary2 = guest2.dietaryRestrictions?.length ? ' *' : '';
          doc.text(`• ${name2}${dietary2}`, margin + colWidth + 4, currentY + 4);
        }

        currentY += guestRowHeight;
      }
    }

    currentY += 6; // Space between tables
  }

  // === Unassigned Guests Section ===
  if (showUnassignedGuests) {
    const unassignedGuests = event.guests
      .filter(g => !g.tableId)
      .sort((a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`));

    if (unassignedGuests.length > 0) {
      checkPageBreak(30);

      currentY += 5;

      // Section header
      doc.setFillColor(180, 180, 180);
      doc.roundedRect(margin, currentY, contentWidth, 8, 1, 1, 'F');
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text('Unassigned Guests', margin + 4, currentY + 5.5);
      doc.text(String(unassignedGuests.length), pageWidth - margin - 4, currentY + 5.5, { align: 'right' });
      currentY += 10;

      // Guest list in two columns
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(themeColors.text);
      doc.setFontSize(10);

      const colWidth = contentWidth / 2;
      const halfCount = Math.ceil(unassignedGuests.length / 2);

      for (let i = 0; i < halfCount; i++) {
        checkPageBreak(6);

        const guest1 = unassignedGuests[i];
        const guest2 = unassignedGuests[i + halfCount];

        // First column
        const name1 = `${guest1.firstName} ${guest1.lastName}`;
        const status1 = guest1.rsvpStatus !== 'confirmed' ? ` (${guest1.rsvpStatus})` : '';
        doc.text(`• ${name1}${status1}`, margin + 4, currentY + 4);

        // Second column
        if (guest2) {
          const name2 = `${guest2.firstName} ${guest2.lastName}`;
          const status2 = guest2.rsvpStatus !== 'confirmed' ? ` (${guest2.rsvpStatus})` : '';
          doc.text(`• ${name2}${status2}`, margin + colWidth + 4, currentY + 4);
        }

        currentY += 6;
      }
    }
  }

  // === Footer note ===
  currentY += 10;
  if (event.guests.some(g => g.dietaryRestrictions?.length)) {
    checkPageBreak(10);
    doc.setFontSize(8);
    doc.setTextColor(themeColors.textLight);
    doc.text('* indicates dietary restrictions', margin, currentY);
  }

  // Add custom logo or watermark to all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    if (customLogoUrl) {
      await drawCustomLogo(doc, pageWidth, pageHeight, customLogoUrl);
    } else if (showWatermark) {
      drawWatermark(doc, pageWidth, pageHeight);
    }
  }

  return doc;
}

/**
 * Preview seating chart PDF
 */
export async function previewSeatingChart(
  event: Event,
  options?: SeatingChartPDFOptions
): Promise<string | null> {
  if (event.tables.length === 0) return null;

  const doc = await generateSeatingChartPDF(event, options);
  const blob = getPDFBlob(doc);
  return URL.createObjectURL(blob);
}

/**
 * Download seating chart PDF
 */
export async function downloadSeatingChart(
  event: Event,
  options?: SeatingChartPDFOptions
): Promise<void> {
  if (event.tables.length === 0) return;

  const doc = await generateSeatingChartPDF(event, options);
  const filename = `${event.name.replace(/\s+/g, '-').toLowerCase()}-seating-chart`;
  downloadPDF(doc, filename);
}
