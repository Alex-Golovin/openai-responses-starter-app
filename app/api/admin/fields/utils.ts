import { Field, FieldOption } from '@/models/Field';
import { makeSlug } from '@/lib/slug';

export async function ensureUniqueFieldKey(
  base: string,
  excludeId?: string
): Promise<string> {
  let candidate = base;
  let counter = 2;

  while (
    await Field.exists({
      key: candidate,
      ...(excludeId ? { _id: { $ne: excludeId } } : {}),
    })
  ) {
    candidate = `${base}-${counter}`;
    counter += 1;
  }

  return candidate;
}

export function normalizeEnumOptions(rawOptions: unknown): FieldOption[] {
  if (!Array.isArray(rawOptions)) {
    throw new Error('Додайте принаймні один варіант для списку значень');
  }

  const usedValues = new Set<string>();
  const normalized: FieldOption[] = [];

  for (const rawOption of rawOptions) {
    if (!rawOption || typeof rawOption !== 'object') {
      continue;
    }

    const option = rawOption as { label?: unknown; value?: unknown };
    const label = typeof option.label === 'string' ? option.label.trim() : '';

    if (!label) {
      throw new Error('Кожен варіант списку має містити назву');
    }

    const rawValue = typeof option.value === 'string' ? option.value.trim() : '';
    const baseValue = rawValue || makeSlug(label, { fallback: 'option' });

    let candidate = baseValue;
    let counter = 2;
    while (!candidate || usedValues.has(candidate)) {
      const suffixBase = rawValue || baseValue;
      candidate = `${suffixBase}-${counter}`;
      counter += 1;
    }

    usedValues.add(candidate);
    normalized.push({ label, value: candidate });
  }

  if (normalized.length === 0) {
    throw new Error('Додайте принаймні один варіант для списку значень');
  }

  return normalized;
}

export function sanitizeExtractHint(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function sanitizeLabel(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}
