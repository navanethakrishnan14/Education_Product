import { Schema } from 'mongoose';

/**
 * Robust Auto-Increment Plugin
 * Handles high-concurrency collisions and rogue database indexes.
 */
export const autoIncrementPlugin = (schema: Schema, options: { prefix?: string; padLength?: number } = {}) => {
  const idPath = schema.path('_id') as any;
  if (!idPath || idPath.instance === 'ObjectId') {
    schema.add({ _id: { type: options.prefix ? String : Number } });
  }

  schema.pre('save', async function (next) {
    if (!this.isNew) return next();

    try {
      const model = this.constructor as any;
      const collectionName = model.collection.name;
      const result = await model.db.collection('counters').findOneAndUpdate(
        { _id: collectionName },
        { $inc: { seq: 1 } },
        { returnDocument: 'after', upsert: true }
      );
      const sequence = result?.value?.seq ?? result?.seq;
      if (!Number.isSafeInteger(sequence) || sequence < 1) {
        throw new Error(`Invalid numeric sequence returned for ${collectionName}`);
      }

      const currentIdPath = model.schema.path('_id') as any;
      if (currentIdPath?.instance === 'String' && options.prefix) {
        const padLength = options.padLength ?? 3;
        this._id = `${options.prefix}-${String(sequence).padStart(padLength, '0')}`;
      } else {
        this._id = sequence;
      }
      next();
    } catch (error) {
      next(error as Error);
    }
  });
};
