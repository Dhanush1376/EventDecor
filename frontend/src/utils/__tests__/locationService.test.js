import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { reverseGeocodeCoords, detectAndResolveAddress } from '../locationService';

describe('locationService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  describe('reverseGeocodeCoords', () => {
    it('returns normalized address when Nominatim succeeds', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: async () => ({
            display_name: 'MG Road, Ashok Nagar, Bengaluru, Karnataka, 560001, India',
            address: {
              road: 'MG Road',
              suburb: 'Ashok Nagar',
              city: 'Bengaluru',
              state: 'Karnataka',
              postcode: '560001',
              country: 'India',
            },
          }),
        }),
      );

      const res = await reverseGeocodeCoords(12.9716, 77.5946);
      expect(res.success).toBe(true);
      expect(res.data.city).toBe('Bengaluru');
      expect(res.data.state).toBe('Karnataka');
      expect(res.data.pincode).toBe('560001');
      expect(res.data.locality).toBe('Ashok Nagar');
      expect(res.data.address).toContain('MG Road');
    });

    it('extracts landmark and street address when amenity/POI is detected', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: async () => ({
            name: 'Central Library',
            display_name:
              'Central Library, Chiheru Khusropur Link Road, Phagwara Tahsil, Kapurthala, Punjab, 144411, India',
            address: {
              amenity: 'Central Library',
              road: 'Chiheru Khusropur Link Road',
              subdistrict: 'Phagwara Tahsil',
              county: 'Kapurthala',
              state: 'Punjab',
              postcode: '144411',
              country: 'India',
            },
          }),
        }),
      );

      const res = await reverseGeocodeCoords(31.22, 75.77);
      expect(res.success).toBe(true);
      expect(res.data.landmark).toBe('Near Central Library');
      expect(res.data.address).toContain('Central Library');
      expect(res.data.address).toContain('Chiheru Khusropur Link Road');
      expect(res.data.state).toBe('Punjab');
      expect(res.data.pincode).toBe('144411');
    });

    it('falls back to BigDataCloud when Nominatim returns missing postcode/city', async () => {
      const mockFetch = vi.fn().mockImplementation(async (url) => {
        const urlStr = String(url || '');
        if (urlStr.includes('/api/v1/location/reverse-geocode')) {
          return { ok: false, status: 404 };
        }
        if (urlStr.includes('nominatim')) {
          return {
            ok: true,
            json: async () => ({
              display_name: 'Some rural field',
              address: {},
            }),
          };
        }
        if (urlStr.includes('photon')) {
          return { ok: false, status: 404 };
        }
        if (urlStr.includes('bigdatacloud')) {
          return {
            ok: true,
            json: async () => ({
              city: 'Mysuru',
              locality: 'Gokulam',
              principalSubdivision: 'Karnataka',
              postcode: '570002',
              countryName: 'India',
            }),
          };
        }
        return { ok: false };
      });

      vi.stubGlobal('fetch', mockFetch);

      const res = await reverseGeocodeCoords(12.3, 76.6);
      expect(res.success).toBe(true);
      expect(res.data.city).toBe('Mysuru');
      expect(res.data.state).toBe('Karnataka');
      expect(res.data.pincode).toBe('570002');
    });

    it('uses backend reverse geocoding when endpoint is available', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockImplementation(async (url) => {
          const urlStr = String(url || '');
          if (urlStr.includes('/api/v1/location/reverse-geocode')) {
            return {
              ok: true,
              json: async () => ({
                success: true,
                data: {
                  address: 'Koti Main Road',
                  city: 'Hyderabad',
                  state: 'Telangana',
                  pincode: '500095',
                },
              }),
            };
          }
          return { ok: false };
        }),
      );

      const res = await reverseGeocodeCoords(17.385, 78.4867);
      expect(res.success).toBe(true);
      expect(res.data.city).toBe('Hyderabad');
      expect(res.data.state).toBe('Telangana');
      expect(res.data.pincode).toBe('500095');
      expect(res.data.source).toBe('backend-geocode');
    });

    it('handles reverse geocoder network failure gracefully without crashing', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network offline')));

      const res = await reverseGeocodeCoords(12.9716, 77.5946);
      expect(res.success).toBe(false);
      expect(res.error).toBeDefined();
    });

    it('returns error for invalid coordinates', async () => {
      const res = await reverseGeocodeCoords('not-a-number', null);
      expect(res.success).toBe(false);
    });
  });

  describe('detectAndResolveAddress', () => {
    it('uses browser geolocation when Tier 1 succeeds', async () => {
      vi.stubGlobal('window', {
        isSecureContext: true,
        location: { hostname: 'example.com' },
      });

      vi.stubGlobal('navigator', {
        geolocation: {
          getCurrentPosition: vi.fn((success) => {
            success({
              coords: { latitude: 12.9716, longitude: 77.5946 },
            });
          }),
        },
      });

      // Mock reverse geocode fetch
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: async () => ({
            address: {
              city: 'Bengaluru',
              state: 'Karnataka',
              postcode: '560001',
            },
          }),
        }),
      );

      const res = await detectAndResolveAddress();
      expect(res.success).toBe(true);
      expect(res.source).toBe('gps');
      expect(res.data.city).toBe('Bengaluru');
    });

    it('falls back to IP geolocation when browser geolocation times out', async () => {
      vi.stubGlobal('window', {
        isSecureContext: true,
        location: { hostname: 'example.com' },
      });

      vi.stubGlobal('navigator', {
        geolocation: {
          getCurrentPosition: vi.fn((_success, error) => {
            const err = new Error('Timeout');
            err.code = 3; // TIMEOUT
            error(err);
          }),
        },
      });

      // Mock IP fallback (freeipapi) and subsequent reverse geocode
      const mockFetch = vi
        .fn()
        // freeipapi response
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            latitude: 17.385,
            longitude: 78.4867,
            cityName: 'Hyderabad',
            regionName: 'Telangana',
            zipCode: '500001',
            countryName: 'India',
          }),
        })
        // Nominatim reverse geocode
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            address: {
              city: 'Hyderabad',
              state: 'Telangana',
              postcode: '500001',
            },
          }),
        });

      vi.stubGlobal('fetch', mockFetch);

      const res = await detectAndResolveAddress();
      expect(res.success).toBe(true);
      expect(res.source).toBe('network');
      expect(res.data.city).toBe('Hyderabad');
      expect(res.data.state).toBe('Telangana');
    });

    it('falls back to IP geolocation when permission is denied or non-secure context', async () => {
      vi.stubGlobal('window', {
        isSecureContext: false,
        location: { hostname: '192.168.1.15' },
      });

      vi.stubGlobal('navigator', {
        geolocation: {
          getCurrentPosition: vi.fn(),
        },
      });

      const mockFetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            latitude: 13.0827,
            longitude: 80.2707,
            cityName: 'Chennai',
            regionName: 'Tamil Nadu',
            zipCode: '600001',
            countryName: 'India',
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            address: {
              city: 'Chennai',
              state: 'Tamil Nadu',
              postcode: '600001',
            },
          }),
        });

      vi.stubGlobal('fetch', mockFetch);

      const res = await detectAndResolveAddress();
      expect(res.success).toBe(true);
      expect(res.source).toBe('network');
      expect(res.data.city).toBe('Chennai');
    });

    it('handles total failure gracefully when both GPS and IP geolocation fail', async () => {
      vi.stubGlobal('window', {
        isSecureContext: false,
        location: { hostname: '192.168.1.15' },
      });
      vi.stubGlobal('navigator', {});

      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Offline')));

      const res = await detectAndResolveAddress();
      expect(res.success).toBe(false);
      expect(res.error).toBeDefined();
    });
  });
});
