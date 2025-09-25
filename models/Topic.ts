import { Schema, model, models, Document, Types } from 'mongoose';

export interface TopicFaqEntry {
  q: string;
  a: string;
}

export interface TopicDocumentRef {
  templateId: Types.ObjectId;
  alias: string;
  required: boolean;
}

export interface TopicDocument extends Document {
  title: string;
  tags?: string[];
  faq: TopicFaqEntry[];
  documents: TopicDocumentRef[];
  checkIds: Types.ObjectId[];
  responses?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const TopicSchema = new Schema<TopicDocument>(
  {
    title: { type: String, required: true },
    tags: [String],
    faq: [{ q: String, a: String }],
    documents: [
      {
        templateId: {
          type: Schema.Types.ObjectId,
          ref: 'DocumentTemplate',
          required: true,
        },
        alias: { type: String, required: true },
        required: { type: Boolean, default: true },
      },
    ],
    checkIds: [{ type: Schema.Types.ObjectId, ref: 'Check' }],
    responses: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

export const Topic = models.Topic || model<TopicDocument>('Topic', TopicSchema);
