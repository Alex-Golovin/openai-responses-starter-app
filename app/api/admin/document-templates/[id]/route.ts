import { NextRequest, NextResponse } from 'next/server';

import { connectToDatabase } from '@/lib/mongoose';
import { DocumentTemplate } from '@/models/DocumentTemplate';
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
      return NextResponse.json(
        { error: 'Document template id is required' },
        { status: 400 }
      );
    }
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
      id,
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

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    await connectToDatabase();
    const params = await context.params;
    const idParam = params?.id;
    const id = Array.isArray(idParam) ? idParam[0] : idParam;

    if (!id) {
      return NextResponse.json(
        { error: 'Document template id is required' },
        { status: 400 }
      );
    }

    const template = await DocumentTemplate.findByIdAndDelete(id);
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
