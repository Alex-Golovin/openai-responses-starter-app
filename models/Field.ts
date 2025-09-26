import { Schema, model, models, Document } from 'mongoose';

export type FieldType = 'string' | 'number' | 'boolean' | 'date' | 'enum';

export interface FieldOption {
  label: string;
  value: string;
}

export interface FieldDocument extends Document {
  key: string;
  label: string;
  type: FieldType;
  options?: FieldOption[];
  extractHint?: string;
  createdAt: Date;
  updatedAt: Date;
}

const FieldOptionSchema = new Schema<FieldOption>(
  {
    label: { type: String, required: true },
    value: { type: String, required: true },
  },
  { _id: false }
);

const FieldSchema = new Schema<FieldDocument>(
  {
    key: { type: String, required: true, unique: true },
    label: { type: String, required: true },
    type: {
      type: String,
      enum: ['string', 'number', 'boolean', 'date', 'enum'],
      required: true,
    },
    options: [FieldOptionSchema],
    extractHint: String,
  },
  { timestamps: true }
);

export const Field = models.Field || model<FieldDocument>('Field', FieldSchema);
