/**
 * Utility for validating and formatting Indian phone numbers to E.164.
 */

export class PhoneValidator {
  /**
   * Validates if a given string can be a valid Indian phone number.
   * Matches basic 10-digit variants with or without +91 / 91 / 0 prefix.
   */
  static validateIndianPhone(phone: string): boolean {
    if (!phone) return false;
    // Strip all non-digit characters except the leading +
    const cleaned = phone.replace(/[^\d+]/g, '');

    // Pattern matches:
    // +919876543210
    // 919876543210
    // 09876543210
    // 9876543210
    const regex = /^(?:(?:\+|0{0,2})91(\s*-\s*)?|[0]?)?[6-9]\d{9}$/;
    return regex.test(cleaned);
  }

  /**
   * Normalizes a phone number to standard formats.
   * Defaults to Indian country code (+91) if none provided.
   */
  static normalizePhone(raw: string): { countryCode: string; national: string; e164: string } {
    if (!raw) {
      return { countryCode: '', national: '', e164: '' };
    }

    // Strip everything except numbers and plus
    const cleaned = raw.replace(/[^\d+]/g, '');

    const countryCode = '+91';
    let national: string;

    if (cleaned.startsWith('+91')) {
      national = cleaned.substring(3);
    } else if (cleaned.startsWith('91') && cleaned.length === 12) {
      national = cleaned.substring(2);
    } else if (cleaned.startsWith('0') && cleaned.length === 11) {
      national = cleaned.substring(1);
    } else if (cleaned.length === 10) {
      national = cleaned;
    } else {
      // Fallback for unexpected formats, try to salvage the last 10 digits
      if (cleaned.length > 10) {
        national = cleaned.slice(-10);
      } else {
        national = cleaned; // Invalid but best effort
      }
    }

    return {
      countryCode,
      national,
      e164: `${countryCode}${national}`,
    };
  }
}
