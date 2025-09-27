import { DocumentTemplate } from '@/models/DocumentTemplate';
import { makeSlug } from '@/lib/slug';

export type NormalizedTopicDocument = {
  templateId: string;
  alias: string;
  required: boolean;
};

export async function normalizeTopicDocuments(
  rawDocuments: unknown
): Promise<NormalizedTopicDocument[]> {
  if (!Array.isArray(rawDocuments)) {
    return [];
  }

  const validDocuments = rawDocuments
    .filter((doc) => doc && typeof doc === 'object')
    .map((doc) => doc as { templateId?: unknown; alias?: unknown; required?: unknown })
    .filter((doc) => typeof doc.templateId === 'string' && doc.templateId.trim().length > 0);

  if (validDocuments.length === 0) {
    return [];
  }

  const templateIds = Array.from(
    new Set(validDocuments.map((doc) => doc.templateId as string))
  );

  const templates = await DocumentTemplate.find({
    _id: { $in: templateIds },
  })
    .select('name')
    .lean();

  const templateNameMap = new Map<string, string>(
    templates.map((template) => [template._id.toString(), template.name])
  );

  const aliasSet = new Set<string>();

  return validDocuments.map((doc) => {
    const templateId = (doc.templateId as string).trim();
    const aliasSource = typeof doc.alias === 'string' ? doc.alias.trim() : '';
    const templateName = templateNameMap.get(templateId) || '';
    const baseSource = aliasSource || templateName || 'document';
    const baseAlias = makeSlug(baseSource, { fallback: 'document' });

    let alias = baseAlias;
    let counter = 2;
    while (!alias || aliasSet.has(alias)) {
      alias = `${baseAlias}-${counter}`;
      counter += 1;
    }

    aliasSet.add(alias);

    return {
      templateId,
      alias,
      required: Boolean(doc.required ?? true),
    };
  });
}
