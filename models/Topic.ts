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

export type TopicResponseBlockKind =
  | 'info'
  | 'checklist'
  | 'service'
  | 'script'
  | 'pricing';

export interface TopicResponseBlock {
  kind: TopicResponseBlockKind;
  title: string;
  description?: string;
  items: string[];
}

export interface TopicResponses {
  textBlocks: TopicResponseBlock[];
}

export interface TopicDocument extends Document {
  title: string;
  tags?: string[];
  faq: TopicFaqEntry[];
  documents: TopicDocumentRef[];
  checkIds: Types.ObjectId[];
  responses?: TopicResponses;
  createdAt: Date;
  updatedAt: Date;
}

const TopicResponseBlockSchema = new Schema<TopicResponseBlock>(
  {
    kind: {
      type: String,
      enum: ['info', 'checklist', 'service', 'script', 'pricing'],
      required: true,
    },
    title: { type: String, required: true },
    description: String,
    items: [{ type: String, required: true }],
  },
  { _id: false }
);

const TopicResponsesSchema = new Schema<TopicResponses>(
  {
    textBlocks: [TopicResponseBlockSchema],
  },
  { _id: false }
);

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
    responses: TopicResponsesSchema,
  },
  { timestamps: true }
);

export const Topic = models.Topic || model<TopicDocument>('Topic', TopicSchema);
