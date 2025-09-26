import { Types } from 'mongoose';

import { connectToDatabase } from '@/lib/mongoose';
import { Topic, TopicDocument } from '@/models/Topic';
import { DocumentTemplate, DocumentTemplateDocument } from '@/models/DocumentTemplate';
import { Field, FieldDocument } from '@/models/Field';

export interface KnowledgeChunk {
  id: string;
  topicId: string;
  kind: string;
  title: string;
  text: string;
  metadata: Record<string, unknown>;
}

export interface TopicChunksPayload {
  topicId: string;
  topicTitle: string;
  tags: string[];
  chunks: KnowledgeChunk[];
}

interface BuildChunksOptions {
  topicIds?: string[];
}

const asObjectId = (id: string): Types.ObjectId | null => {
  if (!Types.ObjectId.isValid(id)) {
    return null;
  }
  return new Types.ObjectId(id);
};

const stringifyId = (value: Types.ObjectId | string | undefined): string | undefined => {
  if (!value) {
    return undefined;
  }
  return typeof value === 'string' ? value : value.toString();
};

const buildDocumentChecklistChunk = (
  topic: TopicDocument & { _id: Types.ObjectId },
  templatesMap: Map<string, DocumentTemplateDocument & { _id: Types.ObjectId }>,
  fieldsMap: Map<string, FieldDocument & { _id: Types.ObjectId }>
): KnowledgeChunk | null => {
  if (!topic.documents || topic.documents.length === 0) {
    return null;
  }

  const lines = topic.documents.map((doc) => {
    const templateId = stringifyId(doc.templateId);
    const template = templateId ? templatesMap.get(templateId) : undefined;

    const fieldLabels = (template?.fieldIds || [])
      .map((fieldId) => stringifyId(fieldId as Types.ObjectId))
      .map((id) => (id ? fieldsMap.get(id) : undefined))
      .filter((field): field is FieldDocument & { _id: Types.ObjectId } => Boolean(field))
      .map((field) => field.label);

    const parts = [] as string[];
    parts.push(`${doc.alias}${doc.required ? ' (обовʼязково)' : ''}`);
    if (template?.name) {
      parts.push(`шаблон: ${template.name}`);
    }
    if (fieldLabels.length > 0) {
      parts.push(`поля: ${fieldLabels.join(', ')}`);
    }

    return `• ${parts.join(' — ')}`;
  });

  const text = [`Перелік документів для теми "${topic.title}"`, '', ...lines].join('\n').trim();

  return {
    id: `${topic._id.toString()}#documents`,
    topicId: topic._id.toString(),
    kind: 'checklist',
    title: `Документи: ${topic.title}`,
    text,
    metadata: {
      topicId: topic._id.toString(),
      kind: 'checklist',
      title: topic.title,
      source: 'documents',
    },
  };
};

const buildFaqChunks = (
  topic: TopicDocument & { _id: Types.ObjectId }
): KnowledgeChunk[] => {
  if (!topic.faq || topic.faq.length === 0) {
    return [];
  }

  return topic.faq
    .filter((entry) => entry.q && entry.a)
    .map((entry, index) => {
      const text = [`Питання: ${entry.q}`, `Відповідь: ${entry.a}`].join('\n');
      return {
        id: `${topic._id.toString()}#faq-${index}`,
        topicId: topic._id.toString(),
        kind: 'faq',
        title: `${topic.title} — FAQ`,
        text,
        metadata: {
          topicId: topic._id.toString(),
          kind: 'faq',
          title: topic.title,
          question: entry.q,
        },
      } satisfies KnowledgeChunk;
    });
};

const buildResponseBlockChunks = (
  topic: TopicDocument & { _id: Types.ObjectId }
): KnowledgeChunk[] => {
  const blocks = topic.responses?.textBlocks || [];
  if (blocks.length === 0) {
    return [];
  }

  return blocks.map((block, index) => {
    const lines = [block.title];
    if (block.description) {
      lines.push('', block.description);
    }
    if (block.items?.length) {
      lines.push('', ...block.items.map((item) => `• ${item}`));
    }

    const text = lines.join('\n').trim();

    return {
      id: `${topic._id.toString()}#block-${index}`,
      topicId: topic._id.toString(),
      kind: block.kind,
      title: `${topic.title} — ${block.title}`,
      text,
      metadata: {
        topicId: topic._id.toString(),
        kind: block.kind,
        title: block.title,
        source: 'responses',
      },
    } satisfies KnowledgeChunk;
  });
};

export const buildChunksFromMongo = async (
  options: BuildChunksOptions = {}
): Promise<TopicChunksPayload[]> => {
  await connectToDatabase();

  const { topicIds } = options;

  const query = topicIds && topicIds.length > 0
    ? {
        _id: {
          $in: topicIds
            .map(asObjectId)
            .filter((id): id is Types.ObjectId => id !== null),
        },
      }
    : {};

  const [topics, templates, fields] = await Promise.all([
    Topic.find(query)
      .sort({ createdAt: -1 })
      .lean(),
    DocumentTemplate.find().lean(),
    Field.find().lean(),
  ]);

  const typedTopics = (topics as (TopicDocument & { _id: Types.ObjectId })[]) || [];
  const typedTemplates =
    (templates as (DocumentTemplateDocument & { _id: Types.ObjectId })[]) || [];
  const typedFields = (fields as (FieldDocument & { _id: Types.ObjectId })[]) || [];

  const templatesMap = new Map(
    typedTemplates.map((template) => [template._id.toString(), template])
  );
  const fieldsMap = new Map(
    typedFields.map((field) => [field._id.toString(), field])
  );

  return typedTopics.map((topic) => {
    const faqChunks = buildFaqChunks(topic);
    const documentChunk = buildDocumentChecklistChunk(topic, templatesMap, fieldsMap);
    const responseChunks = buildResponseBlockChunks(topic);

    const chunks = [
      ...faqChunks,
      ...(documentChunk ? [documentChunk] : []),
      ...responseChunks,
    ];

    return {
      topicId: topic._id.toString(),
      topicTitle: topic.title,
      tags: topic.tags || [],
      chunks,
    } satisfies TopicChunksPayload;
  });
};
