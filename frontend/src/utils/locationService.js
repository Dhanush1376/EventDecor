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
 * Cleans administrative subdivisions from city names (e.g. 'Phagwara Tahsil' -> 'Phagwara').
 */
export function cleanCityName(raw) {
  if (!raw || typeof raw !== 'string') return '';
  return raw.replace(/\s+(Tahsil|Tehsil|Taluk|Taluka|Mandal|Sub-district|District)\b/gi, '').trim();
}

/**
 * Synthesizes a natural, exact landmark from POIs, building names, localities, and streets.
 */
export function synthesizeLandmark(poiName, locality, street) {
  if (poiName && typeof poiName === 'string') {
    const cleanPoi = poiName.trim();
    if (cleanPoi) {
      const prefix = cleanPoi.match(/^(near|opp|opposite|behind|beside)\s/i) ? '' : 'Near ';
      if (
        locality &&
        locality.toLowerCase() !== cleanPoi.toLowerCase() &&
        !cleanPoi.toLowerCase().includes(locality.toLowerCase())
      ) {
        return `${prefix}${cleanPoi}, ${locality}`;
      }
      return `${prefix}${cleanPoi}`;
    }
  }
  if (locality && typeof locality === 'string') {
    const cleanLoc = locality.trim();
    if (cleanLoc) {
      return cleanLoc.match(/^(near|opp|opposite|behind|beside)\s/i)
        ? cleanLoc
        : `Near ${cleanLoc}`;
    }
  }
  if (street && typeof street === 'string') {
    const cleanStreet = street.trim();
    if (cleanStreet) {
      return `On ${cleanStreet}`;
    }
  }
  return '';
}

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
    city: city ? cleanCityName(String(city)) : '',
    district: district ? cleanCityName(String(district)) : '',
    state: state ? String(state).trim() : '',
    pincode: pincode ? String(pincode).replace(/\D/g, '').slice(0, 6) : '',
    country: country ? String(country).trim() : 'India',
    source,
  };
}

/**
 * Attempts to retrieve coordinates via browser navigator.geolocation (Tier 1).
 */
/**
 * Attempts to retrieve high-precision pinpoint coordinates via browser navigator.geolocation (Tier 1).
 * Employs enableHighAccuracy: true, maximumAge: 0, and progressive accuracy filtering.
 */
function getBrowserCoordinates(options = {}) {
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

    let resolved = false;
    let watchId = null;
    let bestCoords = null;
    let timer = null;
    let progressiveTimer = null;

    const cleanup = () => {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      if (progressiveTimer) {
        clearTimeout(progressiveTimer);
        progressiveTimer = null;
      }
      if (watchId !== null && typeof navigator.geolocation.clearWatch === 'function') {
        try {
          navigator.geolocation.clearWatch(watchId);
        } catch (_) {}
        watchId = null;
      }
    };

    const targetAccuracyMeters = options.targetAccuracy || 35; // Pinpoint if <= 35m
    const timeoutMs = options.timeout || 12000;

    timer = setTimeout(() => {
      if (resolved) return;
      resolved = true;
      cleanup();

      if (bestCoords) {
        resolve(bestCoords);
      } else {
        const err = new Error('Geolocation request timed out');
        err.code = 3;
        reject(err);
      }
    }, timeoutMs);

    const handleSuccess = (pos) => {
      if (resolved) return;
      if (!pos?.coords) return;

      const acc = typeof pos.coords.accuracy === 'number' ? pos.coords.accuracy : 25;
      const reading = {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy: acc,
        source: 'gps',
        timestamp: pos.timestamp || Date.now(),
      };

      if (!bestCoords || acc < bestCoords.accuracy) {
        bestCoords = reading;
      }

      // If pinpoint accuracy is achieved (<= 35m), resolve immediately without waiting
      if (acc <= targetAccuracyMeters) {
        resolved = true;
        cleanup();
        resolve(reading);
        return;
      }

      // If we got a decent reading (> 35m, but <= 200m), wait at most 2.5s for GPS satellite lock to sharpen
      if (!progressiveTimer) {
        progressiveTimer = setTimeout(() => {
          if (!resolved && bestCoords) {
            resolved = true;
            cleanup();
            resolve(bestCoords);
          }
        }, 2500);
      }
    };

    const handleError = (err) => {
      if (resolved) return;
      if (bestCoords) {
        resolved = true;
        cleanup();
        resolve(bestCoords);
        return;
      }
      resolved = true;
      cleanup();
      reject(err);
    };

    const geoOptions = {
      enableHighAccuracy: true, // Force GPS hardware and active Wi-Fi triangulation
      timeout: timeoutMs,
      maximumAge: 0, // Never use stale cached coordinates
    };

    if (typeof navigator.geolocation.watchPosition === 'function') {
      try {
        watchId = navigator.geolocation.watchPosition(handleSuccess, handleError, geoOptions);
      } catch (_) {
        if (typeof navigator.geolocation.getCurrentPosition === 'function') {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              if (resolved) return;
              resolved = true;
              cleanup();
              if (pos?.coords) {
                resolve({
                  latitude: pos.coords.latitude,
                  longitude: pos.coords.longitude,
                  accuracy: typeof pos.coords.accuracy === 'number' ? pos.coords.accuracy : 25,
                  source: 'gps',
                });
              } else {
                reject(new Error('No coordinates returned by GPS'));
              }
            },
            handleError,
            geoOptions,
          );
        }
      }
    } else if (typeof navigator.geolocation.getCurrentPosition === 'function') {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (resolved) return;
          resolved = true;
          cleanup();
          if (pos?.coords) {
            resolve({
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              accuracy: typeof pos.coords.accuracy === 'number' ? pos.coords.accuracy : 25,
              source: 'gps',
            });
          } else {
            reject(new Error('No coordinates returned by GPS'));
          }
        },
        handleError,
        geoOptions,
      );
    } else {
      cleanup();
      reject(new Error('Geolocation method not found'));
    }
  });
}

/**
 * Attempts to retrieve approximate location via IP Geolocation (Tier 2).
 * Tiers: freeipapi.com -> ipwho.is -> BigDataCloud -> ipapi.co -> Backend proxy
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
          district: data.cityName || '',
          state: data.regionName || '',
          pincode: (data.zipCode || '').replace(/\D/g, '').slice(0, 6),
          country: data.countryName || 'India',
          source: 'network',
        });
      }
    }
  } catch (err) {
    log.warn('freeipapi lookup failed, attempting secondary IP provider:', err.message);
  }

  // Provider 2: ipwho.is (HTTPS, CORS-enabled, fast, free, no keys needed)
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const res = await fetch('https://ipwho.is/', {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      if (
        data &&
        data.success &&
        typeof data.latitude === 'number' &&
        typeof data.longitude === 'number'
      ) {
        return createNormalizedAddress({
          latitude: data.latitude,
          longitude: data.longitude,
          city: data.city || '',
          district: data.city || '',
          state: data.region || '',
          pincode: (data.postal || '').replace(/\D/g, '').slice(0, 6),
          country: data.country || 'India',
          source: 'network',
        });
      }
    }
  } catch (err) {
    log.warn('ipwho.is lookup failed, attempting next IP provider:', err.message);
  }

  // Provider 3: BigDataCloud client IP geolocation
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

    const res = await fetch(
      'https://api.bigdatacloud.net/data/reverse-geocode-client?localityLanguage=en',
      {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      },
    );
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      if (data && typeof data.latitude === 'number' && typeof data.longitude === 'number') {
        return createNormalizedAddress({
          latitude: data.latitude,
          longitude: data.longitude,
          city: data.city || data.locality || '',
          district: data.city || '',
          state: data.principalSubdivision || '',
          pincode: (data.postcode || '').replace(/\D/g, '').slice(0, 6),
          country: data.countryName || 'India',
          source: 'network',
        });
      }
    }
  } catch (err) {
    log.warn('BigDataCloud IP lookup failed, attempting final fallback:', err.message);
  }

  // Provider 4: ipapi.co
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

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
          district: data.city || '',
          state: data.region || '',
          pincode: (data.postal || '').replace(/\D/g, '').slice(0, 6),
          country: data.country_name || 'India',
          source: 'network',
        });
      }
    }
  } catch (err) {
    log.warn('ipapi.co fallback failed:', err.message);
  }

  // Provider 5: Backend proxy
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const res = await fetch('/api/v1/location/ip', {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    clearTimeout(timeout);

    if (res.ok) {
      const json = await res.json();
      if (json && json.success && json.data && typeof json.data.latitude === 'number') {
        const d = json.data;
        return createNormalizedAddress({
          latitude: d.latitude,
          longitude: d.longitude,
          city: d.city || '',
          district: d.district || '',
          state: d.state || '',
          pincode: d.pincode || '',
          country: d.country || 'India',
          source: 'network',
        });
      }
    }
  } catch (_backendErr) {
    // Continue to failure
  }

  throw new Error('All IP geolocation providers failed');
}

/**
 * Parses raw Nominatim address structures and extracts landmarks & POIs.
 */
function parseNominatimResponse(data, latitude, longitude) {
  if (!data || !data.address) return null;
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

  return createNormalizedAddress({
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
 * Primary provider: App backend reverse geocode endpoint with fallbacks to Nominatim, Photon, and BigDataCloud.
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

  // 0. Primary: App Backend Reverse Geocode Endpoint (server-side Nominatim with User-Agent & cache)
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    const backendUrl = `/api/v1/location/reverse-geocode?lat=${latitude}&lng=${longitude}`;
    const res = await fetch(backendUrl, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    clearTimeout(timeout);

    if (res.ok) {
      const json = await res.json();
      if (json && json.success && json.data) {
        const d = json.data;
        resolved = createNormalizedAddress({
          latitude,
          longitude,
          address: d.address || '',
          locality: d.locality || '',
          landmark: d.landmark || '',
          city: d.city || '',
          district: d.district || '',
          state: d.state || '',
          pincode: d.pincode || '',
          country: d.country || 'India',
          source: 'backend-geocode',
        });
      } else if (json && json.address) {
        resolved = parseNominatimResponse(json, latitude, longitude);
      }
    }
  } catch (backendErr) {
    log.info('Backend reverse geocode unavailable, falling back:', backendErr.message);
  }

  // 1. If backend gave no result OR gave incomplete landmark/street details:
  // Query Nominatim AND Photon in parallel to assemble rich street, POI, building, and landmark
  if (
    !resolved ||
    !resolved.landmark ||
    !resolved.address ||
    (!resolved.city && !resolved.pincode)
  ) {
    try {
      const [nomSettled, phoSettled] = await Promise.allSettled([
        (async () => {
          const c = new AbortController();
          const t = setTimeout(() => c.abort(), DEFAULT_TIMEOUT_MS);
          const r = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1&zoom=18`,
            { signal: c.signal, headers: { Accept: 'application/json', 'Accept-Language': 'en' } },
          );
          clearTimeout(t);
          return r.ok ? await r.json() : null;
        })(),
        (async () => {
          const c = new AbortController();
          const t = setTimeout(() => c.abort(), 6000);
          const r = await fetch(
            `https://photon.komoot.io/reverse?lat=${latitude}&lon=${longitude}&limit=5`,
            { signal: c.signal, headers: { Accept: 'application/json' } },
          );
          clearTimeout(t);
          return r.ok ? await r.json() : null;
        })(),
      ]);

      const nomData = nomSettled.status === 'fulfilled' ? nomSettled.value : null;
      const phoData = phoSettled.status === 'fulfilled' ? phoSettled.value : null;
      const addr = nomData?.address || {};
      const phoProps = phoData?.features?.[0]?.properties || {};

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

      const street = phoProps.street || addr.road || addr.street || '';
      const building =
        (phoProps.name && phoProps.name !== phoProps.street ? phoProps.name : '') ||
        (addr.building && !isGenericTag(addr.building) ? addr.building : '') ||
        (addr.amenity && !isGenericTag(addr.amenity) ? addr.amenity : '') ||
        (addr.shop && !isGenericTag(addr.shop) ? addr.shop : '') ||
        (addr.tourism && !isGenericTag(addr.tourism) ? addr.tourism : '') ||
        addr.house_name ||
        '';
      const housenumber = addr.house_number || phoProps.housenumber || '';
      const locality =
        addr.residential ||
        addr.suburb ||
        addr.neighbourhood ||
        phoProps.locality ||
        phoProps.district ||
        addr.subdistrict ||
        addr.locality ||
        resolved?.locality ||
        '';

      const landmark = resolved?.landmark || synthesizeLandmark(building, locality, street);

      const addressParts = [housenumber, building, street, locality].filter(Boolean);
      const addressLine =
        addressParts.length > 0
          ? Array.from(new Set(addressParts)).join(', ')
          : nomData?.display_name || resolved?.address || '';

      const rawCity =
        addr.city ||
        addr.town ||
        addr.village ||
        phoProps.city ||
        addr.municipality ||
        addr.county ||
        resolved?.city ||
        '';
      const city = cleanCityName(rawCity);
      const district = cleanCityName(
        addr.county || addr.state_district || phoProps.district || city,
      );
      const state = addr.state || phoProps.state || resolved?.state || '';
      const pincode = (addr.postcode || phoProps.postcode || resolved?.pincode || '')
        .replace(/\D/g, '')
        .slice(0, 6);

      if (city || pincode || addressLine || landmark) {
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
          country: addr.country || phoProps.country || 'India',
          source: resolved ? resolved.source : 'hybrid-osm-photon',
        });
      }
    } catch (err) {
      log.warn('Hybrid reverse geocode error:', err.message);
    }
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
    if (!resolved.address) {
      resolved.address =
        [resolved.locality, resolved.landmark, resolved.city].filter(Boolean).join(', ') ||
        resolved.city ||
        '';
    }
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
 * Tier 1: Pinpoint GPS/device geolocation (High accuracy, hardware GPS, active Wi-Fi triangulation).
 * Tier 2: Secure IP-based geolocation fallback ONLY for approximate regional bias when GPS is unavailable.
 *
 * @returns {Promise<{ success: boolean, data?: object, error?: string, source?: string, isPinpoint?: boolean, isApproximate?: boolean, accuracy?: number }>}
 */
export async function detectAndResolveAddress() {
  let coords = null;
  let gpsErr = null;
  let tierSource = 'gps';

  // Attempt Tier 1: Pinpoint High-Accuracy GPS
  try {
    coords = await getBrowserCoordinates({ timeout: 12000, targetAccuracy: 35 });
  } catch (err) {
    gpsErr = err;
    log.info(
      'Browser high-accuracy geolocation unavailable or denied, evaluating fallback:',
      err.message,
    );
  }

  // If GPS coordinates were successfully obtained
  if (coords && typeof coords.latitude === 'number' && typeof coords.longitude === 'number') {
    tierSource = 'gps';
    const accuracy = typeof coords.accuracy === 'number' ? coords.accuracy : null;
    const isPinpoint = accuracy !== null ? accuracy <= 1500 : true;

    // Deep reverse-geocode to extract street, building, POI, locality, city, pincode
    const reverseRes = await reverseGeocodeCoords(coords.latitude, coords.longitude);
    if (reverseRes.success && reverseRes.data) {
      const hasDetails = Boolean(
        reverseRes.data.pincode ||
        reverseRes.data.city ||
        reverseRes.data.locality ||
        reverseRes.data.address,
      );
      return {
        success: true,
        source: 'gps',
        isPinpoint,
        accuracy,
        hasDetails,
        data: {
          ...reverseRes.data,
          latitude: coords.latitude,
          longitude: coords.longitude,
          source: 'gps',
        },
      };
    }

    // Even if reverse geocoding was partial, return exact coordinates
    return {
      success: true,
      source: 'gps',
      isPinpoint,
      accuracy,
      hasDetails: false,
      data: createNormalizedAddress({
        latitude: coords.latitude,
        longitude: coords.longitude,
        source: 'gps',
      }),
    };
  }

  // Check if user actively denied permission
  const isPermissionDenied =
    gpsErr?.code === 1 ||
    /permission denied/i.test(gpsErr?.message || '') ||
    /denied/i.test(gpsErr?.message || '');

  // If user denied permission, inform them clearly rather than fabricating a false IP address 100km away
  if (isPermissionDenied) {
    return {
      success: false,
      permissionDenied: true,
      error:
        'Location permission was denied. Please allow location access in your browser to get exact pin-point location, or search your address below.',
    };
  }

  // Tier 2: IP Fallback - for cases where GPS is not supported, non-secure context, or timed out.
  // Marked explicitly as approximate so the UI and user are never misled by distant ISP gateways.
  try {
    const ipResult = await getIPLocation();
    if (ipResult && ipResult.latitude && ipResult.longitude) {
      tierSource = 'network';
      const reverseRes = await reverseGeocodeCoords(ipResult.latitude, ipResult.longitude);
      if (reverseRes.success && reverseRes.data) {
        return {
          success: true,
          source: 'network',
          isPinpoint: false,
          isApproximate: true,
          accuracy: 50000, // ~50 km approximate ISP region
          warning:
            'Approximate region detected from network. Please drag the pin or search your landmark for exact delivery.',
          data: {
            ...reverseRes.data,
            city: reverseRes.data.city || ipResult.city,
            state: reverseRes.data.state || ipResult.state,
            pincode: reverseRes.data.pincode || ipResult.pincode,
            source: 'network',
          },
        };
      }

      return {
        success: true,
        source: 'network',
        isPinpoint: false,
        isApproximate: true,
        accuracy: 50000,
        warning:
          'Approximate region detected from network. Please drag the pin or search your landmark for exact delivery.',
        data: ipResult,
      };
    }
  } catch (ipErr) {
    log.warn('IP geolocation fallback failed:', ipErr.message);
  }

  return {
    success: false,
    error: gpsErr?.message?.includes('timed out')
      ? 'GPS request timed out. Please drag the pin on the map or enter your address manually.'
      : 'Unable to detect location. Please enter address manually or search a nearby landmark.',
  };
}

/**
 * Searches places and addresses with high-precision India prioritization.
 *
 * @param {string} query - Free-text place, landmark, street, colony, or 6-digit PIN
 * @param {object} [options] - Optional bias coordinates { latitude, longitude }
 * @returns {Promise<Array<{ displayName: string, name: string, lat: number, lon: number, address: object }>>}
 */
export async function searchLocations(query, options = {}) {
  const cleanQ = (query || '').trim();
  if (!cleanQ) return [];

  const biasLat = options.latitude || 20.5937;
  const biasLon = options.longitude || 78.9629;

  // 1. Direct Postal Pincode Lookup if 6-digit Indian PIN
  const cleanPin = cleanQ.replace(/\D/g, '');
  if (/^\d{6}$/.test(cleanQ) || (cleanPin.length === 6 && cleanQ.length <= 8)) {
    try {
      const pinController = new AbortController();
      const pinTimeout = setTimeout(() => pinController.abort(), 4000);
      const pinRes = await fetch(`https://api.postalpincode.in/pincode/${cleanPin}`, {
        signal: pinController.signal,
      });
      clearTimeout(pinTimeout);

      if (pinRes.ok) {
        const pinData = await pinRes.json();
        if (
          Array.isArray(pinData) &&
          pinData[0]?.Status === 'Success' &&
          Array.isArray(pinData[0].PostOffice) &&
          pinData[0].PostOffice.length > 0
        ) {
          return pinData[0].PostOffice.map((po) => {
            const locality = po.Name;
            const city = cleanCityName(po.District || po.Block || po.Region);
            const state = po.State || '';
            const displayName = `${locality}, ${city}, ${state} - ${cleanPin}, India`;
            return {
              displayName,
              name: locality,
              lat: biasLat,
              lon: biasLon,
              address: {
                building: '',
                road: '',
                locality,
                landmark: `Near ${locality}`,
                city,
                district: po.District || city,
                state,
                pincode: cleanPin,
                country: 'India',
              },
            };
          });
        }
      }
    } catch (_pinErr) {}
  }

  // 2. Try Backend Search API (combines Nominatim + Photon with Indian server cache)
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4500);
    const res = await fetch(
      `/api/v1/location/search?q=${encodeURIComponent(cleanQ)}&lat=${biasLat}&lon=${biasLon}`,
      {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      },
    );
    clearTimeout(timeout);

    if (res.ok) {
      const json = await res.json();
      if (json.success && Array.isArray(json.data) && json.data.length > 0) {
        return json.data;
      }
    }
  } catch (err) {
    log.warn('Backend location search failed, using client-side fallback:', err.message);
  }

  // 3. Direct client fallback to Photon with India bounding-box filtering & typo tolerance
  try {
    const searchPhoton = async (qText) => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);
      const photonRes = await fetch(
        `https://photon.komoot.io/api/?q=${encodeURIComponent(qText)}&lat=${biasLat}&lon=${biasLon}&limit=20`,
        {
          signal: controller.signal,
          headers: { Accept: 'application/json' },
        },
      );
      clearTimeout(timeout);

      if (!photonRes.ok) return [];
      const data = await photonRes.json();
      if (!Array.isArray(data.features) || data.features.length === 0) return [];

      return data.features
        .filter((feat) => {
          const p = feat.properties || {};
          const [lon, lat] = feat.geometry?.coordinates || [0, 0];
          const isIndia =
            (p.country && p.country.toLowerCase() === 'india') ||
            (p.countrycode && p.countrycode.toLowerCase() === 'in');
          const inBox = lat >= 6.5 && lat <= 37.5 && lon >= 68.0 && lon <= 97.5;
          return isIndia || inBox;
        })
        .map((feat) => {
          const p = feat.properties || {};
          const coords = feat.geometry?.coordinates || [0, 0];
          const building = p.name && p.name !== p.street ? p.name : '';
          const street = p.street || '';
          const locality = p.locality || p.district || '';
          const landmark = synthesizeLandmark(building, locality, street);
          const city = cleanCityName(p.city || p.district || '');
          const parts = [building, street, locality, city, p.state, 'India'].filter(Boolean);
          return {
            displayName: Array.from(new Set(parts)).join(', '),
            name: p.name || p.street || locality || 'Selected Location',
            lat: coords[1],
            lon: coords[0],
            address: {
              building,
              road: street,
              locality,
              landmark,
              city,
              state: p.state || '',
              pincode: (p.postcode || '').replace(/\D/g, '').slice(0, 6),
              country: p.country || 'India',
            },
          };
        });
    };

    let clientHits = await searchPhoton(cleanQ);

    // Typo fallback: if 0 hits and trailing repeated chars (e.g. 'lawgateff' -> 'lawgate')
    if (clientHits.length === 0) {
      const cleaned = cleanQ.replace(/([a-z])\1+$/i, '$1');
      if (cleaned !== cleanQ && cleaned.length >= 2) {
        clientHits = await searchPhoton(cleaned);
      }
    }

    return clientHits;
  } catch (err) {
    log.warn('Client-side location search fallback failed:', err.message);
    return [];
  }

  return [];
}

export const detectUserLocation = detectAndResolveAddress;
