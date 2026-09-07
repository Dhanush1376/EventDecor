import { describe, it, expect } from 'vitest';
import { sanitizePhoneNumber, isValidPhoneNumber } from '../phoneUtils';

describe('phoneUtils', () => {
  describe('sanitizePhoneNumber', () => {
    it('normalizes clean 10-digit number', () => {
      expect(sanitizePhoneNumber('9876543210')).toBe('9876543210');
      expect(isValidPhoneNumber('9876543210')).toBe(true);
    });

    it('strips leading zeros (autofill issue)', () => {
      expect(sanitizePhoneNumber('09876543210')).toBe('9876543210');
      expect(isValidPhoneNumber('09876543210')).toBe(true);
      expect(sanitizePhoneNumber('009876543210')).toBe('9876543210');
      expect(isValidPhoneNumber('009876543210')).toBe(true);
    });

    it('handles Indian country prefixes (+91 and 91)', () => {
      expect(sanitizePhoneNumber('+91 9876543210')).toBe('9876543210');
      expect(isValidPhoneNumber('+91 9876543210')).toBe(true);

      expect(sanitizePhoneNumber('+919876543210')).toBe('9876543210');
      expect(isValidPhoneNumber('+919876543210')).toBe(true);

      expect(sanitizePhoneNumber('919876543210')).toBe('9876543210');
      expect(isValidPhoneNumber('919876543210')).toBe(true);

      expect(sanitizePhoneNumber('00919876543210')).toBe('9876543210');
      expect(isValidPhoneNumber('00919876543210')).toBe(true);
    });

    it('handles formatted strings with spaces, hyphens, and parentheses', () => {
      expect(sanitizePhoneNumber('98-765-43210')).toBe('9876543210');
      expect(isValidPhoneNumber('98-765-43210')).toBe(true);

      expect(sanitizePhoneNumber('(98765) 43210')).toBe('9876543210');
      expect(isValidPhoneNumber('(98765) 43210')).toBe(true);
    });

    it('handles single and double zero inputs', () => {
      expect(sanitizePhoneNumber('0')).toBe('');
      expect(isValidPhoneNumber('0')).toBe(false);

      expect(sanitizePhoneNumber('00')).toBe('');
      expect(isValidPhoneNumber('00')).toBe(false);
    });

    it('handles partial / in-progress typing without throwing', () => {
      expect(sanitizePhoneNumber('09')).toBe('9');
      expect(isValidPhoneNumber('09')).toBe(false);

      expect(sanitizePhoneNumber('98765')).toBe('98765');
      expect(isValidPhoneNumber('98765')).toBe(false);
    });

    it('caps at 10 digits', () => {
      expect(sanitizePhoneNumber('98765432109999')).toBe('9876543210');
    });

    it('safely handles null, undefined, numbers, and malformed inputs', () => {
      expect(sanitizePhoneNumber(null)).toBe('');
      expect(isValidPhoneNumber(null)).toBe(false);

      expect(sanitizePhoneNumber(undefined)).toBe('');
      expect(isValidPhoneNumber(undefined)).toBe(false);

      expect(sanitizePhoneNumber(9876543210)).toBe('9876543210');
      expect(isValidPhoneNumber(9876543210)).toBe(true);

      expect(sanitizePhoneNumber({})).toBe('');
      expect(sanitizePhoneNumber([])).toBe('');
      expect(sanitizePhoneNumber(NaN)).toBe('');
    });
  });
});
