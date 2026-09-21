/**
 * Dynamic brand helper module.
 * Provides dynamic brand identity, emails, phone numbers, and WhatsApp links
 * synced with Admin Store Settings (General Info & Contact Info).
 */

export const getBrandName = (settings) => {
  return (
    settings?.general?.storeName?.trim() ||
    getStoredStoreName() ||
    import.meta.env.VITE_SITE_NAME ||
    'Siri Arts & Crafts'
  );
};

export const getStoredStoreName = () => {
  try {
    const direct = localStorage.getItem('siri_store_name');
    if (direct?.trim()) return direct.trim();

    const cached = localStorage.getItem('siri_public_settings');
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed?.general?.storeName?.trim()) {
        return parsed.general.storeName.trim();
      }
    }
  } catch (_e) {
    // Non-browser or storage restricted
  }
  return '';
};

export const getStoredEmail = () => {
  try {
    const direct = localStorage.getItem('siri_support_email');
    if (direct?.trim()) return direct.trim();

    const cached = localStorage.getItem('siri_public_settings');
    if (cached) {
      const parsed = JSON.parse(cached);
      const email = parsed?.general?.supportEmail || parsed?.contact?.email;
      if (email?.trim()) return email.trim();
    }
  } catch (_e) {}
  return '';
};

export const getStoredPhone = () => {
  try {
    const direct = localStorage.getItem('siri_store_phone');
    if (direct?.trim()) return direct.trim();

    const cached = localStorage.getItem('siri_public_settings');
    if (cached) {
      const parsed = JSON.parse(cached);
      const phone = parsed?.general?.phone || parsed?.contact?.phone;
      if (phone?.trim()) return phone.trim();
    }
  } catch (_e) {}
  return '';
};

export const getStoredAlternatePhone = () => {
  try {
    const direct = localStorage.getItem('siri_store_alt_phone');
    if (direct?.trim()) return direct.trim();

    const cached = localStorage.getItem('siri_public_settings');
    if (cached) {
      const parsed = JSON.parse(cached);
      const alt = parsed?.general?.alternatePhone || parsed?.contact?.alternatePhone;
      if (alt?.trim()) return alt.trim();
    }
  } catch (_e) {}
  return '';
};

export const getStoredWhatsAppNumber = () => {
  try {
    const direct = localStorage.getItem('siri_store_whatsapp');
    if (direct?.trim()) return direct.trim();

    const cached = localStorage.getItem('siri_public_settings');
    if (cached) {
      const parsed = JSON.parse(cached);
      const whatsapp = parsed?.general?.whatsappNumber || parsed?.contact?.whatsappNumber;
      if (whatsapp?.trim()) return whatsapp.trim();
    }
  } catch (_e) {}
  return '';
};

export const getStoredTagline = () => {
  try {
    const direct = localStorage.getItem('siri_store_tagline');
    if (direct?.trim()) return direct.trim();

    const cached = localStorage.getItem('siri_public_settings');
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed?.general?.tagline?.trim()) return parsed.general.tagline.trim();
    }
  } catch (_e) {}
  return '';
};

export const getStoredSupportHours = () => {
  try {
    const direct = localStorage.getItem('siri_store_support_hours');
    if (direct?.trim()) return direct.trim();

    const cached = localStorage.getItem('siri_public_settings');
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed?.contact?.supportHours?.trim()) return parsed.contact.supportHours.trim();
    }
  } catch (_e) {}
  return 'Mon - Sat, 10 AM to 6 PM';
};

export const getStoredAddress = () => {
  try {
    const direct = localStorage.getItem('siri_store_address');
    if (direct?.trim()) return direct.trim();

    const cached = localStorage.getItem('siri_public_settings');
    if (cached) {
      const parsed = JSON.parse(cached);
      const address = parsed?.contact?.address || parsed?.general?.address;
      if (address?.trim()) return address.trim();
    }
  } catch (_e) {}
  return '';
};

export const getStoredCity = () => {
  try {
    const direct = localStorage.getItem('siri_store_city');
    if (direct?.trim()) return direct.trim();

    const cached = localStorage.getItem('siri_public_settings');
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed?.contact?.city?.trim()) return parsed.contact.city.trim();
    }
  } catch (_e) {}
  return 'Ongole';
};

export const getStoredState = () => {
  try {
    const direct = localStorage.getItem('siri_store_state');
    if (direct?.trim()) return direct.trim();

    const cached = localStorage.getItem('siri_public_settings');
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed?.contact?.state?.trim()) return parsed.contact.state.trim();
    }
  } catch (_e) {}
  return 'Andhra Pradesh';
};

export const getStoredPostalCode = () => {
  try {
    const direct = localStorage.getItem('siri_store_postal_code');
    if (direct?.trim()) return direct.trim();

    const cached = localStorage.getItem('siri_public_settings');
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed?.contact?.postalCode?.trim()) return parsed.contact.postalCode.trim();
    }
  } catch (_e) {}
  return '523001';
};

export const getStoredCountry = () => {
  try {
    const direct = localStorage.getItem('siri_store_country');
    if (direct?.trim()) return direct.trim();

    const cached = localStorage.getItem('siri_public_settings');
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed?.contact?.country?.trim()) return parsed.contact.country.trim();
    }
  } catch (_e) {}
  return 'India';
};

export const getStoredCompanyName = () => {
  try {
    const direct = localStorage.getItem('siri_company_name');
    if (direct?.trim()) return direct.trim();

    const cached = localStorage.getItem('siri_public_settings');
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed?.legal?.companyName?.trim()) return parsed.legal.companyName.trim();
    }
  } catch (_e) {}
  return '';
};

export const getStoredLegalCompanyName = () => {
  try {
    const direct = localStorage.getItem('siri_legal_company_name');
    if (direct?.trim()) return direct.trim();

    const cached = localStorage.getItem('siri_public_settings');
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed?.legal?.legalCompanyName?.trim()) return parsed.legal.legalCompanyName.trim();
    }
  } catch (_e) {}
  return '';
};

export const getStoredCIN = () => {
  try {
    const direct = localStorage.getItem('siri_store_cin');
    if (direct?.trim()) return direct.trim();

    const cached = localStorage.getItem('siri_public_settings');
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed?.legal?.cin?.trim()) return parsed.legal.cin.trim();
    }
  } catch (_e) {}
  return '';
};

export const getStoredRegisteredAddress = () => {
  try {
    const direct = localStorage.getItem('siri_registered_address');
    if (direct?.trim()) return direct.trim();

    const cached = localStorage.getItem('siri_public_settings');
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed?.legal?.registeredAddress?.trim()) return parsed.legal.registeredAddress.trim();
    }
  } catch (_e) {}
  return '';
};

export const getStoredGSTIN = () => {
  try {
    const direct = localStorage.getItem('siri_store_gstin');
    if (direct?.trim()) return direct.trim();

    const cached = localStorage.getItem('siri_public_settings');
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed?.taxes?.gstNumber?.trim()) return parsed.taxes.gstNumber.trim();
    }
  } catch (_e) {}
  return '';
};

/**
 * Strips all non-digit characters and ensures country code 91 for WhatsApp / tel URLs.
 */
export const cleanPhoneDigits = (phone) => {
  if (!phone) return '';
  const digits = String(phone).replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 12 && digits.startsWith('91')) return digits;
  if (digits.startsWith('0') && digits.length === 11) return `91${digits.slice(1)}`;
  return digits;
};

/**
 * Formats a phone number consistently with '+91 XXXXX XXXXX' (or '+91 XXXXXXXXXX').
 */
export const formatPhoneWithCountryCode = (phone) => {
  if (!phone) return '';
  const str = String(phone).trim();
  const digits = str.replace(/\D/g, '');

  if (digits.length === 10) {
    return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
  }
  if (digits.length === 12 && digits.startsWith('91')) {
    const core = digits.slice(2);
    return `+91 ${core.slice(0, 5)} ${core.slice(5)}`;
  }
  if (str.startsWith('+91')) {
    const rest = str.replace(/^\+91\s*/, '').trim();
    return `+91 ${rest}`;
  }
  return str.startsWith('+') ? str : `+91 ${str}`;
};

/**
 * Builds a dynamic WhatsApp redirect URL for the configured WhatsApp number.
 */
export const getWhatsAppUrl = (customMessage, customPhone) => {
  const targetNumber =
    customPhone ||
    getStoredWhatsAppNumber() ||
    getStoredPhone() ||
    import.meta.env.VITE_CONTACT_PHONE ||
    '';
  const digits = cleanPhoneDigits(targetNumber);
  if (!digits) return '#';
  const defaultMsg = `Hello ${BRAND.name}! I would like to inquire about your products and services.`;
  const text = encodeURIComponent(customMessage || defaultMsg);
  return `https://wa.me/${digits}?text=${text}`;
};

export const BRAND = {
  get name() {
    return getBrandName();
  },
  get accessibleName() {
    return this.name.replace(/&/g, 'and');
  },
  get lowercase() {
    return this.name.toLowerCase();
  },
  get uppercase() {
    return this.name.toUpperCase();
  },
  get slug() {
    return this.name
      .toLowerCase()
      .replace(/&/g, 'and')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  },
  get tagline() {
    return getStoredTagline();
  },
  get email() {
    return getStoredEmail() || import.meta.env.VITE_SUPPORT_EMAIL || '';
  },
  get supportHours() {
    return getStoredSupportHours();
  },
  get address() {
    return getStoredAddress();
  },
  get city() {
    return getStoredCity();
  },
  get state() {
    return getStoredState();
  },
  get postalCode() {
    return getStoredPostalCode();
  },
  get country() {
    return getStoredCountry();
  },
  get companyName() {
    return getStoredCompanyName() || this.name;
  },
  get legalCompanyName() {
    return getStoredLegalCompanyName() || this.companyName;
  },
  get cin() {
    return getStoredCIN();
  },
  get registeredAddress() {
    return getStoredRegisteredAddress() || this.address;
  },
  get gstin() {
    return getStoredGSTIN();
  },
  get phone() {
    const raw = getStoredPhone() || import.meta.env.VITE_CONTACT_PHONE || '';
    return raw ? formatPhoneWithCountryCode(raw) : '';
  },
  get phoneRaw() {
    return cleanPhoneDigits(this.phone);
  },
  get alternatePhone() {
    const alt = getStoredAlternatePhone();
    return alt ? formatPhoneWithCountryCode(alt) : '';
  },
  get alternatePhoneRaw() {
    return cleanPhoneDigits(this.alternatePhone);
  },
  get whatsappNumber() {
    const raw = getStoredWhatsAppNumber() || this.phone || '';
    return raw ? formatPhoneWithCountryCode(raw) : '';
  },
  get whatsappDigits() {
    return cleanPhoneDigits(this.whatsappNumber);
  },
  get whatsappUrl() {
    return getWhatsAppUrl();
  },
  getWhatsAppUrl(msg, phone) {
    return getWhatsAppUrl(msg, phone);
  },
};
