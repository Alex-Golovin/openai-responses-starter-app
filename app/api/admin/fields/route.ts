import { NextRequest, NextResponse } from 'next/server';

import { connectToDatabase } from '@/lib/mongoose';
import { Field } from '@/models/Field';
import { serializeDocument } from '@/app/api/admin/utils';
import { makeSlug } from '@/lib/slug';
import {
  ensureUniqueFieldKey,
  normalizeEnumOptions,
  sanitizeExtractHint,
  sanitizeLabel,
} from '@/app/api/admin/fields/utils';

export async function GET() {
  await connectToDatabase();
  const fields = await Field.find().sort({ createdAt: -1 }).lean();
  return NextResponse.json(fields.map(serializeDocument));
}

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    const payload = await request.json();
    const label = sanitizeLabel(payload.label);

    if (!label) {
      return NextResponse.json({ error: 'Вкажіть назву поля' }, { status: 400 });
    }

    const baseKeySource =
      typeof payload.key === 'string' && payload.key.trim()
        ? payload.key.trim()
        : label;

    const fieldData = {
      key: await ensureUniqueFieldKey(
        makeSlug(baseKeySource, { fallback: 'field' })
      ),
      label,
      type: payload.type,
      options:
        payload.type === 'enum' ? normalizeEnumOptions(payload.options) : undefined,
      extractHint: sanitizeExtractHint(payload.extractHint),
    };

    const field = await Field.create(fieldData);
    return NextResponse.json(serializeDocument(field.toObject()));
  } catch (error) {
    console.error('Failed to create field', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 }
    );
  }
}
