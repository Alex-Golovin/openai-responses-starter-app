import { NextRequest, NextResponse } from 'next/server';

import { connectToDatabase } from '@/lib/mongoose';
import { Check } from '@/models/Check';
import { DocumentTemplate } from '@/models/DocumentTemplate';
import { serializeDocument } from '@/app/api/admin/utils';

type RouteContext = {
  params: Promise<{ id: string | string[] | undefined }>;
};

export async function PUT(
  request: NextRequest,
  context: RouteContext
) {
  try {
    await connectToDatabase();
    const payload = await request.json();

    const params = await context.params;
    const idParam = params?.id;
    const id = Array.isArray(idParam) ? idParam[0] : idParam;

    if (!id) {
      return NextResponse.json({ error: 'Check id is required' }, { status: 400 });
    }

    const update = {
      description: payload.description,
      whenExpr: payload.whenExpr,
      rules: Array.isArray(payload.rules) ? payload.rules : [],
      severity: payload.severity,
      onFail: payload.onFail,
    };

    const check = await Check.findByIdAndUpdate(id, update, {
      new: true,
      runValidators: true,
    });

    if (!check) {
      return NextResponse.json({ error: 'Check not found' }, { status: 404 });
    }

    return NextResponse.json(serializeDocument(check.toObject()));
  } catch (error) {
    console.error('Failed to update check', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    await connectToDatabase();
    const params = await context.params;
    const idParam = params?.id;
    const id = Array.isArray(idParam) ? idParam[0] : idParam;

    if (!id) {
      return NextResponse.json({ error: 'Check id is required' }, { status: 400 });
    }

    const check = await Check.findByIdAndDelete(id);
    if (!check) {
      return NextResponse.json({ error: 'Check not found' }, { status: 404 });
    }

    await DocumentTemplate.updateMany(
      { 'checks.checkId': id },
      { $pull: { checks: { checkId: id } } }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete check', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 }
    );
  }
}
