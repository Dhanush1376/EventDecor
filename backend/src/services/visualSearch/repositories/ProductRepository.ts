import Product from '../../../models/Product';

export class ProductRepository {
  async searchByRegex(regexPatterns: RegExp[], limit: number = 100) {
    return Product.find({
      isActive: true,
      $or: [
        { title: { $in: regexPatterns } },
        { tags: { $in: regexPatterns } },
        { category: { $in: regexPatterns } },
        { description: { $in: regexPatterns } },
        { aiTags: { $in: regexPatterns } },
        { material: { $in: regexPatterns } },
      ],
    })
      .select(
        '_id title slug category imageSrc images price oldPrice rating reviews tags description material badges aiTags aiCategory aiAttributes imageHash',
      )
      .limit(limit)
      .maxTimeMS(8000)
      .lean();
  }

  async searchByCategory(categoryRegex: RegExp, limit: number = 50) {
    return Product.find({
      isActive: true,
      $or: [{ category: categoryRegex }, { aiCategory: categoryRegex }],
    })
      .select(
        '_id title slug category imageSrc images price oldPrice rating reviews tags description material badges aiTags aiCategory aiAttributes imageHash',
      )
      .limit(limit)
      .maxTimeMS(5000)
      .lean();
  }

  async searchByText(searchString: string, limit: number = 100) {
    return Product.find(
      {
        isActive: true,
        $text: { $search: searchString },
      },
      { score: { $meta: 'textScore' } },
    )
      .sort({ score: { $meta: 'textScore' } })
      .select(
        '_id title slug category imageSrc images price oldPrice rating reviews tags description material badges aiTags aiCategory aiAttributes imageHash',
      )
      .limit(limit)
      .maxTimeMS(8000)
      .lean();
  }
}
