import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import type { ParsedFile } from '../types';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_ROW_COUNT = 10000;

export interface ParseResult {
  success: true;
  data: ParsedFile;
}

export interface ParseError {
  success: false;
  error: string;
}

export type ParseFileResult = ParseResult | ParseError;

/**
 * Parse a CSV or Excel file and return structured data
 */
export async function parseFile(file: File): Promise<ParseFileResult> {
  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      success: false,
      error: `File exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit. Please use a smaller file.`,
    };
  }

  // Determine file type and parse accordingly
  const extension = file.name.split('.').pop()?.toLowerCase();

  try {
    let result: ParsedFile;

    if (extension === 'csv') {
      result = await parseCSV(file);
    } else if (extension === 'xlsx' || extension === 'xls') {
      result = await parseExcel(file);
    } else {
      return {
        success: false,
        error: 'Unsupported file format. Please upload a CSV or Excel file (.csv, .xlsx, .xls).',
      };
    }

    // Validate row count
    if (result.rowCount > MAX_ROW_COUNT) {
      return {
        success: false,
        error: `File contains ${result.rowCount} rows, which exceeds the ${MAX_ROW_COUNT} row limit.`,
      };
    }

    // Validate that we have headers and data
    if (result.headers.length === 0) {
      return {
        success: false,
        error: 'The file appears to be empty or has no headers.',
      };
    }

    if (result.rows.length === 0) {
      return {
        success: false,
        error: 'The file has headers but no data rows.',
      };
    }

    return { success: true, data: result };
  } catch (error) {
    return {
      success: false,
      error: `Unable to read file: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Parse CSV file using Papa Parse
 */
async function parseCSV(file: File): Promise<ParsedFile> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      complete: (results) => {
        const allRows = results.data as string[][];

        // Filter out empty rows
        const nonEmptyRows = allRows.filter((row) => row.some((cell) => cell && cell.trim() !== ''));

        if (nonEmptyRows.length === 0) {
          reject(new Error('File is empty'));
          return;
        }

        const headers = nonEmptyRows[0].map((h) => (h || '').trim());
        const rows = nonEmptyRows.slice(1).map((row) =>
          row.map((cell) => (cell || '').trim())
        );

        resolve({
          headers,
          rows,
          rowCount: rows.length,
          fileName: file.name,
          fileSize: file.size,
        });
      },
      error: (error) => {
        reject(new Error(error.message));
      },
    });
  });
}

/**
 * Parse Excel file using SheetJS
 */
async function parseExcel(file: File): Promise<ParsedFile> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'array' });

        // Get the first sheet
        const firstSheetName = workbook.SheetNames[0];
        if (!firstSheetName) {
          reject(new Error('Excel file has no sheets'));
          return;
        }

        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json<string[]>(worksheet, {
          header: 1,
          defval: '',
        });

        // Filter out empty rows
        const nonEmptyRows = jsonData.filter((row) =>
          row.some((cell) => cell && String(cell).trim() !== '')
        );

        if (nonEmptyRows.length === 0) {
          reject(new Error('Sheet is empty'));
          return;
        }

        const headers = nonEmptyRows[0].map((h) => String(h || '').trim());
        const rows = nonEmptyRows.slice(1).map((row) =>
          row.map((cell) => String(cell || '').trim())
        );

        resolve({
          headers,
          rows,
          rowCount: rows.length,
          fileName: file.name,
          fileSize: file.size,
        });
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsArrayBuffer(file);
  });
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
