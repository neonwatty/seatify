import type { Event, Table, QRTableData } from '../types';

const QR_DATA_VERSION = 1;

/**
 * Encode table data for QR code URL
 */
export function encodeTableData(event: Event, table: Table): string {
  const guests = event.guests
    .filter((g) => g.tableId === table.id && g.rsvpStatus === 'confirmed')
    .map((g) => `${g.firstName} ${g.lastName}`.trim());

  const data: QRTableData = {
    v: QR_DATA_VERSION,
    e: event.name,
    d: event.date,
    t: table.name,
    g: guests,
    c: table.capacity,
  };

  // Use URL-safe base64 encoding
  return btoa(JSON.stringify(data))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Decode table data from QR code URL
 */
export function decodeTableData(encoded: string): QRTableData | null {
  try {
    // Restore standard base64
    let base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
    // Add padding if needed
    while (base64.length % 4) {
      base64 += '=';
    }

    const json = atob(base64);
    const data = JSON.parse(json) as QRTableData;

    // Validate structure
    if (!validateQRData(data)) {
      return null;
    }

    return data;
  } catch {
    return null;
  }
}

/**
 * Validate QR data structure
 */
export function validateQRData(data: unknown): data is QRTableData {
  if (!data || typeof data !== 'object') return false;

  const d = data as Record<string, unknown>;

  return (
    typeof d.v === 'number' &&
    typeof d.e === 'string' &&
    typeof d.t === 'string' &&
    Array.isArray(d.g) &&
    d.g.every((g) => typeof g === 'string') &&
    typeof d.c === 'number'
  );
}

/**
 * Generate full URL for QR code
 */
export function generateTableQRUrl(event: Event, table: Table): string {
  const encoded = encodeTableData(event, table);
  const baseUrl = window.location.origin;
  return `${baseUrl}/table/${encoded}`;
}

/**
 * Parse QR data from current URL pathname (BrowserRouter)
 */
export function parseQRDataFromHash(): QRTableData | null {
  const pathname = window.location.pathname;
  const match = pathname.match(/^\/table\/(.+)$/);

  if (!match) return null;

  return decodeTableData(match[1]);
}

/**
 * Check if current URL is a QR code landing page
 */
export function isQRLandingPage(): boolean {
  return window.location.pathname.startsWith('/table/');
}

/**
 * Get guest count text
 */
export function getGuestCountText(data: QRTableData): string {
  const count = data.g.length;
  const capacity = data.c;

  if (count === 0) {
    return 'No guests assigned yet';
  }

  if (count === 1) {
    return `1 guest assigned (${capacity} seats)`;
  }

  return `${count} guests assigned (${capacity} seats)`;
}

/**
 * Download QR code as PNG
 */
export async function downloadQRCodeAsPng(
  svgElement: SVGElement,
  filename: string
): Promise<void> {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Get SVG dimensions
  const svgRect = svgElement.getBoundingClientRect();
  const scale = 2; // 2x for higher resolution
  canvas.width = svgRect.width * scale;
  canvas.height = svgRect.height * scale;

  // Create image from SVG
  const svgData = new XMLSerializer().serializeToString(svgElement);
  const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
  const svgUrl = URL.createObjectURL(svgBlob);

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      // Fill white background
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw QR code
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(svgUrl);

      // Download
      const link = document.createElement('a');
      link.download = `${filename}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();

      resolve();
    };
    img.onerror = reject;
    img.src = svgUrl;
  });
}

/**
 * Copy URL to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for older browsers
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
      return true;
    } catch {
      return false;
    } finally {
      document.body.removeChild(textarea);
    }
  }
}
