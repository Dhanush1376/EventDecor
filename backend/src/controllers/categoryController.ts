import { Request, Response } from 'express';
import Category from '../models/Category';
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
    const category = await Category.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }
    res.status(200).json({ success: true, data: category });
  } catch (error: any) {
    logger.error('Error updating category', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};
