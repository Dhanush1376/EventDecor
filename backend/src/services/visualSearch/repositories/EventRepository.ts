import Event from '../../../models/Event';

export class EventRepository {
  async searchByRegex(regexPatterns: RegExp[], limit: number = 100) {
    return Event.find({
      isActive: true,
      $or: [
        { title: { $in: regexPatterns } },
        { category: { $in: regexPatterns } },
        { style: { $in: regexPatterns } },
        { description: { $in: regexPatterns } },
        { features: { $in: regexPatterns } },
        { materialStyle: { $in: regexPatterns } },
      ],
    })
      .select(
        '_id title category style image basePrice description features colorPalette materialStyle gallery',
      )
      .limit(limit)
      .maxTimeMS(8000)
      .lean();
  }

  async searchByCategory(categoryRegex: RegExp, limit: number = 50) {
    return Event.find({
      isActive: true,
      category: categoryRegex,
    })
      .select(
        '_id title category style image basePrice description features colorPalette materialStyle gallery',
      )
      .limit(limit)
      .maxTimeMS(5000)
      .lean();
  }
}
