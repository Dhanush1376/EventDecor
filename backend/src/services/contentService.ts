import ContentSection, { IContentSection } from '../models/ContentSection';
import { PLACEHOLDER_IMAGES } from '../constants/placeholderImages';
import ApiError from '../utils/ApiError';
import { cmsCache } from '../utils/MemoryCache';
import { bumpPublicCacheVersion } from '../utils/cacheVersion';
import { invalidateSafetyLockCache } from '../utils/safetyLockCache';

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

class ContentService {
  static isAdminOnlySection(key: string): boolean {
    return ADMIN_ONLY_SECTION_KEYS.has(key);
  }

  static async getPublishedContent() {
    const sections = await ContentSection.find({ status: 'published' }).select('sectionKey data');
    const flatContent: any = {};
    sections.forEach(section => {
      if (ADMIN_ONLY_SECTION_KEYS.has(section.sectionKey)) return;
      flatContent[section.sectionKey] = stripSensitiveFromSectionData(section.sectionKey, section.data);
    });
    return flatContent;
  }

  static async getSectionByKey(key: string) {
    let section = await ContentSection.findOne({ sectionKey: key });
    if (!section) {
      const defaultData: { [key: string]: any } = {
        admin_safety_lock: { safetyLock: false },
        admin_maintenance_mode: { maintenanceMode: false },
        admin_idle_timeout: { idleTimeout: 15 },
        admin_theme_mode: { themeMode: 'dark' },
        custom_categories: {
          products: [
            { id: "p1", name: "Traditional Return Gifts", count: 24, image: PLACEHOLDER_IMAGES.emptyCart, active: true, description: "Bespoke brass tambulam bowls and handcrafted shagun packaging." },
            { id: "p2", name: "Engagement Ring Trays", count: 18, image: PLACEHOLDER_IMAGES.mandalaArt3, active: true, description: "Pearl beaded trays and custom carved wooden initials." },
            { id: "p3", name: "Carved Coconuts & Shagun", count: 12, image: PLACEHOLDER_IMAGES.collectionWedding, active: true, description: "Artisanal hand-painted coconuts for traditional ceremonies." },
            { id: "p4", name: "Customized Gift Hampers", count: 30, image: PLACEHOLDER_IMAGES.mandalaArt2, active: true, description: "Velvet presentation hampers with South Indian sweet boxes." }
          ],
          events: [
            { id: "e1", name: "Telugu Heritage (Pellikuthuru)", count: 8, image: PLACEHOLDER_IMAGES.collectionWedding, active: true, description: "Royal Mysore brass urlis, marigold strings, and wooden carved seats." },
            { id: "e2", name: "Engagement Gift Setup", count: 15, image: PLACEHOLDER_IMAGES.heroBackground, active: true, description: "Side-stage gift presentation pedestals and LED uplighting." },
            { id: "e3", name: "Ring Ceremony Showcases", count: 10, image: PLACEHOLDER_IMAGES.mandalaHero, active: true, description: "Gold-leaf backdrop rings and velvet pedestal arrangements." },
            { id: "e4", name: "Tambulam & Shagun Counter", count: 20, image: PLACEHOLDER_IMAGES.mandalaArt4, active: true, description: "Royal wooden shelving with fresh jasmine runners." }
          ]
        }
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
    if (section && key === 'studio_settings') {
      section.data = stripSensitiveFromSectionData(key, section.data) as typeof section.data;
    }
    return section;
  }

  static async updateSection(key: string, newData: any) {
    const payload = key === 'studio_settings' ? sanitizeStudioSettings(newData) : newData;
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
    cmsCache.delete(key); // Just in case cache key is set without prefix (like 'studio_settings')
    if (key === 'admin_safety_lock') {
      await invalidateSafetyLockCache();
    }
    await bumpPublicCacheVersion();

    return section;
  }

  static async publishAll() {
    const result = await ContentSection.updateMany(
      { status: 'draft' },
      { $set: { status: 'published' } }
    );
    
    cmsCache.clear();
    await bumpPublicCacheVersion();

    return result;
  }
}

export default ContentService;
