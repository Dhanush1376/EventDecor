import { Schema, Document } from 'mongoose';

export interface IBaseEntity extends Document {
  createdBy?: string; // ObjectId or String ref to User/Admin
  updatedBy?: string; // ObjectId or String ref to User/Admin
  metadata?: Record<string, any>;
  version: number;
  // Provided by Mongoose timestamps:
  createdAt: Date;
  updatedAt: Date;
  // Provided by SoftDeletePlugin:
  isArchived?: boolean;
  archivedAt?: Date;
}

/**
 * A Mongoose plugin that adds standard enterprise audit fields to a schema.
 * Note: createdAt and updatedAt should be handled by { timestamps: true } in Schema options.
 * Note: isArchived and archivedAt should be handled by SoftDeletePlugin.
 */
export function BaseEntityPlugin(schema: Schema) {
  schema.add({
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' }, // Or 'Admin', depending on context
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    metadata: { type: Schema.Types.Mixed, default: {} },
    version: { type: Number, default: 1 },
  });

  // Automatically increment version on save (optimistic locking support)
  schema.pre('save', async function () {
    if (!this.isNew) {
      const doc = this as any;
      if (doc.version !== undefined) {
        doc.version += 1;
      }
    }
  });
}
