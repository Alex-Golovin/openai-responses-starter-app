import { Schema, model, models, Document } from 'mongoose';

export type FieldType = 'string' | 'number' | 'boolean' | 'date' | 'enum';

export interface FieldValidator {
  type: 'regex' | 'min_length' | 'forbid_patterns' | 'date_before';
  value: unknown;
}

export interface FieldDocument extends Document {
  key: string;
  label: string;
  type: FieldType;
  options?: string[];
  extractHint?: string;
  validators?: FieldValidator[];
  createdAt: Date;
  updatedAt: Date;
}

const FieldSchema = new Schema<FieldDocument>(
  {
    key: { type: String, required: true, unique: true },
    label: { type: String, required: true },
    type: {
      type: String,
      enum: ['string', 'number', 'boolean', 'date', 'enum'],
      required: true,
    },
    options: [String],
    extractHint: String,
    validators: [Schema.Types.Mixed],
  },
  { timestamps: true }
);

export const Field = models.Field || model<FieldDocument>('Field', FieldSchema);
