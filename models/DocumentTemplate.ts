import { Schema, model, models, Document, Types } from 'mongoose';

export interface DocumentTemplateDocument extends Document {
  name: string;
  fieldIds: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const DocumentTemplateSchema = new Schema<DocumentTemplateDocument>(
  {
    name: { type: String, required: true, unique: true },
    fieldIds: [
      { type: Schema.Types.ObjectId, ref: 'Field', required: true },
    ],
  },
  { timestamps: true }
);

export const DocumentTemplate =
  models.DocumentTemplate ||
  model<DocumentTemplateDocument>('DocumentTemplate', DocumentTemplateSchema);
