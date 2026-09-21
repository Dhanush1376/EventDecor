import StoreSettingsService from '../services/StoreSettingsService';
import logger from './logger';

export interface StoreContact {
  email: string;
  phone: string;
  alternatePhone: string;
  whatsappNumber: string;
  address: string;
}

export interface StoreIdentity {
  name: string;
  logo: string;
  websiteUrl: string;
  websiteDomain: string;
  contact: StoreContact;
}

export interface StoreLegalDetails {
  legalName: string;
  gstin?: string;
  cin?: string;
  address: string;
  registeredAddress?: string;
}

// In-memory cache for zero-I/O synchronous access
let cachedStoreIdentity: StoreIdentity | null = null;

/**
 * Extracts clean domain from a URL string.
 */
function extractDomain(urlStr: string): string {
  try {
    const url = new URL(urlStr.startsWith('http') ? urlStr : `https://${urlStr}`);
    return url.hostname.replace(/^www\./, '');
  } catch {
    return (
      urlStr
        .replace(/^https?:\/\//, '')
        .replace(/^www\./, '')
        .split('/')[0] || ''
    );
  }
}

/**
 * Pure resolution logic:
 * Precedence: DB Settings -> Environment Variables -> Technical Fallback
 * Never performs I/O.
 */
export function resolveStoreIdentity(settings?: any): StoreIdentity {
  const dbGeneral = settings?.general;
  const dbContact = settings?.contact;

  const envName = process.env.STORE_NAME || process.env.VITE_SITE_NAME;
  const envUrl = process.env.SITE_URL || process.env.VITE_SITE_URL;
  const envEmail = process.env.SUPPORT_EMAIL || process.env.VITE_SUPPORT_EMAIL;
  const envPhone = process.env.CONTACT_PHONE || process.env.VITE_CONTACT_PHONE;

  const name = dbGeneral?.storeName?.trim() || envName?.trim() || 'Store';
  const logo = dbGeneral?.logo?.trim() || '';
  const websiteUrl = envUrl?.trim() || 'https://example.com';
  const websiteDomain = extractDomain(websiteUrl);

  const email =
    dbGeneral?.supportEmail?.trim() || dbContact?.email?.trim() || envEmail?.trim() || '';

  const phone = dbGeneral?.phone?.trim() || dbContact?.phone?.trim() || envPhone?.trim() || '';

  const alternatePhone =
    dbGeneral?.alternatePhone?.trim() || dbContact?.alternatePhone?.trim() || '';

  const whatsappNumber =
    dbGeneral?.whatsappNumber?.trim() || dbContact?.whatsappNumber?.trim() || phone;

  const address =
    dbContact?.address?.trim() ||
    [dbContact?.addressLine1, dbContact?.addressLine2, dbContact?.city, dbContact?.state]
      .filter(Boolean)
      .join(', ') ||
    '';

  return {
    name,
    logo,
    websiteUrl,
    websiteDomain,
    contact: {
      email,
      phone,
      alternatePhone,
      whatsappNumber,
      address,
    },
  };
}

/**
 * Resolves legal and tax details from raw store settings or invoice snapshots.
 * Does NOT provide dummy fake GSTINs.
 */
export function getStoreLegalDetails(settings?: any, storeSnap?: any): StoreLegalDetails {
  const legalName =
    storeSnap?.legalCompanyName ||
    settings?.legal?.legalCompanyName ||
    storeSnap?.displayName ||
    settings?.legal?.companyName ||
    settings?.general?.storeName ||
    getStoreConfigSync().name;

  const gstin = (storeSnap?.gstin || settings?.taxes?.gstNumber || '').trim();
  const cin = (storeSnap?.cin || settings?.legal?.cin || '').trim();

  const registeredAddress = (
    storeSnap?.registeredAddress ||
    settings?.legal?.registeredAddress ||
    ''
  ).trim();

  const address = storeSnap?.addressLine1
    ? [storeSnap.addressLine1, storeSnap.addressLine2, storeSnap.city, storeSnap.state]
        .filter(Boolean)
        .join(', ')
    : settings?.contact?.address || registeredAddress || '';

  return {
    legalName,
    gstin: gstin || undefined,
    cin: cin || undefined,
    address,
    registeredAddress: registeredAddress || undefined,
  };
}

/**
 * Updates the in-memory cache directly (e.g. after StoreSettings update).
 */
export function updateStoreConfigCache(settings: any): StoreIdentity {
  const identity = resolveStoreIdentity(settings);
  cachedStoreIdentity = identity;
  return identity;
}

/**
 * Asynchronous resolver: Fetches settings from persistence layer,
 * normalizes to StoreIdentity, updates cache, and returns.
 */
export async function getStoreConfig(bypassCache = false): Promise<StoreIdentity> {
  try {
    const settings = await StoreSettingsService.getSettings(bypassCache);
    return updateStoreConfigCache(settings);
  } catch (error) {
    logger.warn(
      'Failed to fetch StoreSettings from database, falling back to ENV/technical config',
      error,
    );
    if (!cachedStoreIdentity) {
      cachedStoreIdentity = resolveStoreIdentity(null);
    }
    return cachedStoreIdentity;
  }
}

/**
 * Synchronous resolver: STRICT ZERO-I/O CONTRACT.
 * Returns already-loaded cached identity or evaluates ENV/fallback.
 * Never executes database, network, or filesystem operations.
 */
export function getStoreConfigSync(): StoreIdentity {
  if (cachedStoreIdentity) {
    return cachedStoreIdentity;
  }
  // If cache not yet populated, evaluate pure ENV/technical fallback
  return resolveStoreIdentity(null);
}

/**
 * Prime the configuration cache at application bootstrap.
 */
export async function initStoreConfig(): Promise<void> {
  try {
    await getStoreConfig(true);
    logger.info(`Store configuration initialized for: "${cachedStoreIdentity?.name}"`);
  } catch (err) {
    logger.warn('Could not initialize store configuration at startup; using fallback cache', err);
    cachedStoreIdentity = resolveStoreIdentity(null);
  }
}
