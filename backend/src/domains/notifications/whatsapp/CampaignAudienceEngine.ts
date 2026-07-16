import User from '../../../models/User';
import mongoose from 'mongoose';

export class CampaignAudienceEngine {
  /**
   * Translates segment & rules into a MongoDB aggregation pipeline for Users.
   */
  private static buildPipeline(audience: any, cursor?: string): any[] {
    const pipeline: any[] = [];

    // Match valid phones
    const match: any = { phone: { $exists: true, $ne: '' } };

    // Apply Cursor for pagination
    if (cursor) {
      match._id = { $gt: new mongoose.Types.ObjectId(cursor) };
    }

    // Apply basic segments (mock implementation for 'past_buyers' leveraging User metadata)
    // Note: For a robust system, we would query the Order collection or sync metrics to User.
    // For this example, we assume we want all valid users for 'all' or 'past_buyers' based on custom logic.
    if (audience.segment === 'custom' && audience.customPhones?.length) {
      match.phone = { $in: audience.customPhones };
    }

    // Apply audience rules (e.g. { tags: ['VIP'], inactivityDays: 30 })
    if (audience.audienceRules) {
      if (audience.audienceRules.tags?.length) {
        match.tags = { $in: audience.audienceRules.tags };
      }
      // Expand more dynamic rules here...
    }

    pipeline.push({ $match: match });
    pipeline.push({ $sort: { _id: 1 } }); // Crucial for cursor pagination

    return pipeline;
  }

  /**
   * Estimates total recipients efficiently.
   */
  static async estimateRecipients(audience: any): Promise<number> {
    if (audience.segment === 'custom' && audience.customPhones) {
      return audience.customPhones.length;
    }

    // Example naive estimation, easily replace with pipeline count
    const pipeline = this.buildPipeline(audience);
    pipeline.push({ $count: 'total' });

    const result = await User.aggregate(pipeline);
    return result[0]?.total || 0;
  }

  /**
   * Fetches a specific batch of users, returning their phones and the new cursor.
   */
  static async fetchBatch(
    audience: any,
    cursor: string | undefined,
    limit: number,
  ): Promise<{ phones: string[]; nextCursor?: string }> {
    if (audience.segment === 'custom' && audience.customPhones) {
      // Memory pagination for static array
      const startIndex = cursor ? parseInt(cursor, 10) : 0;
      const slice = audience.customPhones.slice(startIndex, startIndex + limit);
      const nextCursor =
        startIndex + limit < audience.customPhones.length
          ? (startIndex + limit).toString()
          : undefined;
      return { phones: slice, nextCursor };
    }

    const pipeline = this.buildPipeline(audience, cursor);
    pipeline.push({ $limit: limit });
    pipeline.push({ $project: { phone: 1, _id: 1 } });

    const users = await User.aggregate(pipeline);
    const phones = users.map((u) => u.phone);
    const nextCursor = users.length === limit ? users[users.length - 1]._id.toString() : undefined;

    return { phones, nextCursor };
  }
}
