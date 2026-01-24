/**
 * Google Sheets API utilities
 */

export interface Spreadsheet {
  id: string;
  name: string;
  sheets: Sheet[];
}

export interface Sheet {
  id: number;
  title: string;
}

export interface SheetRow {
  [key: string]: string;
}

export interface SheetData {
  headers: string[];
  rows: SheetRow[];
  totalRows: number;
}

/**
 * List user's spreadsheets from Google Drive
 */
export async function listSpreadsheets(accessToken: string): Promise<Spreadsheet[]> {
  const response = await fetch(
    'https://www.googleapis.com/drive/v3/files?' +
    new URLSearchParams({
      q: "mimeType='application/vnd.google-apps.spreadsheet' and trashed=false",
      fields: 'files(id,name)',
      orderBy: 'modifiedTime desc',
      pageSize: '50',
    }),
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('TOKEN_EXPIRED');
    }
    throw new Error('Failed to list spreadsheets');
  }

  const data = await response.json();

  return data.files.map((file: { id: string; name: string }) => ({
    id: file.id,
    name: file.name,
    sheets: [], // Will be populated when spreadsheet is selected
  }));
}

/**
 * Get sheets (tabs) for a specific spreadsheet
 */
export async function getSpreadsheetSheets(
  accessToken: string,
  spreadsheetId: string
): Promise<Sheet[]> {
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('TOKEN_EXPIRED');
    }
    throw new Error('Failed to get spreadsheet sheets');
  }

  const data = await response.json();

  return data.sheets.map((sheet: { properties: { sheetId: number; title: string } }) => ({
    id: sheet.properties.sheetId,
    title: sheet.properties.title,
  }));
}

/**
 * Read data from a specific sheet
 */
export async function readSheetData(
  accessToken: string,
  spreadsheetId: string,
  sheetTitle: string,
  maxRows: number = 1000
): Promise<SheetData> {
  const range = `'${sheetTitle}'!A1:Z${maxRows + 1}`; // Include header row

  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('TOKEN_EXPIRED');
    }
    throw new Error('Failed to read sheet data');
  }

  const data = await response.json();
  const values: string[][] = data.values || [];

  if (values.length === 0) {
    return { headers: [], rows: [], totalRows: 0 };
  }

  // First row is headers
  const headers = values[0].map((h: string) => h?.toString().trim() || '');

  // Rest are data rows
  const rows: SheetRow[] = values.slice(1).map((row: string[]) => {
    const rowObj: SheetRow = {};
    headers.forEach((header: string, index: number) => {
      if (header) {
        rowObj[header] = row[index]?.toString() || '';
      }
    });
    return rowObj;
  });

  return {
    headers,
    rows,
    totalRows: rows.length,
  };
}

/**
 * Preview sheet data (first 10 rows)
 */
export async function previewSheetData(
  accessToken: string,
  spreadsheetId: string,
  sheetTitle: string
): Promise<SheetData> {
  return readSheetData(accessToken, spreadsheetId, sheetTitle, 10);
}

/**
 * Common column name mappings for auto-detection
 */
export const COLUMN_MAPPINGS: Record<string, string[]> = {
  firstName: ['first name', 'firstname', 'first', 'given name', 'name'],
  lastName: ['last name', 'lastname', 'last', 'surname', 'family name'],
  email: ['email', 'email address', 'e-mail', 'mail'],
  company: ['company', 'organization', 'org', 'employer', 'workplace'],
  jobTitle: ['title', 'job title', 'position', 'role', 'job'],
  group: ['group', 'category', 'team', 'department', 'type'],
  notes: ['notes', 'comments', 'memo', 'remarks'],
};

/**
 * Auto-detect column mappings based on header names
 */
export function autoDetectColumnMappings(headers: string[]): Record<string, string> {
  const mappings: Record<string, string> = {};

  headers.forEach((header) => {
    const normalized = header.toLowerCase().trim();

    for (const [field, aliases] of Object.entries(COLUMN_MAPPINGS)) {
      if (aliases.some((alias) => normalized.includes(alias))) {
        if (!mappings[field]) {
          mappings[field] = header;
        }
        break;
      }
    }
  });

  return mappings;
}
