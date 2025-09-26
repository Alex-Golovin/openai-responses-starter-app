import { Schema, model, models, Document, Types } from 'mongoose';

export type DocumentTemplateCheckMode = 'single_doc' | 'multi_doc';

export interface DocumentTemplateCheckRef {
  checkId: Types.ObjectId;
  mode: DocumentTemplateCheckMode;
}

export interface DocumentTemplateDocument extends Document {
  name: string;
  fieldIds: Types.ObjectId[];
  checks: DocumentTemplateCheckRef[];
  createdAt: Date;
  updatedAt: Date;
}

const DocumentTemplateCheckRefSchema = new Schema<DocumentTemplateCheckRef>(
  {
    checkId: {
      type: Schema.Types.ObjectId,
      ref: 'Check',
      required: true,
    },
    mode: {
      type: String,
      enum: ['single_doc', 'multi_doc'],
      default: 'single_doc',
    },
  },
  { _id: false }
);

const DocumentTemplateSchema = new Schema<DocumentTemplateDocument>(
  {
    name: { type: String, required: true, unique: true },
    fieldIds: [
      { type: Schema.Types.ObjectId, ref: 'Field', required: true },
    ],
    checks: { type: [DocumentTemplateCheckRefSchema], default: [] },
  },
  { timestamps: true }
);

export const DocumentTemplate =
  models.DocumentTemplate ||
  model<DocumentTemplateDocument>('DocumentTemplate', DocumentTemplateSchema);
