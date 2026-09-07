/**
 * Location and Reverse Geocoding Service
 *
 * Provides resilient, multi-tier location detection and reverse geocoding:
 * - Tier 1: Browser navigator.geolocation (standard accuracy, battery-safe, cell/Wi-Fi cached)
 * - Tier 2: Secure HTTPS IP-based geolocation fallback (for insecure contexts over LAN HTTP, denied permissions, or timeouts)
 * - Reverse Geocoding: OpenStreetMap Nominatim (without forbidden User-Agent header)
 *   with graceful fallback to BigDataCloud client API
 * - Separate Pincode postal data enrichment (api.postalpincode.in)
 * - Guarantees consistent normalized shape without fabricating details
 */

const log = {
  warn: (...args) => {
    if (typeof console !== 'undefined' && console.warn) console.warn('[LocationService]', ...args);
  },
  info: (...args) => {
    if (typeof console !== 'undefined' && console.info) console.info('[LocationService]', ...args);
  },
};

const DEFAULT_TIMEOUT_MS = 9000;

/**
 * Normalizes an address object into a consistent data structure.
 */
function createNormalizedAddress({
  latitude = null,
  longitude = null,
  address = '',
  locality = '',
  landmark = '',
  city = '',
  district = '',
  state = '',
  pincode = '',
  country = 'India',
  source = 'unknown',
} = {}) {
  return {
    latitude: typeof latitude === 'number' ? latitude : null,
    longitude: typeof longitude === 'number' ? longitude : null,
    address: address ? String(address).trim() : '',
    locality: locality ? String(locality).trim() : '',
    landmark: landmark ? String(landmark).trim() : '',
    city: city ? String(city).trim() : '',
    district: district ? String(district).trim() : '',
    state: state ? String(state).trim() : '',
    pincode: pincode ? String(pincode).replace(/\D/g, '').slice(0, 6) : '',
    country: country ? String(country).trim() : 'India',
    source,
  };
}

/**
 * Attempts to retrieve coordinates via browser navigator.geolocation (Tier 1).
 */
function getBrowserCoordinates() {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
      return reject(new Error('Browser environment unavailable'));
    }

    if (!navigator.geolocation) {
      return reject(new Error('Geolocation not supported by browser'));
    }

    // In modern browsers, geolocation is blocked on insecure origins (HTTP) unless localhost
    const isSecure =
      window.isSecureContext ||
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1';

    if (!isSecure) {
      return reject(new Error('Insecure context: geolocation requires HTTPS or localhost'));
    }

    const options = {
      enableHighAccuracy: false,
      timeout: 10000,
      maximumAge: 300000, // 5 minutes cache for fast response
    };

    let resolved = false;
    const timer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        reject(new Error('Geolocation request timed out'));
      }
    }, options.timeout + 1000);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (resolved) return;
        resolved = true;
        clearTimeout(timer);
        if (pos?.coords) {
          resolve({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            source: 'gps',
          });
        } else {
          reject(new Error('No coordinates returned by GPS'));
        }
      },
      (err) => {
        if (resolved) return;
        resolved = true;
        clearTimeout(timer);
        reject(err);
      },
      options,
    );
  });
}

/**
 * Attempts to retrieve approximate location via IP Geolocation (Tier 2).
 */
async function getIPLocation() {
  // Provider 1: freeipapi.com (HTTPS, client-safe, CORS-friendly, no keys)
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

    const res = await fetch('https://freeipapi.com/api/json', {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      if (data && typeof data.latitude === 'number' && typeof data.longitude === 'number') {
        return createNormalizedAddress({
          latitude: data.latitude,
          longitude: data.longitude,
          city: data.cityName || '',
          state: data.regionName || '',
          pincode: data.zipCode || '',
          country: data.countryName || 'India',
          source: 'network',
        });
      }
    }
  } catch (err) {
    log.warn('freeipapi lookup failed, attempting secondary IP provider:', err.message);
  }

  // Provider 2 fallback: ipapi.co (HTTPS, CORS-friendly fallback)
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

    const res = await fetch('https://ipapi.co/json/', {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      if (data && !data.error && typeof data.latitude === 'number') {
        return createNormalizedAddress({
          latitude: data.latitude,
          longitude: data.longitude,
          city: data.city || '',
          state: data.region || '',
          pincode: data.postal || '',
          country: data.country_name || 'India',
          source: 'network',
        });
      }
    }
  } catch (err) {
    log.warn('ipapi.co fallback failed:', err.message);
  }

  throw new Error('All IP geolocation providers failed');
}

/**
 * Optional enrichment step: fetches official postal details for a 6-digit Indian pincode.
 */
async function enrichFromPincode(pincode) {
  const cleanPin = String(pincode || '')
    .replace(/\D/g, '')
    .slice(0, 6);
  if (cleanPin.length !== 6) return null;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(`https://api.postalpincode.in/pincode/${cleanPin}`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data[0]?.Status === 'Success' && data[0].PostOffice?.length > 0) {
        const po = data[0].PostOffice[0];
        return {
          city: po.District || po.Block || po.Region || '',
          district: po.District || '',
          state: po.State || '',
          locality: po.Name || '',
        };
      }
    }
  } catch (err) {
    log.warn('Pincode enrichment skipped:', err.message);
  }
  return null;
}

/**
 * Reverse geocodes coordinates (latitude, longitude) into a normalized address.
 *
 * Primary provider: OpenStreetMap Nominatim (without forbidden User-Agent header).
 * Fallback provider: BigDataCloud client API.
 *
 * @param {number} latitude
 * @param {number} longitude
 * @returns {Promise<{ success: boolean, data?: object, error?: string }>}
 */
export async function reverseGeocodeCoords(latitude, longitude) {
  if (typeof latitude !== 'number' || typeof longitude !== 'number') {
    return {
      success: false,
      error: 'Invalid coordinates provided',
    };
  }

  let resolved = null;

  // 1. Primary: Nominatim (DO NOT send forbidden User-Agent header from browser)
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1&zoom=18`;
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'Accept-Language': 'en',
      },
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      if (data && data.address) {
        const addr = data.address;

        const isGenericTag = (val) => {
          if (!val || typeof val !== 'string') return true;
          const lower = val.trim().toLowerCase();
          return [
            'yes',
            'no',
            'true',
            'false',
            'residential',
            'commercial',
            'apartments',
            'unclassified',
            'building',
          ].includes(lower);
        };

        const displayParts = data.display_name ? data.display_name.split(',') : [];

        // Check for recognized POI or landmark tags
        let detectedPoi = '';
        if (addr.landmark && !isGenericTag(addr.landmark)) detectedPoi = addr.landmark;
        else if (addr.amenity && !isGenericTag(addr.amenity)) detectedPoi = addr.amenity;
        else if (addr.building && !isGenericTag(addr.building)) detectedPoi = addr.building;
        else if (addr.shop && !isGenericTag(addr.shop)) detectedPoi = addr.shop;
        else if (addr.tourism && !isGenericTag(addr.tourism)) detectedPoi = addr.tourism;
        else if (addr.historic && !isGenericTag(addr.historic)) detectedPoi = addr.historic;
        else if (addr.leisure && !isGenericTag(addr.leisure)) detectedPoi = addr.leisure;
        else if (addr.office && !isGenericTag(addr.office)) detectedPoi = addr.office;
        else if (data.name && typeof data.name === 'string') {
          const n = data.name.trim();
          if (
            n !== addr.road &&
            n !== addr.street &&
            n !== addr.city &&
            n !== addr.town &&
            n !== addr.village &&
            n !== addr.state &&
            n !== addr.suburb &&
            n !== addr.county &&
            !isGenericTag(n)
          ) {
            detectedPoi = n;
          }
        } else if (displayParts.length > 3) {
          const firstPart = displayParts[0]?.trim();
          if (
            firstPart &&
            firstPart !== addr.road &&
            firstPart !== addr.street &&
            firstPart !== addr.suburb &&
            firstPart !== addr.neighbourhood &&
            firstPart !== addr.city &&
            firstPart !== addr.town &&
            firstPart !== addr.village &&
            firstPart !== addr.county &&
            firstPart !== addr.state &&
            firstPart !== addr.postcode &&
            !isGenericTag(firstPart)
          ) {
            detectedPoi = firstPart;
          }
        }

        let landmark = '';
        if (detectedPoi && typeof detectedPoi === 'string') {
          const cleanPoi = detectedPoi.trim();
          if (cleanPoi) {
            landmark = cleanPoi.match(/^(near|opp|opposite|behind|beside)\s/i)
              ? cleanPoi
              : `Near ${cleanPoi}`;
          }
        }

        const streetParts = [];
        if (addr.house_number) streetParts.push(addr.house_number);
        if (addr.house_name) streetParts.push(addr.house_name);
        if (detectedPoi && detectedPoi !== addr.road && detectedPoi !== addr.street) {
          streetParts.push(detectedPoi);
        } else if (addr.building && !isGenericTag(addr.building)) {
          streetParts.push(addr.building);
        }
        if (addr.road || addr.street) streetParts.push(addr.road || addr.street);
        if (addr.residential) streetParts.push(addr.residential);

        const addressLine =
          streetParts.length > 0
            ? Array.from(new Set(streetParts)).join(', ')
            : displayParts.length > 3
              ? displayParts.slice(0, 3).join(',').trim()
              : data.display_name || '';

        const locality =
          addr.suburb ||
          addr.neighbourhood ||
          addr.residential ||
          addr.subdistrict ||
          addr.locality ||
          '';

        const city =
          addr.city ||
          addr.town ||
          addr.village ||
          addr.municipality ||
          addr.county ||
          addr.state_district ||
          '';

        const district = addr.county || addr.state_district || city || '';
        const state = addr.state || '';
        const rawPincode = addr.postcode || '';
        const pincode = rawPincode.replace(/\D/g, '').slice(0, 6);
        const country = addr.country || 'India';

        resolved = createNormalizedAddress({
          latitude,
          longitude,
          address: addressLine,
          locality,
          landmark,
          city,
          district,
          state,
          pincode,
          country,
          source: 'nominatim',
        });
      }
    }
  } catch (err) {
    log.warn('Nominatim reverse geocode failed, attempting BigDataCloud fallback:', err.message);
  }

  // 2. Fallback: BigDataCloud client API (CORS-friendly, no keys required)
  if (!resolved || (!resolved.city && !resolved.pincode)) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

      const bdcUrl = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`;
      const res = await fetch(bdcUrl, {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      });
      clearTimeout(timeout);

      if (res.ok) {
        const data = await res.json();
        if (data) {
          const bdcCity = data.city || data.locality || '';
          const bdcLocality = data.locality || data.principalSubdivision || '';
          const bdcState = data.principalSubdivision || '';
          const bdcPincode = (data.postcode || '').replace(/\D/g, '').slice(0, 6);
          const bdcCountry = data.countryName || 'India';

          let bdcPoi = '';
          if (Array.isArray(data.localityInfo?.informative)) {
            const poiItem = data.localityInfo.informative.find(
              (item) =>
                item.name &&
                item.description &&
                (item.description.includes('landmark') ||
                  item.description.includes('point of interest') ||
                  item.description.includes('amenity') ||
                  item.description.includes('facility') ||
                  item.description.includes('building') ||
                  item.description.includes('place of worship')),
            );
            if (poiItem?.name) {
              bdcPoi = poiItem.name.trim();
            }
          }

          const bdcLandmark = bdcPoi
            ? bdcPoi.match(/^(near|opp|opposite|behind|beside)\s/i)
              ? bdcPoi
              : `Near ${bdcPoi}`
            : '';

          resolved = createNormalizedAddress({
            latitude,
            longitude,
            address: resolved?.address || (bdcLocality ? `${bdcLocality}, ${bdcCity}` : bdcCity),
            locality: resolved?.locality || bdcLocality,
            landmark: resolved?.landmark || bdcLandmark,
            city: resolved?.city || bdcCity,
            district: resolved?.district || bdcCity,
            state: resolved?.state || bdcState,
            pincode: resolved?.pincode || bdcPincode,
            country: resolved?.country || bdcCountry,
            source: resolved ? resolved.source : 'bigdatacloud',
          });
        }
      }
    } catch (err) {
      log.warn('BigDataCloud reverse geocode fallback failed:', err.message);
    }
  }

  // 3. Pincode enrichment if pincode is present but city or state are incomplete
  if (resolved?.pincode && (!resolved.city || !resolved.state)) {
    const enriched = await enrichFromPincode(resolved.pincode);
    if (enriched) {
      if (!resolved.city && enriched.city) resolved.city = enriched.city;
      if (!resolved.district && enriched.district) resolved.district = enriched.district;
      if (!resolved.state && enriched.state) resolved.state = enriched.state;
      if (!resolved.locality && enriched.locality) resolved.locality = enriched.locality;
    }
  }

  if (resolved) {
    return {
      success: true,
      data: resolved,
    };
  }

  return {
    success: false,
    error: 'Could not resolve address details for the specified coordinates',
  };
}

/**
 * Unified detector that resolves the current user/device location into normalized address parameters.
 *
 * Tier 1: Attempts GPS/device geolocation.
 * Tier 2: Falls back seamlessly to IP geolocation on non-secure contexts, timeouts, or permission errors.
 *
 * @returns {Promise<{ success: boolean, data?: object, error?: string, source?: string }>}
 */
export async function detectAndResolveAddress() {
  let coords = null;
  let tierSource = 'gps';

  // Attempt Tier 1 (Browser geolocation)
  try {
    coords = await getBrowserCoordinates();
  } catch (geoErr) {
    log.info(
      'Browser geolocation unavailable or denied, falling back to IP detection:',
      geoErr.message,
    );
  }

  // Attempt Tier 2 (IP Fallback) if Tier 1 failed
  if (!coords) {
    try {
      const ipResult = await getIPLocation();
      if (ipResult && ipResult.latitude && ipResult.longitude) {
        tierSource = 'network';
        // If IP result already has good address fields (city, state, pincode), reverse geocode to enrich
        const reverseRes = await reverseGeocodeCoords(ipResult.latitude, ipResult.longitude);
        if (reverseRes.success && reverseRes.data) {
          return {
            success: true,
            source: tierSource,
            data: {
              ...reverseRes.data,
              city: reverseRes.data.city || ipResult.city,
              state: reverseRes.data.state || ipResult.state,
              pincode: reverseRes.data.pincode || ipResult.pincode,
              source: tierSource,
            },
          };
        }

        return {
          success: true,
          source: tierSource,
          data: ipResult,
        };
      }
    } catch (ipErr) {
      log.warn('IP geolocation fallback failed:', ipErr.message);
    }
  }

  // If we obtained GPS coordinates, reverse geocode them
  if (coords) {
    const reverseRes = await reverseGeocodeCoords(coords.latitude, coords.longitude);
    if (reverseRes.success && reverseRes.data) {
      return {
        success: true,
        source: tierSource,
        data: {
          ...reverseRes.data,
          source: tierSource,
        },
      };
    }

    // Even if reverse geocoding was partial, return the coordinates
    return {
      success: true,
      source: tierSource,
      data: createNormalizedAddress({
        latitude: coords.latitude,
        longitude: coords.longitude,
        source: tierSource,
      }),
    };
  }

  return {
    success: false,
    error: 'Unable to detect location from GPS or network. Please enter address manually.',
  };
}
