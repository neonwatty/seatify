/**
 * Extracts day and month parts from a date string for calendar display
 * Uses UTC to avoid timezone offset issues with date-only strings
 * @param dateStr - ISO date string or null (e.g., "2026-01-25")
 * @returns Object with day (number) and month (short uppercase string), or null if no date
 */
export function getDateParts(dateStr: string | null): { day: number; month: string } | null {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  return {
    day: date.getUTCDate(),
    month: date.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' }).toUpperCase()
  };
}

/**
 * Formats a date string for display
 * Uses UTC to avoid timezone offset issues with date-only strings
 * @param dateStr - ISO date string or null
 * @returns Formatted date string like "Jan 15" or "No date" if null
 */
export function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'No date';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

/**
 * Formats an event type for display
 * @param type - Event type string (e.g., "wedding", "corporate-event")
 * @returns Formatted string with capitalized first letter and hyphens replaced with spaces
 */
export function formatEventType(type: string): string {
  return type.charAt(0).toUpperCase() + type.slice(1).replace('-', ' ');
}
