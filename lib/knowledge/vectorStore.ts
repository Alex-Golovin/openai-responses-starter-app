import OpenAI from 'openai';

import { defaultVectorStore } from '@/config/constants';
import { buildChunksFromMongo, KnowledgeChunk, TopicChunksPayload } from './buildChunks';

const openai = new OpenAI();

const ensureVectorStoreId = (): string => {
  const vectorStoreId = defaultVectorStore.id;
  if (!vectorStoreId) {
    throw new Error('VECTOR_STORE_ID is not configured');
  }
  return vectorStoreId;
};

const topicFilename = (topicId: string) => `topic_${topicId}.jsonl`;

const chunkToJsonLine = (
  payload: TopicChunksPayload,
  chunk: KnowledgeChunk
): string => {
  return JSON.stringify({
    id: chunk.id,
    text: chunk.text,
    metadata: {
      topicId: chunk.topicId,
      kind: chunk.kind,
      title: chunk.title,
      topicTitle: payload.topicTitle,
      tags: payload.tags,
      chunkId: chunk.id,
    },
  });
};

const payloadToJsonl = (payload: TopicChunksPayload): string => {
  return payload.chunks.map((chunk) => chunkToJsonLine(payload, chunk)).join('\n');
};

const uploadTopicPayload = async (
  vectorStoreId: string,
  payload: TopicChunksPayload
) => {
  if (payload.chunks.length === 0) {
    return null;
  }

  const jsonlContent = payloadToJsonl(payload);
  if (!jsonlContent.trim()) {
    return null;
  }

  const filename = topicFilename(payload.topicId);
  const blob = new Blob([jsonlContent], { type: 'application/jsonl' });
  const file = await openai.files.create({
    file: new File([blob], filename, { type: 'application/jsonl' }),
    purpose: 'assistants',
  });

  await openai.vectorStores.files.create(vectorStoreId, {
    file_id: file.id,
  });

  return { fileId: file.id, filename };
};

const listAllVectorStoreFiles = async (vectorStoreId: string) => {
  const collected: { id: string }[] = [];
  let after: string | undefined;

  do {
    const response = await openai.vectorStores.files.list(vectorStoreId, {
      limit: 200,
      after,
    });

    collected.push(...response.data.map((file) => ({ id: file.id })));

    if (response.has_more && response.data.length > 0) {
      after = response.data[response.data.length - 1].id;
    } else {
      after = undefined;
    }
  } while (after);

  return collected;
};

const deleteVectorStoreFile = async (vectorStoreId: string, fileId: string) => {
  try {
    await openai.vectorStores.files.del(vectorStoreId, fileId);
  } catch (error) {
    console.warn(`Failed to detach file ${fileId} from vector store`, error);
  }

  try {
    await openai.files.del(fileId);
  } catch (error) {
    console.warn(`Failed to delete file ${fileId} from files API`, error);
  }
};

const deleteAllVectorStoreFiles = async (vectorStoreId: string) => {
  const files = await listAllVectorStoreFiles(vectorStoreId);
  for (const file of files) {
    await deleteVectorStoreFile(vectorStoreId, file.id);
  }
};

const deleteTopicFiles = async (vectorStoreId: string, topicId: string) => {
  const files = await listAllVectorStoreFiles(vectorStoreId);
  const targetFilename = topicFilename(topicId);

  for (const file of files) {
    try {
      const fileInfo = await openai.files.retrieve(file.id);
      if (fileInfo.filename === targetFilename) {
        await deleteVectorStoreFile(vectorStoreId, file.id);
      }
    } catch (error) {
      console.warn(`Failed to retrieve file ${file.id}`, error);
    }
  }
};

export const reindexKnowledge = async () => {
  const vectorStoreId = ensureVectorStoreId();
  const payloads = await buildChunksFromMongo();

  await deleteAllVectorStoreFiles(vectorStoreId);

  let uploaded = 0;
  let chunks = 0;

  for (const payload of payloads) {
    const result = await uploadTopicPayload(vectorStoreId, payload);
    if (result) {
      uploaded += 1;
      chunks += payload.chunks.length;
    }
  }

  return { topicsProcessed: payloads.length, filesUploaded: uploaded, chunks };
};

export const upsertTopicKnowledge = async (topicId: string) => {
  if (!topicId) {
    throw new Error('topicId is required');
  }

  const vectorStoreId = ensureVectorStoreId();
  const payloads = await buildChunksFromMongo({ topicIds: [topicId] });
  const payload = payloads[0];

  if (!payload) {
    await deleteTopicFiles(vectorStoreId, topicId);
    return { topicId, filesUploaded: 0, chunks: 0 };
  }

  await deleteTopicFiles(vectorStoreId, topicId);

  const result = await uploadTopicPayload(vectorStoreId, payload);

  return {
    topicId,
    filesUploaded: result ? 1 : 0,
    chunks: payload.chunks.length,
  };
};
