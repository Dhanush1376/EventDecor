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

    // 1. Primary: Nominatim with compliant User-Agent
    try {
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

      if (osmRes.ok) {
        const osmData: any = await osmRes.json();
        if (osmData && osmData.address) {
          const a = osmData.address;
          const displayParts = (osmData.display_name || '').split(',');

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

          const poi =
            a.amenity ||
            a.shop ||
            a.tourism ||
            a.building ||
            a.landmark ||
            (osmData.name && osmData.name !== a.road && !isGenericTag(osmData.name)
              ? osmData.name
              : '');
          const landmark = poi
            ? poi.match(/^(near|opp|opposite|behind|beside)\s/i)
              ? poi
              : `Near ${poi}`
            : '';

          const streetParts = [
            a.house_number,
            a.house_name,
            a.building && !isGenericTag(a.building) ? a.building : '',
            a.road || a.street,
          ].filter(Boolean);

          const address =
            streetParts.length > 0
              ? Array.from(new Set(streetParts)).join(', ')
              : displayParts.length > 3
                ? displayParts.slice(0, 3).join(',').trim()
                : osmData.display_name || '';

          const locality =
            a.suburb || a.neighbourhood || a.residential || a.subdistrict || a.locality || '';
          const city = a.city || a.town || a.village || a.municipality || a.county || '';
          const district = a.county || a.state_district || city || '';
          const state = a.state || '';
          const pincode = (a.postcode || '').replace(/\D/g, '').slice(0, 6);

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
            country: a.country || 'India',
            source: 'nominatim',
          };
        }
      }
    } catch (nominatimErr: any) {
      logger.warn(`[Location] Nominatim lookup failed: ${nominatimErr.message}`);
    }

    // 2. Fallback: Photon API by Komoot (CORS-friendly, open OSM index)
    if (!resolvedAddress || (!resolvedAddress.pincode && !resolvedAddress.city)) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        const photonRes = await fetch(`https://photon.komoot.io/reverse?lat=${lat}&lon=${lng}`, {
          signal: controller.signal,
          headers: { Accept: 'application/json' },
        });
        clearTimeout(timeout);

        if (photonRes.ok) {
          const pData: any = await photonRes.json();
          const props = pData?.features?.[0]?.properties;
          if (props) {
            const pName = props.name || '';
            const pStreet = props.street || '';
            const pLocality = props.locality || props.district || '';
            const pCity = props.city || props.county || '';
            const pState = props.state || '';
            const pPincode = (props.postcode || '').replace(/\D/g, '').slice(0, 6);

            const addrLine =
              [pName !== pStreet ? pName : '', pStreet].filter(Boolean).join(', ') || pLocality;

            resolvedAddress = {
              latitude: lat,
              longitude: lng,
              address: resolvedAddress?.address || addrLine,
              locality: resolvedAddress?.locality || pLocality,
              landmark:
                resolvedAddress?.landmark || (pName && pName !== pStreet ? `Near ${pName}` : ''),
              city: resolvedAddress?.city || pCity,
              district: resolvedAddress?.district || props.district || pCity,
              state: resolvedAddress?.state || pState,
              pincode: resolvedAddress?.pincode || pPincode,
              country: props.country || 'India',
              source: 'photon',
            };
          }
        }
      } catch (photonErr: any) {
        logger.warn(`[Location] Photon lookup failed: ${photonErr.message}`);
      }
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
    const q = ((req.query.q as string) || '').trim();
    if (!q || q.length < 1) {
      return res.json({ success: true, data: [] });
    }

    const cacheKey = `search:${q.toLowerCase()}`;
    const cached = geocodeCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return res.json({ success: true, source: 'cache', data: cached.data });
    }

    let results: any[] = [];

    // 1. Primary: Nominatim with compliant User-Agent
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);
      const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&addressdetails=1&countrycodes=in&limit=15`;
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

      if (osmRes.ok) {
        const osmData: any = await osmRes.json();
        if (Array.isArray(osmData) && osmData.length > 0) {
          results = osmData.map((item: any) => {
            const addr = item.address || {};
            const street = addr.road || addr.suburb || addr.neighbourhood || '';
            const city = addr.city || addr.town || addr.village || addr.county || '';
            const state = addr.state || '';
            const pincode = (addr.postcode || '').replace(/\D/g, '').slice(0, 6);
            const name =
              item.name || addr.amenity || addr.building || street || 'Selected Location';

            return {
              displayName: item.display_name,
              name,
              lat: parseFloat(item.lat),
              lon: parseFloat(item.lon),
              address: {
                road: street,
                city,
                state,
                pincode,
                country: addr.country || 'India',
              },
            };
          });
        }
      }
    } catch (osmErr: any) {
      logger.warn(`[Location Search] Nominatim search failed: ${osmErr.message}`);
    }

    // 2. Fallback: Photon (Komoot)
    if (results.length === 0) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 4000);
        const photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=15`;
        const photonRes = await fetch(photonUrl, {
          signal: controller.signal,
          headers: { Accept: 'application/json' },
        });
        clearTimeout(timeout);

        if (photonRes.ok) {
          const photonData: any = await photonRes.json();
          if (Array.isArray(photonData.features) && photonData.features.length > 0) {
            results = photonData.features.map((feat: any) => {
              const p = feat.properties || {};
              const coords = feat.geometry?.coordinates || [0, 0];
              const parts = [p.name, p.street, p.district, p.city, p.state, p.country].filter(
                Boolean,
              );
              return {
                displayName: parts.join(', '),
                name: p.name || p.street || 'Selected Location',
                lat: coords[1],
                lon: coords[0],
                address: {
                  road: p.street || '',
                  city: p.city || p.district || '',
                  state: p.state || '',
                  pincode: (p.postcode || '').replace(/\D/g, '').slice(0, 6),
                  country: p.country || 'India',
                },
              };
            });
          }
        }
      } catch (photonErr: any) {
        logger.warn(`[Location Search] Photon search failed: ${photonErr.message}`);
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
