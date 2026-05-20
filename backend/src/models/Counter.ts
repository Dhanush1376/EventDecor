import mongoose, { Schema, Document } from 'mongoose';

export interface ICounter extends Document {
  id: string;
  seq: number;
}

const CounterSchema: Schema = new Schema(
  {
    id: { type: String, required: true, unique: true },
    seq: { type: Number, default: 0 }
  },
  { timestamps: true }
);

const Counter = mongoose.model<ICounter>('Counter', CounterSchema);
export default Counter;
