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

type RouteContext = {
  params: Promise<{ id: string | string[] | undefined }>;
};

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    await connectToDatabase();
    const payload = await request.json();
    const params = await context.params;
    const idParam = params?.id;
    const id = Array.isArray(idParam) ? idParam[0] : idParam;

    if (!id) {
      return NextResponse.json({ error: 'Field id is required' }, { status: 400 });
    }

    const field = await Field.findById(id);

    if (!field) {
      return NextResponse.json({ error: 'Field not found' }, { status: 404 });
    }

    if (payload.label !== undefined) {
      const nextLabel = sanitizeLabel(payload.label);
      if (!nextLabel) {
        return NextResponse.json({ error: 'Вкажіть назву поля' }, { status: 400 });
      }
      field.label = nextLabel;
    }

    const requestedType = payload.type ?? field.type;
    field.type = requestedType;

    if (payload.key !== undefined) {
      const keySource = sanitizeLabel(payload.key);
      if (!keySource) {
        return NextResponse.json(
          { error: 'Ключ поля не може бути порожнім' },
          { status: 400 }
        );
      }
      const uniqueKey = await ensureUniqueFieldKey(
        makeSlug(keySource, { fallback: 'field' }),
        field.id.toString()
      );
      field.key = uniqueKey;
    }

    if (requestedType === 'enum') {
      const rawOptions =
        payload.options !== undefined ? payload.options : field.options;
      field.options = normalizeEnumOptions(rawOptions);
    } else {
      field.options = undefined;
    }

    if (payload.extractHint !== undefined) {
      field.extractHint = sanitizeExtractHint(payload.extractHint);
    }

    await field.save();

    return NextResponse.json(serializeDocument(field.toObject()));
  } catch (error) {
    console.error('Failed to update field', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 }
    );
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    await connectToDatabase();
    const params = await context.params;
    const idParam = params?.id;
    const id = Array.isArray(idParam) ? idParam[0] : idParam;

    if (!id) {
      return NextResponse.json({ error: 'Field id is required' }, { status: 400 });
    }

    const field = await Field.findByIdAndDelete(id);
    if (!field) {
      return NextResponse.json({ error: 'Field not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete field', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 }
    );
  }
}
