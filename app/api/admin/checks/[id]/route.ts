import { NextRequest, NextResponse } from 'next/server';

import { connectToDatabase } from '@/lib/mongoose';
import { Check } from '@/models/Check';
import { DocumentTemplate } from '@/models/DocumentTemplate';
import { serializeDocument } from '@/app/api/admin/utils';

interface RouteParams {
  params: { id: string };
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    await connectToDatabase();
    const payload = await request.json();

    const update = {
      description: payload.description,
      whenExpr: payload.whenExpr,
      rules: Array.isArray(payload.rules) ? payload.rules : [],
      severity: payload.severity,
      onFail: payload.onFail,
    };

    const check = await Check.findByIdAndUpdate(params.id, update, {
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

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    await connectToDatabase();
    const check = await Check.findByIdAndDelete(params.id);
    if (!check) {
      return NextResponse.json({ error: 'Check not found' }, { status: 404 });
    }

    await DocumentTemplate.updateMany(
      { 'checks.checkId': params.id },
      { $pull: { checks: { checkId: params.id } } }
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
