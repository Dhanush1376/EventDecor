import { parsePhoneNumberFromString } from 'libphonenumber-js';

export class PhoneNumberService {
  /**
   * Validates and formats a phone number to E.164 format.
   * If country is not provided, it assumes the number includes a country code (e.g., +91).
   */
  static formatE164(phone: string, defaultCountry: any = 'IN'): string {
    if (!phone) return '';

    // Ensure '+' prefix if missing but starts with typical country codes
    let normalized = phone.trim();
    if (!normalized.startsWith('+')) {
      if (normalized.startsWith('91') && normalized.length === 12) normalized = '+' + normalized;
      else if (normalized.startsWith('1') && normalized.length === 11)
        normalized = '+' + normalized;
      else if (normalized.startsWith('44') && normalized.length === 12)
        normalized = '+' + normalized;
    }

    const phoneNumber = parsePhoneNumberFromString(normalized, defaultCountry);
    if (phoneNumber && phoneNumber.isValid()) {
      return phoneNumber.format('E.164');
    }

    // Fallback if libphonenumber fails but it looks reasonably like a number
    const digits = normalized.replace(/\D/g, '');
    if (digits.length >= 10) return '+' + digits;

    return '';
  }

  /**
   * Gets the ISO country code from a phone number.
   */
  static getCountryCode(phone: string): string {
    const phoneNumber = parsePhoneNumberFromString(phone.startsWith('+') ? phone : '+' + phone);
    if (phoneNumber && phoneNumber.isValid() && phoneNumber.country) {
      return phoneNumber.country;
    }
    return 'UNKNOWN';
  }

  /**
   * Validates a phone number.
   */
  static isValid(phone: string, defaultCountry: any = 'IN'): boolean {
    const phoneNumber = parsePhoneNumberFromString(
      phone.startsWith('+') ? phone : '+' + phone,
      defaultCountry,
    );
    return !!(phoneNumber && phoneNumber.isValid());
  }
}
