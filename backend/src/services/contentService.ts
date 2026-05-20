import ContentSection, { IContentSection } from '../models/ContentSection';
import ApiError from '../utils/ApiError';
import { cmsCache } from '../utils/MemoryCache';

class ContentService {
  static async getPublishedContent() {
    const sections = await ContentSection.find({ status: 'published' }).select('sectionKey data');
    const flatContent: any = {};
    sections.forEach(section => {
      flatContent[section.sectionKey] = section.data;
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
            { id: "p1", name: "Traditional Return Gifts", count: 24, image: "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?q=80&w=600&auto=format&fit=crop", active: true, description: "Bespoke brass tambulam bowls and handcrafted shagun packaging." },
            { id: "p2", name: "Engagement Ring Trays", count: 18, image: "https://images.unsplash.com/photo-1522673607200-164d1b6ce486?q=80&w=600&auto=format&fit=crop", active: true, description: "Pearl beaded trays and custom carved wooden initials." },
            { id: "p3", name: "Carved Coconuts & Shagun", count: 12, image: "https://images.unsplash.com/photo-1607190074257-dd4b7af0309f?q=80&w=600&auto=format&fit=crop", active: true, description: "Artisanal hand-painted coconuts for traditional ceremonies." },
            { id: "p4", name: "Customized Gift Hampers", count: 30, image: "https://images.unsplash.com/photo-1512909006721-3d6018887383?q=80&w=600&auto=format&fit=crop", active: true, description: "Velvet presentation hampers with South Indian sweet boxes." }
          ],
          events: [
            { id: "e1", name: "Telugu Heritage (Pellikuthuru)", count: 8, image: "https://images.unsplash.com/photo-1607190074257-dd4b7af0309f?q=80&w=600&auto=format&fit=crop", active: true, description: "Royal Mysore brass urlis, marigold strings, and wooden carved seats." },
            { id: "e2", name: "Engagement Gift Setup", count: 15, image: "https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=600&auto=format&fit=crop", active: true, description: "Side-stage gift presentation pedestals and LED uplighting." },
            { id: "e3", name: "Ring Ceremony Showcases", count: 10, image: "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?q=80&w=600&auto=format&fit=crop", active: true, description: "Gold-leaf backdrop rings and velvet pedestal arrangements." },
            { id: "e4", name: "Tambulam & Shagun Counter", count: 20, image: "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?q=80&w=600&auto=format&fit=crop", active: true, description: "Royal wooden shelving with fresh jasmine runners." }
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
    return section;
  }

  static async updateSection(key: string, newData: any) {
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

      section.data = newData;
      section.lastModified = new Date();
      section.status = 'published'; // Always publish on update/save from admin
      await section.save();
    } else {
      section = new ContentSection({
        sectionKey: key,
        data: newData,
        status: 'published', // Always publish on update/save from admin
      });
      await section.save();
    }
    
    // Invalidate MemoryCache to ensure immediate sync
    cmsCache.delete(`cms:content:${key}`);
    cmsCache.delete('cms:all_sections');
    cmsCache.delete(key); // Just in case cache key is set without prefix (like 'studio_settings')
    
    return section;
  }

  static async publishAll() {
    const result = await ContentSection.updateMany(
      { status: 'draft' },
      { $set: { status: 'published' } }
    );
    
    // Invalidate all MemoryCache entries on publish all
    cmsCache.clear();
    
    return result;
  }
}

export default ContentService;
