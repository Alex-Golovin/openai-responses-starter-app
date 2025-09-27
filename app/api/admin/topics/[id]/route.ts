import { NextRequest, NextResponse } from 'next/server';

import { connectToDatabase } from '@/lib/mongoose';
import { Topic } from '@/models/Topic';
import { serializeDocument } from '@/app/api/admin/utils';
import { normalizeTopicDocuments } from '@/app/api/admin/topics/utils';

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
      return NextResponse.json({ error: 'Topic id is required' }, { status: 400 });
    }

    const updateData = { ...payload };

    if (Object.prototype.hasOwnProperty.call(payload, 'documents')) {
      updateData.documents = await normalizeTopicDocuments(payload.documents);
    }

    const topic = await Topic.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!topic) {
      return NextResponse.json({ error: 'Topic not found' }, { status: 404 });
    }

    return NextResponse.json(serializeDocument(topic.toObject()));
  } catch (error) {
    console.error('Failed to update topic', error);
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
      return NextResponse.json({ error: 'Topic id is required' }, { status: 400 });
    }

    const topic = await Topic.findByIdAndDelete(id);
    if (!topic) {
      return NextResponse.json({ error: 'Topic not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete topic', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 }
    );
  }
}
