import { Request, Response } from 'express';
import Category from '../models/Category';
import Product from '../models/Product';
import Gallery from '../models/Gallery';
import Event from '../models/Event';
import logger from '../config/logger';

export const getActiveCategories = async (req: Request, res: Response) => {
  try {
    const { type } = req.query;
    const filter: any = { isActive: true };
    if (type) filter.type = type;

    const categories = await Category.find(filter).sort({ displayOrder: 1 });
    res.status(200).json({ success: true, data: categories });
  } catch (error: any) {
    logger.error('Error fetching active categories', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

export const getAllCategories = async (req: Request, res: Response) => {
  try {
    const categories = await Category.find().sort({ displayOrder: 1 });
    res.status(200).json({ success: true, data: categories });
  } catch (error: any) {
    logger.error('Error fetching all categories', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

export const createCategory = async (req: Request, res: Response) => {
  try {
    const category = new Category(req.body);
    await category.save();
    res.status(201).json({ success: true, data: category });
  } catch (error: any) {
    logger.error('Error creating category', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

export const updateCategory = async (req: Request, res: Response) => {
  try {
    const existing = await Category.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    const oldName = existing.name;

    const dto = {
      name: req.body.name,
      description: req.body.description,
      displayOrder: req.body.displayOrder,
      isActive: req.body.isActive,
      type: req.body.type,
      image: req.body.image,
    };
    Object.keys(dto).forEach((k) => (dto as any)[k] === undefined && delete (dto as any)[k]);

    const category = await Category.findByIdAndUpdate(
      req.params.id,
      { $set: dto },
      { returnDocument: 'after' },
    );
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    // Cascade category name change to all entities that store category as a string
    if (req.body.name && req.body.name !== oldName) {
      const cascadeOps = [
        Product.updateMany({ category: oldName }, { $set: { category: req.body.name } }),
        Gallery.updateMany({ category: oldName }, { $set: { category: req.body.name } }),
        Event.updateMany({ category: oldName }, { $set: { category: req.body.name } }),
      ];
      const results = await Promise.allSettled(cascadeOps);
      const cascadedCount = results
        .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled')
        .reduce((sum, r) => sum + (r.value?.modifiedCount || 0), 0);
      if (cascadedCount > 0) {
        logger.info(
          `[CATEGORY] Cascaded rename "${oldName}" â†’ "${req.body.name}" across ${cascadedCount} document(s)`,
        );
      }
    }

    res.status(200).json({ success: true, data: category });
  } catch (error: any) {
    logger.error('Error updating category', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

export const deleteCategory = async (req: Request, res: Response) => {
  try {
    const existing = await Category.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    await existing.deleteOne();

    res.status(200).json({ success: true, message: 'Category deleted successfully' });
  } catch (error: any) {
    logger.error('Error deleting category', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};
