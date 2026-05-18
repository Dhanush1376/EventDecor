import ContentSection, { IContentSection } from '../models/ContentSection';
import ApiError from '../utils/ApiError';

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
    const section = await ContentSection.findOne({ sectionKey: key });
    if (!section) throw new ApiError(404, `Section ${key} not found`);
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
      await section.save();
    } else {
      section = new ContentSection({
        sectionKey: key,
        data: newData,
        status: 'draft',
      });
      await section.save();
    }
    
    return section;
  }

  static async publishAll() {
    const result = await ContentSection.updateMany(
      { status: 'draft' },
      { $set: { status: 'published' } }
    );
    
    return result;
  }
}

export default ContentService;
