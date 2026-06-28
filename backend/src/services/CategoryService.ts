import Category from '../models/Category';
import Product from '../models/Product';
import Gallery from '../models/Gallery';
import Event from '../models/Event';
import logger from '../config/logger';

export class CategoryService {
  /**
   * Retrieves active categories based on optional filter.
   */
  static async getActiveCategories(filter: any = {}) {
    filter.isActive = true;
    return await Category.find(filter).sort({ displayOrder: 1 }).lean();
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

    // Cascade category name change to all entities that store category as a string
    if (data.name && data.name !== oldName) {
      const cascadeOps = [
        Product.updateMany({ category: oldName }, { $set: { category: data.name } }),
        Gallery.updateMany({ category: oldName }, { $set: { category: data.name } }),
        Event.updateMany({ category: oldName }, { $set: { category: data.name } }),
      ];
      const results = await Promise.allSettled(cascadeOps);
      const cascadedCount = results
        .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled')
        .reduce((sum, r) => sum + (r.value?.modifiedCount || 0), 0);
      if (cascadedCount > 0) {
        logger.info(
          `[CATEGORY] Cascaded rename "${oldName}" -> "${data.name}" across ${cascadedCount} document(s)`,
        );
      }
    }

    return category;
  }

  /**
   * Deletes a category. Note: We do not cascade delete products.
   */
  static async deleteCategory(id: string, user: any) {
    const existing = await Category.findById(id);
    if (!existing) {
      return null;
    }
    await (existing as any).softDelete(user, 'Deleted via categoryController');
    return existing;
  }
}
