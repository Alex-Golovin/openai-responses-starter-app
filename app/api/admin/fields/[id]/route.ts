import { NextRequest, NextResponse } from 'next/server';

import { connectToDatabase } from '@/lib/mongoose';
import { Field } from '@/models/Field';
import { serializeDocument } from '@/app/api/admin/utils';

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

    const field = await Field.findByIdAndUpdate(id, payload, {
      new: true,
      runValidators: true,
    });

    if (!field) {
      return NextResponse.json({ error: 'Field not found' }, { status: 404 });
    }

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
