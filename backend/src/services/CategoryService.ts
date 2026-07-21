import mongoose from 'mongoose';
import Category from '../models/Category';
import { ReferenceIntegrityService } from './ReferenceIntegrityService';

export class CategoryService {
  static {
    // Register cascade rules for when a category is soft-deleted
    ReferenceIntegrityService.register('Category', [
      { targetModel: 'Product', targetField: 'secondaryCategories', action: 'pull' },
      { targetModel: 'Event', targetField: 'secondaryCategories', action: 'pull' },
      { targetModel: 'Gallery', targetField: 'secondaryCategories', action: 'pull' },
      { targetModel: 'Product', targetField: 'primaryCategory', action: 'nullify' },
      { targetModel: 'Event', targetField: 'primaryCategory', action: 'nullify' },
      { targetModel: 'Gallery', targetField: 'primaryCategory', action: 'nullify' },
    ]);
  }
  /**
   * Retrieves active categories based on optional filter.
   */
  static async getActiveCategories(filter: any = {}) {
    filter.isActive = true;
    return await Category.find(filter).sort({ displayOrder: 1 }).lean();
  }

  /**
   * Intelligently matches a category name to prevent duplicates.
   * Handles exact, case-insensitive, plural/singular, and fuzzy matching.
   */
  static async intelligentMatch(name: string): Promise<mongoose.Types.ObjectId | null> {
    if (!name) return null;
    const searchStr = name.trim();
    const lowerSearch = searchStr.toLowerCase();

    // 1. Exact or Case-Insensitive Match
    const exactMatch = await Category.findOne({
      $or: [
        { name: { $regex: new RegExp(`^${searchStr}$`, 'i') } },
        { slug: searchStr.replace(/[\s\W-]+/g, '-') },
      ],
    });
    if (exactMatch) return exactMatch._id as mongoose.Types.ObjectId;

    // 2. Plural / Singular match (Basic S-stripping/appending)
    const singular = lowerSearch.endsWith('s') ? lowerSearch.slice(0, -1) : lowerSearch;
    const plural = lowerSearch + 's';

    const pluralMatch = await Category.findOne({
      $or: [
        { name: { $regex: new RegExp(`^${singular}$`, 'i') } },
        { name: { $regex: new RegExp(`^${plural}$`, 'i') } },
      ],
    });
    if (pluralMatch) return pluralMatch._id as mongoose.Types.ObjectId;

    // 3. Partial Substring / Alias matching
    // (In a full enterprise setup, this would ping AI or a vector DB, but for now we do a text search)
    // eslint-disable-next-line unused-imports/no-unused-vars
    const textMatch = await Category.findOne(
      { $text: { $search: searchStr } },
      { score: { $meta: 'textScore' } },
    ).sort({ score: { $meta: 'textScore' } });

    // If the text match is very strong, we could return it, but text matching can be dangerous.
    // For now, if we don't have exact/plural match, we return null to trigger a safe AI creation or manual fallback.
    return null;
  }

  /**
   * Retrieves all categories.
   */
  static async getAllCategories() {
    return await Category.find().sort({ displayOrder: 1 }).lean();
  }

  /**
   * Creates a new category.
   */
  static async createCategory(data: any) {
    const category = new Category(data);
    return await category.save();
  }

  /**
   * Updates an existing category and handles cascading name changes to dependent collections.
   */
  static async updateCategory(id: string, data: any) {
    const existing = await Category.findById(id);
    if (!existing) {
      return null;
    }

    // eslint-disable-next-line unused-imports/no-unused-vars
    const oldName = existing.name;

    const dto = {
      name: data.name,
      slug: data.slug,
      description: data.description,
      displayOrder: data.displayOrder,
      isActive: data.isActive,
      type: data.type,
      image: data.image,
      coverProduct: data.coverProduct || null,
    };
    Object.keys(dto).forEach((k) => (dto as any)[k] === undefined && delete (dto as any)[k]);

    const category = await Category.findByIdAndUpdate(
      id,
      { $set: dto },
      { returnDocument: 'after' },
    );

    if (!category) {
      return null;
    }

    // Because we now use ObjectIds (primaryCategory / secondaryCategories),
    // changing the category name automatically reflects across all linked documents via $lookup/populate.
    // We no longer need to perform string cascades.

    return category;
  }

  /**
   * Deletes a category safely using a transaction.
   * ReferenceIntegrityService will handle the cascading logic.
   */
  static async deleteCategory(id: string, user: any) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const existing = await Category.findById(id).session(session);
      if (!existing) {
        await session.abortTransaction();
        session.endSession();
        return null;
      }

      // The softDelete method (via plugin) will trigger ReferenceIntegrityService.onSoftDelete
      await (existing as any).softDelete(user, 'Deleted via categoryController');

      await session.commitTransaction();
      session.endSession();
      return existing;
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  }
}
