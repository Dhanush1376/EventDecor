import { Request, Response } from 'express';
import CatalogValue from '../../models/CatalogValue';
import CatalogSynonym from '../../models/CatalogSynonym';
import AiLearningLog from '../../models/AiLearningLog';
import Product from '../../models/Product';
import { CatalogHealthJob } from '../../jobs/catalogHealthJob';
import FilterService from '../../services/FilterService';

export class CatalogHealthController {
  // === Registry Management ===

  static async listRegistry(req: Request, res: Response) {
    try {
      const { attributeSlug, status, isVisible, search } = req.query;
      const query: any = {};

      if (attributeSlug) query.attributeSlug = attributeSlug;
      if (status) query.status = status;
      if (isVisible !== undefined) query.isVisible = isVisible === 'true';
      if (search) query.value = { $regex: search, $options: 'i' };

      const values = await CatalogValue.find(query)
        .sort({ attributeSlug: 1, sortOrder: 1, usageCount: -1 })
        .lean();

      // Fetch synonyms for these values
      const valueIds = values.map((v) => v._id);
      const synonyms = await CatalogSynonym.find({ valueId: { $in: valueIds } }).lean();

      const valuesWithSynonyms = values.map((v) => ({
        ...v,
        synonyms: synonyms.filter((s) => s.valueId.toString() === v._id.toString()),
      }));

      res.status(200).json({ success: true, data: valuesWithSynonyms });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  static async createRegistryValue(req: Request, res: Response) {
    try {
      const { attributeSlug, value, parentId, taxonomy, isVisible, sortOrder } = req.body;
      const slug = value.toLowerCase().replace(/[^a-z0-9]+/g, '-');

      const existing = await CatalogValue.findOne({ attributeSlug, slug });
      if (existing) {
        return res.status(400).json({ success: false, message: 'Value already exists' });
      }

      const newValue = new CatalogValue({
        attributeSlug,
        value,
        slug,
        parentId: parentId || null,
        taxonomy,
        isVisible: isVisible !== undefined ? isVisible : true,
        sortOrder: sortOrder || 0,
        status: 'approved',
        createdBy: 'admin',
        approvedBy: req.user?.id,
      });

      await newValue.save();
      FilterService.clearCache();

      res.status(201).json({ success: true, data: newValue });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  static async updateRegistryValue(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const updates = req.body;

      if (updates.value) {
        updates.slug = updates.value.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      }

      updates.$inc = { version: 1 };

      const value = await CatalogValue.findByIdAndUpdate(id, updates, { new: true });
      if (!value) return res.status(404).json({ success: false, message: 'Not found' });

      // If value string changed, update all denormalized products
      if (updates.value) {
        await Product.updateMany(
          { 'variants.valueId': id },
          { $set: { 'variants.$[elem].value': updates.value } },
          { arrayFilters: [{ 'elem.valueId': id }] },
        );
      }

      FilterService.clearCache();
      res.status(200).json({ success: true, data: value });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  static async deleteRegistryValue(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const value = await CatalogValue.findById(id);

      if (!value) return res.status(404).json({ success: false, message: 'Not found' });

      if (value.usageCount > 0) {
        return res.status(400).json({
          success: false,
          message: 'Cannot delete value currently in use by products. Merge it instead.',
        });
      }

      await CatalogSynonym.deleteMany({ valueId: id });
      await CatalogValue.findByIdAndDelete(id);

      FilterService.clearCache();
      res.status(200).json({ success: true, message: 'Deleted successfully' });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  // === Approvals ===

  static async getPendingApprovals(req: Request, res: Response) {
    try {
      const pending = await CatalogValue.find({ status: 'pending' }).sort({ createdAt: -1 });
      res.status(200).json({ success: true, data: pending });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  static async approveValue(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const value = await CatalogValue.findByIdAndUpdate(
        id,
        { status: 'approved', approvedBy: req.user?.id, isVisible: true },
        { new: true },
      );
      if (!value) return res.status(404).json({ success: false, message: 'Not found' });

      FilterService.clearCache();
      res.status(200).json({ success: true, data: value });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  static async rejectValue(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const value = await CatalogValue.findByIdAndUpdate(
        id,
        { status: 'rejected', approvedBy: req.user?.id, isVisible: false },
        { new: true },
      );
      if (!value) return res.status(404).json({ success: false, message: 'Not found' });

      FilterService.clearCache();
      res.status(200).json({ success: true, data: value });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  static async mergeValue(req: Request, res: Response) {
    try {
      const { id } = req.params; // The value to be merged (and deleted)
      const { targetId } = req.body; // The canonical value to merge into

      const source = await CatalogValue.findById(id);
      const target = await CatalogValue.findById(targetId);

      if (!source || !target) {
        return res.status(404).json({ success: false, message: 'Source or target not found' });
      }

      if (source.attributeSlug !== target.attributeSlug) {
        return res
          .status(400)
          .json({ success: false, message: 'Cannot merge values from different attributes' });
      }

      // 1. Update all products pointing to source to point to target
      await Product.updateMany(
        { 'variants.valueId': id },
        { $set: { 'variants.$[elem].valueId': targetId, 'variants.$[elem].value': target.value } },
        { arrayFilters: [{ 'elem.valueId': id }] },
      );

      // 2. Move synonyms from source to target
      await CatalogSynonym.updateMany({ valueId: id }, { $set: { valueId: targetId } });

      // 3. Create a synonym for the source's original value so future AI matches hit the target
      await CatalogSynonym.create({
        valueId: targetId,
        attributeSlug: target.attributeSlug,
        term: source.value,
        termSlug: source.slug,
        type: 'synonym',
      }).catch((_e) => {
        /* Ignore duplicate key error if synonym already exists */
      });

      // 4. Update usage count on target
      target.usageCount += source.usageCount;
      await target.save();

      // 5. Delete source
      await CatalogValue.findByIdAndDelete(id);

      FilterService.clearCache();
      res
        .status(200)
        .json({ success: true, message: `Merged '${source.value}' into '${target.value}'` });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  // === Synonyms ===
  static async listSynonyms(req: Request, res: Response) {
    try {
      const synonyms = await CatalogSynonym.find().populate('valueId');
      res.status(200).json({ success: true, data: synonyms });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  static async createSynonym(req: Request, res: Response) {
    try {
      const { valueId, term, type } = req.body;
      const target = await CatalogValue.findById(valueId);
      if (!target)
        return res.status(404).json({ success: false, message: 'Target value not found' });

      const synonym = new CatalogSynonym({
        valueId,
        attributeSlug: target.attributeSlug,
        term,
        termSlug: term.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        type: type || 'synonym',
      });

      await synonym.save();
      res.status(201).json({ success: true, data: synonym });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  static async deleteSynonym(req: Request, res: Response) {
    try {
      await CatalogSynonym.findByIdAndDelete(req.params.id);
      res.status(200).json({ success: true, message: 'Deleted' });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  // === Health & Analytics ===

  static async getStats(req: Request, res: Response) {
    try {
      const stats = await CatalogValue.aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            approved: { $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] } },
            pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
            rejected: { $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] } },
            totalUsage: { $sum: '$usageCount' },
          },
        },
      ]);

      const corrections = await AiLearningLog.countDocuments();
      const synonyms = await CatalogSynonym.countDocuments();

      res.status(200).json({
        success: true,
        data: {
          registry: stats[0] || { total: 0, approved: 0, pending: 0, rejected: 0, totalUsage: 0 },
          aiCorrections: corrections,
          synonyms,
        },
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  static async triggerHealthScan(req: Request, res: Response) {
    try {
      const result = await CatalogHealthJob.run();
      res.status(200).json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  static async getLatestHealthReport(req: Request, res: Response) {
    // Currently relying on synchronous trigger response, could be persisted to DB in future
    res.status(200).json({ success: true, message: 'Trigger a scan to get the report' });
  }

  static async getLearningLog(req: Request, res: Response) {
    try {
      const logs = await AiLearningLog.find()
        .sort({ lastCorrectedAt: -1 })
        .populate('correctedValueId');
      res.status(200).json({ success: true, data: logs });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  static async forgetLearning(req: Request, res: Response) {
    try {
      await AiLearningLog.findByIdAndDelete(req.params.id);
      res.status(200).json({ success: true, message: 'Learning forgotten' });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
}
