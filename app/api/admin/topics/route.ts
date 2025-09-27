import { NextRequest, NextResponse } from 'next/server';

import { connectToDatabase } from '@/lib/mongoose';
import { Topic } from '@/models/Topic';
import { serializeDocument } from '@/app/api/admin/utils';
import { normalizeTopicDocuments } from '@/app/api/admin/topics/utils';

export async function GET() {
  await connectToDatabase();
  const topics = await Topic.find().sort({ createdAt: -1 }).lean();
  return NextResponse.json(topics.map(serializeDocument));
}

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    const payload = await request.json();
    const documents = await normalizeTopicDocuments(payload.documents);
    const topic = await Topic.create({
      ...payload,
      documents,
    });
    return NextResponse.json(serializeDocument(topic.toObject()));
  } catch (error) {
    console.error('Failed to create topic', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 }
    );
  }
}
