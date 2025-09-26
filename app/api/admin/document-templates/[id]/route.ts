import { NextRequest, NextResponse } from 'next/server';

import { connectToDatabase } from '@/lib/mongoose';
import { DocumentTemplate } from '@/models/DocumentTemplate';
import { serializeDocument } from '@/app/api/admin/utils';

interface RouteParams {
  params: { id: string };
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    await connectToDatabase();
    const payload = await request.json();
    const fieldIds = Array.isArray(payload.fieldIds) ? payload.fieldIds : [];
    const checks = Array.isArray(payload.checks)
      ? payload.checks
          .map((item: unknown) => {
            if (!item || typeof item !== 'object') {
              return null;
            }
            const { checkId, mode } = item as {
              checkId?: string;
              mode?: string;
            };
            if (!checkId) {
              return null;
            }
            const normalizedMode = mode === 'multi_doc' ? 'multi_doc' : 'single_doc';
            return { checkId, mode: normalizedMode };
          })
          .filter(Boolean)
      : [];
    const template = await DocumentTemplate.findByIdAndUpdate(
      params.id,
      {
        name: payload.name,
        fieldIds,
        checks,
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!template) {
      return NextResponse.json(
        { error: 'Document template not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(serializeDocument(template.toObject()));
  } catch (error) {
    console.error('Failed to update document template', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 }
    );
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    await connectToDatabase();
    const template = await DocumentTemplate.findByIdAndDelete(params.id);
    if (!template) {
      return NextResponse.json(
        { error: 'Document template not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete document template', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 }
    );
  }
}
