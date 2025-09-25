import { NextRequest, NextResponse } from 'next/server';

import { connectToDatabase } from '@/lib/mongoose';
import { DocumentTemplate } from '@/models/DocumentTemplate';
import { serializeDocument } from '@/app/api/admin/utils';

export async function GET() {
  await connectToDatabase();
  const templates = await DocumentTemplate.find().sort({ createdAt: -1 }).lean();
  return NextResponse.json(templates.map(serializeDocument));
}

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    const payload = await request.json();
    const template = await DocumentTemplate.create(payload);
    return NextResponse.json(serializeDocument(template.toObject()));
  } catch (error) {
    console.error('Failed to create document template', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 }
    );
  }
}
