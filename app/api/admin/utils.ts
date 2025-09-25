import { Types } from 'mongoose';

type SerializableDoc<T> = T & { id?: string };

function convertValue(value: unknown): unknown {
  if (value instanceof Types.ObjectId) {
    return value.toString();
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return value.map(convertValue);
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, val]) => [
        key,
        convertValue(val),
      ])
    );
  }

  return value;
}

export function serializeDocument<T extends { _id?: unknown }>(doc: T): SerializableDoc<T> {
  const converted = convertValue(doc) as SerializableDoc<T> & { _id?: string };
  if (converted._id && typeof converted._id !== 'string') {
    converted._id = String(converted._id);
  }
  if (converted._id) {
    converted.id = converted._id;
  }
  return converted;
}
