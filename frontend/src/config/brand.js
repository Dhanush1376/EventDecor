/**
 * Dynamic brand helper module.
 * Provides dynamic brand identity synced with Admin Store Settings (General Info).
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
};
