import mongoose from 'mongoose';
import WhatsAppTemplate from '../../../models/WhatsAppTemplate';
import WhatsAppAutomation from '../../../models/WhatsAppAutomation';

export class TemplateVersionService {
  /**
   * Creates a draft copy of an existing template.
   */
  static async createDraft(templateId: string, userId?: mongoose.Types.ObjectId): Promise<any> {
    const original = await WhatsAppTemplate.findById(templateId).lean();
    if (!original) throw new Error('Original template not found');

    const draftData = { ...original } as any;
    delete draftData._id;
    delete draftData.createdAt;
    delete draftData.updatedAt;

    draftData.status = 'draft';
    draftData.previousVersionId = original._id;
    draftData.version = (original.version || 1) + 1;
    draftData.isActive = false; // Drafts are not active
    if (userId) {
      draftData.createdBy = userId;
      draftData.approvalHistory = [{ status: 'draft', changedBy: userId, changedAt: new Date() }];
    }

    return await WhatsAppTemplate.create(draftData);
  }

  /**
   * Submits a draft for review.
   */
  static async submitForReview(
    draftId: string,
    userId?: mongoose.Types.ObjectId,
    comment?: string,
  ): Promise<any> {
    const draft = await WhatsAppTemplate.findById(draftId);
    if (!draft || draft.status !== 'draft') throw new Error('Invalid draft state');

    draft.status = 'pending_review';
    draft.approvalHistory.push({
      status: 'pending_review',
      changedBy: userId,
      changedAt: new Date(),
      comment,
    });

    return await draft.save();
  }

  /**
   * Approves a pending template.
   */
  static async approve(
    draftId: string,
    reviewerId?: mongoose.Types.ObjectId,
    comment?: string,
  ): Promise<any> {
    const draft = await WhatsAppTemplate.findById(draftId);
    if (!draft || draft.status !== 'pending_review')
      throw new Error('Template is not pending review');

    draft.status = 'approved';
    draft.approvalHistory.push({
      status: 'approved',
      changedBy: reviewerId,
      changedAt: new Date(),
      comment,
    });

    return await draft.save();
  }

  /**
   * Publishes an approved template, updating the automation to use it.
   */
  static async publish(templateId: string, publisherId?: mongoose.Types.ObjectId): Promise<any> {
    const template = await WhatsAppTemplate.findById(templateId);
    if (!template || template.status !== 'approved')
      throw new Error('Template must be approved to publish');

    // Archive the previous version if it exists
    if (template.previousVersionId) {
      await WhatsAppTemplate.findByIdAndUpdate(template.previousVersionId, {
        status: 'archived',
        archivedAt: new Date(),
        isActive: false,
      });
    }

    template.status = 'published';
    template.publishedAt = new Date();
    template.publishedBy = publisherId;
    template.isActive = true;
    template.approvalHistory.push({
      status: 'published',
      changedBy: publisherId,
      changedAt: new Date(),
    });

    await template.save();

    // Update automation to point to the new published template
    await WhatsAppAutomation.updateMany(
      { automationKey: template.automationKey },
      { activeTemplateId: template._id },
    );

    return template;
  }

  /**
   * Archives a template version.
   */
  static async archiveVersion(templateId: string): Promise<any> {
    const template = await WhatsAppTemplate.findById(templateId);
    if (!template) throw new Error('Template not found');

    // Prevent archiving if it's the currently active template for an automation
    const inUse = await WhatsAppAutomation.exists({ activeTemplateId: templateId });
    if (inUse) {
      throw new Error('Cannot archive a template currently in use by an automation');
    }

    template.status = 'archived';
    template.archivedAt = new Date();
    template.isActive = false;
    return await template.save();
  }
}
