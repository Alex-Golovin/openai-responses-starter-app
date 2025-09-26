import { Schema, model, models, Document, Types } from 'mongoose';

export type CheckSeverity = 'low' | 'medium' | 'high';

export type CheckRuleOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'not_contains'
  | 'greater_than'
  | 'greater_or_equal'
  | 'less_than'
  | 'less_or_equal'
  | 'is_present'
  | 'is_missing';

export interface CheckRuleTarget {
  docTemplateId?: Types.ObjectId;
  fieldKey: string;
}

export interface CheckRule {
  target: CheckRuleTarget;
  operator: CheckRuleOperator;
  value?: unknown;
  message?: string;
}

export interface CheckDocument extends Document {
  description: string;
  whenExpr?: string;
  rules: CheckRule[];
  severity: CheckSeverity;
  onFail?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CheckRuleTargetSchema = new Schema<CheckRuleTarget>(
  {
    docTemplateId: { type: Schema.Types.ObjectId, ref: 'DocumentTemplate' },
    fieldKey: { type: String, required: true },
  },
  { _id: false }
);

const CheckRuleSchema = new Schema<CheckRule>(
  {
    target: { type: CheckRuleTargetSchema, required: true },
    operator: {
      type: String,
      enum: [
        'equals',
        'not_equals',
        'contains',
        'not_contains',
        'greater_than',
        'greater_or_equal',
        'less_than',
        'less_or_equal',
        'is_present',
        'is_missing',
      ],
      required: true,
    },
    value: Schema.Types.Mixed,
    message: String,
  },
  { _id: false }
);

const CheckSchema = new Schema<CheckDocument>(
  {
    description: { type: String, required: true },
    whenExpr: String,
    rules: { type: [CheckRuleSchema], required: true, default: [] },
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
