import mongoose, { Schema, Document } from 'mongoose';

export interface ICounter extends Omit<Document, '_id'> {
  _id: string; // collection name
  sequenceValue: number;
}

const CounterSchema: Schema = new Schema({
  _id: { type: String, required: true },
  sequenceValue: { type: Number, default: 0 },
});

export default mongoose.model<ICounter>('Counter', CounterSchema);
