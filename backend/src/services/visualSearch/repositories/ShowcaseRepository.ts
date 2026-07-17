import ShowcaseCollection from '../../../models/ShowcaseCollection';

export class ShowcaseRepository {
  async searchByRegex(regexPatterns: RegExp[], limit: number = 100) {
    return ShowcaseCollection.find({
      isActive: true,
      $or: [
        { title: { $in: regexPatterns } },
        { category: { $in: regexPatterns } },
        { description: { $in: regexPatterns } },
      ],
    })
      .select(
        '_id title category description image rentalPrice gallery inclusions colorPalette setupTimeHours popularityScore',
      )
      .limit(limit)
      .maxTimeMS(8000)
      .lean();
  }

  async searchByCategory(categoryRegex: RegExp, limit: number = 50) {
    return ShowcaseCollection.find({
      isActive: true,
      category: categoryRegex,
    })
      .select(
        '_id title category description image rentalPrice gallery inclusions colorPalette setupTimeHours popularityScore',
      )
      .limit(limit)
      .maxTimeMS(5000)
      .lean();
  }

  async searchByText(searchString: string, limit: number = 100) {
    return ShowcaseCollection.find(
      {
        isActive: true,
        $text: { $search: searchString },
      },
      { score: { $meta: 'textScore' } },
    )
      .sort({ score: { $meta: 'textScore' } })
      .select(
        '_id title category description image rentalPrice gallery inclusions colorPalette setupTimeHours popularityScore',
      )
      .limit(limit)
      .maxTimeMS(8000)
      .lean();
  }
}
