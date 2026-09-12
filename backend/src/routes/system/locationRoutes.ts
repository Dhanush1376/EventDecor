import { Router, Request, Response } from 'express';
import asyncHandler from '../../utils/asyncHandler';
import logger from '../../config/logger';

const router = Router();

interface CacheEntry {
  data: any;
  timestamp: number;
}

// In-memory cache with 15-minute TTL for reverse geocode lookups
const geocodeCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 15 * 60 * 1000;

function getCacheKey(lat: number, lon: number): string {
  // Round to ~11 meters precision (4 decimal places)
  return `${lat.toFixed(4)},${lon.toFixed(4)}`;
}

function cleanCityName(raw: string): string {
  if (!raw || typeof raw !== 'string') return '';
  return raw.replace(/\s+(Tahsil|Tehsil|Taluk|Taluka|Mandal|Sub-district|District)\b/gi, '').trim();
}

function synthesizeLandmark(poiName: string, locality: string, street: string): string {
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
 * Public Reverse Geocoding Endpoint
 * GET /api/v1/location/reverse-geocode?lat=17.385044&lng=78.486671
 *
 * Employs server-side User-Agent to comply with OpenStreetMap Nominatim policies,
 * with resilient fallbacks to Photon (Komoot) and BigDataCloud + postalpincode.in enrichment.
 */
router.get(
  '/reverse-geocode',
  asyncHandler(async (req: Request, res: Response) => {
    const lat = parseFloat(req.query.lat as string);
    const lng = parseFloat(req.query.lng as string);

    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return res.status(400).json({
        success: false,
        message: 'Valid latitude (-90 to 90) and longitude (-180 to 180) are required',
      });
    }

    const cacheKey = getCacheKey(lat, lng);
    const cached = geocodeCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return res.json({ success: true, source: 'cache', data: cached.data });
    }

    let resolvedAddress: any = null;

    // 1. Query Nominatim & Photon in parallel for rich street, POI, and administrative data
    try {
      const [osmSettled, photonSettled] = await Promise.allSettled([
        (async () => {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 5000);
          const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1&zoom=18`;
          const osmRes = await fetch(nominatimUrl, {
            signal: controller.signal,
            headers: {
              'User-Agent':
                'SiriArtsAndCrafts/1.0 (https://siriartsandcrafts.com; contact: info@siriartsandcrafts.com)',
              Accept: 'application/json',
              'Accept-Language': 'en',
            },
          });
          clearTimeout(timeout);
          return osmRes.ok ? await osmRes.json() : null;
        })(),
        (async () => {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 5000);
          const photonRes = await fetch(
            `https://photon.komoot.io/reverse?lat=${lat}&lon=${lng}&limit=5`,
            {
              signal: controller.signal,
              headers: { Accept: 'application/json' },
            },
          );
          clearTimeout(timeout);
          return photonRes.ok ? await photonRes.json() : null;
        })(),
      ]);

      const osmData: any = osmSettled.status === 'fulfilled' ? osmSettled.value : null;
      const photonData: any = photonSettled.status === 'fulfilled' ? photonSettled.value : null;

      const a = osmData?.address || {};
      const props = photonData?.features?.[0]?.properties || {};

      const isGenericTag = (val: any) => {
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

      const street = props.street || a.road || a.street || '';
      const building =
        (props.name && props.name !== props.street ? props.name : '') ||
        (a.building && !isGenericTag(a.building) ? a.building : '') ||
        (a.amenity && !isGenericTag(a.amenity) ? a.amenity : '') ||
        (a.shop && !isGenericTag(a.shop) ? a.shop : '') ||
        (a.tourism && !isGenericTag(a.tourism) ? a.tourism : '') ||
        a.house_name ||
        '';
      const housenumber = a.house_number || props.housenumber || '';
      const locality =
        a.residential ||
        a.suburb ||
        a.neighbourhood ||
        props.locality ||
        props.district ||
        a.subdistrict ||
        a.locality ||
        '';

      const landmark = synthesizeLandmark(building, locality, street);

      const addressParts = [housenumber, building, street, locality].filter(Boolean);
      const address =
        addressParts.length > 0
          ? Array.from(new Set(addressParts)).join(', ')
          : osmData?.display_name || '';

      const rawCity =
        a.city || a.town || a.village || props.city || a.municipality || a.county || '';
      const city = cleanCityName(rawCity);
      const district = cleanCityName(a.county || a.state_district || props.district || city);
      const state = a.state || props.state || '';
      const pincode = (a.postcode || props.postcode || '').replace(/\D/g, '').slice(0, 6);

      if (city || pincode || address) {
        resolvedAddress = {
          latitude: lat,
          longitude: lng,
          address,
          locality,
          landmark,
          city,
          district,
          state,
          pincode,
          country: a.country || props.country || 'India',
          source: 'hybrid-osm-photon',
        };
      }
    } catch (hybridErr: any) {
      logger.warn(`[Location] Hybrid geocode failed: ${hybridErr.message}`);
    }

    // 3. Fallback: BigDataCloud Client API
    if (!resolvedAddress || (!resolvedAddress.city && !resolvedAddress.pincode)) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        const bdcRes = await fetch(
          `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`,
          { signal: controller.signal, headers: { Accept: 'application/json' } },
        );
        clearTimeout(timeout);

        if (bdcRes.ok) {
          const bdcData: any = await bdcRes.json();
          if (bdcData) {
            const bdcCity = bdcData.city || bdcData.locality || '';
            const bdcLocality = bdcData.locality || bdcData.principalSubdivision || '';
            const bdcState = bdcData.principalSubdivision || '';
            const bdcPincode = (bdcData.postcode || '').replace(/\D/g, '').slice(0, 6);

            resolvedAddress = {
              latitude: lat,
              longitude: lng,
              address:
                resolvedAddress?.address || (bdcLocality ? `${bdcLocality}, ${bdcCity}` : bdcCity),
              locality: resolvedAddress?.locality || bdcLocality,
              landmark: resolvedAddress?.landmark || '',
              city: resolvedAddress?.city || bdcCity,
              district: resolvedAddress?.district || bdcCity,
              state: resolvedAddress?.state || bdcState,
              pincode: resolvedAddress?.pincode || bdcPincode,
              country: bdcData.countryName || 'India',
              source: 'bigdatacloud',
            };
          }
        }
      } catch (bdcErr: any) {
        logger.warn(`[Location] BigDataCloud lookup failed: ${bdcErr.message}`);
      }
    }

    // 4. Postal Pincode enrichment if pincode is present and city or state need completion
    if (resolvedAddress?.pincode && (!resolvedAddress.city || !resolvedAddress.state)) {
      try {
        const pinRes = await fetch(
          `https://api.postalpincode.in/pincode/${resolvedAddress.pincode}`,
        );
        if (pinRes.ok) {
          const pinData: any = await pinRes.json();
          if (
            Array.isArray(pinData) &&
            pinData[0]?.Status === 'Success' &&
            pinData[0].PostOffice?.length > 0
          ) {
            const po = pinData[0].PostOffice[0];
            resolvedAddress.city = resolvedAddress.city || po.District || po.Block || po.Region;
            resolvedAddress.district = resolvedAddress.district || po.District;
            resolvedAddress.state = resolvedAddress.state || po.State;
            resolvedAddress.locality = resolvedAddress.locality || po.Name;
          }
        }
      } catch (pinErr: any) {
        logger.warn(`[Location] Pincode enrichment failed: ${pinErr.message}`);
      }
    }

    if (resolvedAddress) {
      geocodeCache.set(cacheKey, { data: resolvedAddress, timestamp: Date.now() });
      if (geocodeCache.size > 2000) {
        const firstKey = geocodeCache.keys().next().value;
        if (firstKey) geocodeCache.delete(firstKey);
      }

      return res.json({
        success: true,
        data: resolvedAddress,
      });
    }

    return res.status(404).json({
      success: false,
      message: 'Unable to resolve address details for these coordinates',
    });
  }),
);

/**
 * Public IP Geolocation Fallback Endpoint
 * GET /api/v1/location/ip
 */
router.get(
  '/ip',
  asyncHandler(async (req: Request, res: Response) => {
    const rawIp =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.socket.remoteAddress ||
      '';
    const isLocal =
      !rawIp ||
      rawIp === '127.0.0.1' ||
      rawIp === '::1' ||
      rawIp.startsWith('192.168.') ||
      rawIp.startsWith('10.') ||
      rawIp === '::ffff:127.0.0.1';
    const queryIp = isLocal ? '' : rawIp;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);
      const url = queryIp ? `https://ipwho.is/${queryIp}` : 'https://ipwho.is/';
      const ipRes = await fetch(url, {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      });
      clearTimeout(timeout);

      if (ipRes.ok) {
        const d: any = await ipRes.json();
        if (d && d.success && typeof d.latitude === 'number' && typeof d.longitude === 'number') {
          return res.json({
            success: true,
            data: {
              latitude: d.latitude,
              longitude: d.longitude,
              city: d.city || '',
              district: d.city || '',
              state: d.region || '',
              pincode: (d.postal || '').replace(/\D/g, '').slice(0, 6),
              country: d.country || 'India',
              source: 'network-ip',
            },
          });
        }
      }
    } catch (err: any) {
      logger.warn(`[Location IP] ipwho.is failed: ${err.message}`);
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);
      const url = queryIp
        ? `https://freeipapi.com/api/json/${queryIp}`
        : 'https://freeipapi.com/api/json';
      const freeRes = await fetch(url, {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      });
      clearTimeout(timeout);

      if (freeRes.ok) {
        const d: any = await freeRes.json();
        if (d && typeof d.latitude === 'number' && typeof d.longitude === 'number') {
          return res.json({
            success: true,
            data: {
              latitude: d.latitude,
              longitude: d.longitude,
              city: d.cityName || '',
              district: d.cityName || '',
              state: d.regionName || '',
              pincode: (d.zipCode || '').replace(/\D/g, '').slice(0, 6),
              country: d.countryName || 'India',
              source: 'network-ip',
            },
          });
        }
      }
    } catch (err: any) {
      logger.warn(`[Location IP] freeipapi failed: ${err.message}`);
    }

    return res.status(404).json({
      success: false,
      message: 'Unable to detect location from IP',
    });
  }),
);

/**
 * Public Location Search / Autocomplete Endpoint
 * GET /api/v1/location/search?q=Ongole
 *
 * Employs server-side User-Agent to comply with OpenStreetMap Nominatim policies,
 * with resilient fallback to Photon (Komoot).
 */
router.get(
  '/search',
  asyncHandler(async (req: Request, res: Response) => {
    const rawQ = ((req.query.q as string) || '').trim();
    if (!rawQ || rawQ.length < 1) {
      return res.json({ success: true, data: [] });
    }

    const biasLat = parseFloat(req.query.lat as string) || 20.5937;
    const biasLon = parseFloat(req.query.lon as string) || 78.9629;

    const cacheKey = `search:${rawQ.toLowerCase()}:${biasLat.toFixed(2)}:${biasLon.toFixed(2)}`;
    const cached = geocodeCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return res.json({ success: true, source: 'cache', data: cached.data });
    }

    // 1. Direct Postal Pincode Lookup if 6-digit Indian PIN
    const cleanPin = rawQ.replace(/\D/g, '');
    if (/^\d{6}$/.test(rawQ.trim()) || (cleanPin.length === 6 && rawQ.length <= 8)) {
      try {
        const pinController = new AbortController();
        const pinTimeout = setTimeout(() => pinController.abort(), 4000);
        const pinRes = await fetch(`https://api.postalpincode.in/pincode/${cleanPin}`, {
          signal: pinController.signal,
        });
        clearTimeout(pinTimeout);

        if (pinRes.ok) {
          const pinData: any = await pinRes.json();
          if (
            Array.isArray(pinData) &&
            pinData[0]?.Status === 'Success' &&
            Array.isArray(pinData[0].PostOffice) &&
            pinData[0].PostOffice.length > 0
          ) {
            const pinResults = pinData[0].PostOffice.map((po: any) => {
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

            geocodeCache.set(cacheKey, { data: pinResults, timestamp: Date.now() });
            return res.json({ success: true, source: 'postal-pincode', data: pinResults });
          }
        }
      } catch (pinErr: any) {
        logger.warn(`[Location Search] Pincode lookup failed: ${pinErr.message}`);
      }
    }

    // 2. Multi-Tier Hybrid Search (Parallel Nominatim IN + Photon India-biased)
    const executeSearch = async (queryText: string) => {
      const [osmSettled, photonSettled] = await Promise.allSettled([
        (async () => {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 4000);
          const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
            queryText,
          )}&addressdetails=1&countrycodes=in&limit=15`;
          const osmRes = await fetch(nominatimUrl, {
            signal: controller.signal,
            headers: {
              'User-Agent':
                'SiriArtsAndCrafts/1.0 (https://siriartsandcrafts.com; contact: info@siriartsandcrafts.com)',
              Accept: 'application/json',
              'Accept-Language': 'en',
            },
          });
          clearTimeout(timeout);
          return osmRes.ok ? await osmRes.json() : [];
        })(),
        (async () => {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 4000);
          const photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(
            queryText,
          )}&lat=${biasLat}&lon=${biasLon}&limit=20`;
          const photonRes = await fetch(photonUrl, {
            signal: controller.signal,
            headers: { Accept: 'application/json' },
          });
          clearTimeout(timeout);
          return photonRes.ok ? await photonRes.json() : { features: [] };
        })(),
      ]);

      const osmData: any[] =
        osmSettled.status === 'fulfilled' && Array.isArray(osmSettled.value)
          ? osmSettled.value
          : [];
      const photonData: any[] =
        photonSettled.status === 'fulfilled' &&
        Array.isArray((photonSettled.value as any)?.features)
          ? (photonSettled.value as any).features
          : [];

      const aggregated: any[] = [];
      const seen = new Set<string>();

      // A. Process Nominatim results (already constrained to countrycodes=in)
      for (const item of osmData) {
        const addr = item.address || {};
        const street = addr.road || addr.street || '';
        const locality = addr.suburb || addr.neighbourhood || addr.residential || '';
        const city = cleanCityName(addr.city || addr.town || addr.village || addr.county || '');
        const state = addr.state || '';
        const pincode = (addr.postcode || '').replace(/\D/g, '').slice(0, 6);
        const building =
          item.name && item.name !== street ? item.name : addr.building || addr.amenity || '';
        const name = item.name || building || street || locality || 'Selected Location';
        const landmark = synthesizeLandmark(building, locality, street);

        const key = `${name.toLowerCase()}|${city.toLowerCase()}|${state.toLowerCase()}`;
        if (!seen.has(key)) {
          seen.add(key);
          aggregated.push({
            displayName: item.display_name,
            name,
            lat: parseFloat(item.lat),
            lon: parseFloat(item.lon),
            address: {
              building,
              road: street,
              locality,
              landmark,
              city,
              state,
              pincode,
              country: addr.country || 'India',
            },
          });
        }
      }

      // B. Process Photon results (strictly filter to India bounds and country)
      for (const feat of photonData) {
        const p = feat.properties || {};
        const [fLon, fLat] = feat.geometry?.coordinates || [0, 0];
        const isIndiaCountry =
          (p.country && p.country.toLowerCase() === 'india') ||
          (p.countrycode && p.countrycode.toLowerCase() === 'in');
        const inIndiaBox = fLat >= 6.5 && fLat <= 37.5 && fLon >= 68.0 && fLon <= 97.5;

        // Strictly eliminate non-India results
        if (!isIndiaCountry && !inIndiaBox) continue;

        const street = p.street || '';
        const building = p.name && p.name !== street ? p.name : '';
        const locality = p.locality || p.district || '';
        const city = cleanCityName(p.city || p.district || '');
        const state = p.state || '';
        const pincode = (p.postcode || '').replace(/\D/g, '').slice(0, 6);
        const name = p.name || street || locality || 'Selected Location';
        const landmark = synthesizeLandmark(building, locality, street);

        const key = `${name.toLowerCase()}|${city.toLowerCase()}|${state.toLowerCase()}`;
        if (!seen.has(key)) {
          seen.add(key);
          const parts = [building, street, locality, city, state, 'India'].filter(Boolean);
          aggregated.push({
            displayName: Array.from(new Set(parts)).join(', '),
            name,
            lat: fLat,
            lon: fLon,
            address: {
              building,
              road: street,
              locality,
              landmark,
              city,
              state,
              pincode,
              country: p.country || 'India',
            },
          });
        }
      }

      return aggregated;
    };

    let results = await executeSearch(rawQ);

    // 3. Typo-Tolerant Fallback: If 0 results, retry with cleaned repeated trailing characters
    if (results.length === 0) {
      const cleanedTypo = rawQ.replace(/([a-z])\1+$/i, '$1');
      if (cleanedTypo !== rawQ && cleanedTypo.length >= 2) {
        results = await executeSearch(cleanedTypo);
      }
    }

    if (results.length > 0) {
      geocodeCache.set(cacheKey, { data: results, timestamp: Date.now() });
      if (geocodeCache.size > 2000) {
        const firstKey = geocodeCache.keys().next().value;
        if (firstKey) geocodeCache.delete(firstKey);
      }
    }

    return res.json({ success: true, data: results });
  }),
);

export default router;
