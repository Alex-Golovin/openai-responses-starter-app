import { Schema, model, models, Document, Types } from 'mongoose';

export type CheckType = 'single_doc' | 'cross_doc';
export type CheckSeverity = 'low' | 'medium' | 'high';

export interface CheckDocument extends Document {
  description: string;
  type: CheckType;
  whenExpr?: string;
  docTemplateId?: Types.ObjectId;
  rules: Record<string, unknown>[];
  severity: CheckSeverity;
  onFail?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CheckSchema = new Schema<CheckDocument>(
  {
    description: { type: String, required: true },
    type: {
      type: String,
      enum: ['single_doc', 'cross_doc'],
      required: true,
    },
    whenExpr: String,
    docTemplateId: { type: Schema.Types.ObjectId, ref: 'DocumentTemplate' },
    rules: [{ type: Schema.Types.Mixed, required: true }],
    severity: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
    },
    onFail: String,
  },
  { timestamps: true }
);

export const Check = models.Check || model<CheckDocument>('Check', CheckSchema);
