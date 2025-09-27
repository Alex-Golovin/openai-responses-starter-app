import slug from 'slug';

slug.defaults.mode = 'rfc3986';

type SlugOptions = {
  fallback?: string;
};

export function makeSlug(value: string, options: SlugOptions = {}): string {
  const trimmed = value?.trim?.() ?? '';
  const result = slug(trimmed, { lower: true, trim: true });
  if (result) {
    return result;
  }
  const fallback = options.fallback ?? 'item';
  const fallbackResult = slug(fallback, { lower: true, trim: true });
  return fallbackResult || fallback;
}
