import { describe, it, expect } from 'vitest';
import { getDateParts, formatDate, formatEventType } from './date';

describe('Date Utilities', () => {
  describe('getDateParts', () => {
    it('should return null for null input', () => {
      expect(getDateParts(null)).toBeNull();
    });

    it('should return null for empty string', () => {
      expect(getDateParts('')).toBeNull();
    });

    it('should extract day and month from a valid date string', () => {
      const result = getDateParts('2026-01-25');
      expect(result).not.toBeNull();
      expect(result?.day).toBe(25);
      expect(result?.month).toBe('JAN');
    });

    it('should handle different months correctly', () => {
      expect(getDateParts('2026-06-15')?.month).toBe('JUN');
      expect(getDateParts('2026-12-01')?.month).toBe('DEC');
      expect(getDateParts('2026-03-22')?.month).toBe('MAR');
    });

    it('should handle single-digit days', () => {
      expect(getDateParts('2026-01-05')?.day).toBe(5);
      expect(getDateParts('2026-01-01')?.day).toBe(1);
    });

    it('should handle end-of-month days', () => {
      expect(getDateParts('2026-01-31')?.day).toBe(31);
      expect(getDateParts('2026-02-28')?.day).toBe(28);
    });

    it('should return month in uppercase', () => {
      const result = getDateParts('2026-07-04');
      expect(result?.month).toMatch(/^[A-Z]+$/);
    });
  });

  describe('formatDate', () => {
    it('should return "No date" for null input', () => {
      expect(formatDate(null)).toBe('No date');
    });

    it('should format date as "Month Day"', () => {
      const result = formatDate('2026-01-25');
      expect(result).toContain('Jan');
      expect(result).toContain('25');
    });

    it('should format different dates correctly', () => {
      expect(formatDate('2026-06-15')).toContain('Jun');
      expect(formatDate('2026-12-01')).toContain('Dec');
    });
  });

  describe('formatEventType', () => {
    it('should capitalize first letter', () => {
      expect(formatEventType('wedding')).toBe('Wedding');
      expect(formatEventType('corporate')).toBe('Corporate');
      expect(formatEventType('gala')).toBe('Gala');
    });

    it('should replace hyphens with spaces', () => {
      expect(formatEventType('corporate-event')).toBe('Corporate event');
    });

    it('should handle single-word types', () => {
      expect(formatEventType('party')).toBe('Party');
      expect(formatEventType('other')).toBe('Other');
    });

    it('should handle already capitalized input', () => {
      expect(formatEventType('Wedding')).toBe('Wedding');
    });
  });
});
