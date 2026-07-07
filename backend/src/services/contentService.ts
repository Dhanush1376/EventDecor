import ContentSection from '../models/ContentSection';

import ApiError from '../utils/ApiError';
import { cmsCache } from '../utils/cache/MemoryCache';
import { bumpPublicCacheVersion } from '../utils/cache/cacheVersion';
import { invalidateSafetyLockCache } from '../utils/cache/safetyLockCache';

const SENSITIVE_STUDIO_SETTINGS_KEYS = ['razorpaySecret', 'razorpayKeySecret'] as const;
const ADMIN_ONLY_SECTION_KEYS = new Set(['studio_settings']);

export const sanitizeStudioSettings = (data: Record<string, unknown> | null | undefined) => {
  if (!data || typeof data !== 'object') return data;
  const sanitized = { ...data };
  for (const key of SENSITIVE_STUDIO_SETTINGS_KEYS) {
    delete sanitized[key];
  }
  return sanitized;
};

const stripSensitiveFromSectionData = (key: string, data: any) => {
  if (key === 'studio_settings') {
    return sanitizeStudioSettings(data);
  }
  return data;
};

export const sanitizeArray = (val: any): any => {
  if (val === null || val === undefined) return val;
  if (val instanceof Date) return val;

  if (typeof val === 'object') {
    if (Array.isArray(val)) {
      return val.map((v) => sanitizeArray(v));
    }

    const keys = Object.keys(val);
    const isArrayLike =
      keys.length > 0 &&
      keys.includes('0') &&
      keys.every((k) => !isNaN(Number(k)) && Number.isInteger(Number(k)));

    if (isArrayLike) {
      const arr: any[] = [];
      let i = 0;
      while (i.toString() in val) {
        arr.push(sanitizeArray(val[i.toString()]));
        i++;
      }
      return arr;
    } else {
      const obj: any = {};
      for (const k of keys) {
        obj[k] = sanitizeArray(val[k]);
      }
      return obj;
    }
  }
  return val;
};

class ContentService {
  static isAdminOnlySection(key: string): boolean {
    return ADMIN_ONLY_SECTION_KEYS.has(key);
  }

  static async getPublishedContent() {
    const cacheKey = 'cms:published:flat';
    return cmsCache.getOrSet(
      cacheKey,
      async () => {
        const sections = await ContentSection.find({ status: 'published' })
          .select('sectionKey data')
          .lean();
        const flatContent: Record<string, unknown> = {};
        sections.forEach((section) => {
          if (ADMIN_ONLY_SECTION_KEYS.has(section.sectionKey)) return;
          flatContent[section.sectionKey] = sanitizeArray(
            stripSensitiveFromSectionData(section.sectionKey, section.data),
          );
        });
        return flatContent;
      },
      10 * 60 * 1000,
    );
  }

  static async getSectionByKey(key: string) {
    let section = await ContentSection.findOne({ sectionKey: key });
    if (!section) {
      const defaultData: { [key: string]: any } = {
        admin_safety_lock: { safetyLock: false },
        admin_idle_timeout: { idleTimeout: 15 },
        admin_theme_mode: { themeMode: 'dark' },
        studio_settings: {
          businessName: 'Siri Arts & Crafts',
          tagline: '',
          businessEmail: 'Sirisha.atmakuri@gmail.com',
          phoneNumber: '+91 98660 06648',
          gstNumber: 'GSTIN123456789',
          address: '#28-1-92, South Street, ONGOLE-523001, Prakasam District, Andhra Pradesh',
          primaryColor: '#735c00',
          secondaryColor: '#F8F9FB',
          fontFamily: 'Playfair Display + Inter',
          freeShippingThreshold: '2000',
          standardShippingFee: '99',
          expressShippingFee: '249',
          codFee: '90',
          deliveryEstimate: '5-7',
          razorpayKeyId: '',
          upiId: 'siriarts@upi',
          whatsappNumber: '+91 98660 06648',
          whatsappMessage: 'Hello! Thank you for reaching Siri Arts & Crafts.',
        },
        custom_categories: {
          products: [
            {
              id: 'p1',
              name: 'Traditional Return Gifts',
              count: 24,
              image: '',
              active: true,
              description: 'Bespoke brass tambulam bowls and handcrafted shagun packaging.',
            },
            {
              id: 'p2',
              name: 'Engagement Ring Trays',
              count: 18,
              image: '',
              active: true,
              description: 'Pearl beaded trays and custom carved wooden initials.',
            },
            {
              id: 'p3',
              name: 'Carved Coconuts & Shagun',
              count: 12,
              image: '',
              active: true,
              description: 'Artisanal hand-painted coconuts for traditional ceremonies.',
            },
            {
              id: 'p4',
              name: 'Customized Gift Hampers',
              count: 30,
              image: '',
              active: true,
              description: 'Velvet presentation hampers with South Indian sweet boxes.',
            },
          ],
          events: [
            {
              id: 'e1',
              name: 'Telugu Heritage (Pellikuthuru)',
              count: 8,
              image: '',
              active: true,
              description: 'Royal Mysore brass urlis, marigold strings, and wooden carved seats.',
            },
            {
              id: 'e2',
              name: 'Engagement Gift Setup',
              count: 15,
              image: '',
              active: true,
              description: 'Side-stage gift presentation pedestals and LED uplighting.',
            },
            {
              id: 'e3',
              name: 'Ring Ceremony Showcases',
              count: 10,
              image: '',
              active: true,
              description: 'Gold-leaf backdrop rings and velvet pedestal arrangements.',
            },
            {
              id: 'e4',
              name: 'Tambulam & Shagun Counter',
              count: 20,
              image: '',
              active: true,
              description: 'Royal wooden shelving with fresh jasmine runners.',
            },
          ],
        },
      };

      if (defaultData[key] !== undefined) {
        section = new ContentSection({
          sectionKey: key,
          data: defaultData[key],
          status: 'published',
        });
        await section.save();
      } else {
        throw new ApiError(404, `Section ${key} not found`);
      }
    }
    if (section) {
      if (key === 'studio_settings') {
        section.data = stripSensitiveFromSectionData(key, section.data) as typeof section.data;
      }
      section.data = sanitizeArray(section.data);
    }
    return section;
  }

  static async updateSection(key: string, newData: any, retry = 0): Promise<any> {
    let payload = key === 'studio_settings' ? sanitizeStudioSettings(newData) : newData;
    payload = sanitizeArray(payload);
    try {
      let section = await ContentSection.findOne({ sectionKey: key });

      if (section) {
        // Store current data in revision history
        section.revisionHistory.push({
          previousData: section.data,
          modifiedAt: new Date(),
        });

        // Limit revision history to last 10 versions
        if (section.revisionHistory.length > 10) {
          section.revisionHistory.shift();
        }

        section.data = payload;
        section.lastModified = new Date();
        section.status = 'published'; // Always publish on update/save from admin
        section.markModified('data');
        await section.save();
      } else {
        section = new ContentSection({
          sectionKey: key,
          data: payload,
          status: 'published', // Always publish on update/save from admin
        });
        await section.save();
      }

      // Invalidate MemoryCache to ensure immediate sync
      cmsCache.delete(`cms:content:${key}`);
      cmsCache.delete('cms:all_sections');
      cmsCache.delete('cms:published:flat');
      cmsCache.delete(key); // Just in case cache key is set without prefix (like 'studio_settings')
      if (key === 'admin_safety_lock') {
        await invalidateSafetyLockCache();
      }
      await bumpPublicCacheVersion();

      return section;
    } catch (err: any) {
      if (err.name === 'VersionError' && retry < 3) {
        return this.updateSection(key, newData, retry + 1);
      }
      throw err;
    }
  }

  static async publishAll() {
    const result = await ContentSection.updateMany(
      { status: 'draft' },
      { $set: { status: 'published' } },
    );

    cmsCache.clear();
    await bumpPublicCacheVersion();

    return result;
  }
}

export default ContentService;
