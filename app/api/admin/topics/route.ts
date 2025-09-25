import { NextRequest, NextResponse } from 'next/server';

import { connectToDatabase } from '@/lib/mongoose';
import { Topic } from '@/models/Topic';
import { serializeDocument } from '@/app/api/admin/utils';

export async function GET() {
  await connectToDatabase();
  const topics = await Topic.find().sort({ createdAt: -1 }).lean();
  return NextResponse.json(topics.map(serializeDocument));
}

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    const payload = await request.json();
    const topic = await Topic.create(payload);
    return NextResponse.json(serializeDocument(topic.toObject()));
  } catch (error) {
    console.error('Failed to create topic', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 }
    );
  }
}
