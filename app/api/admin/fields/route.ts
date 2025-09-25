import { NextRequest, NextResponse } from 'next/server';

import { connectToDatabase } from '@/lib/mongoose';
import { Field } from '@/models/Field';
import { serializeDocument } from '@/app/api/admin/utils';

export async function GET() {
  await connectToDatabase();
  const fields = await Field.find().sort({ createdAt: -1 }).lean();
  return NextResponse.json(fields.map(serializeDocument));
}

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    const payload = await request.json();
    const field = await Field.create(payload);
    return NextResponse.json(serializeDocument(field.toObject()));
  } catch (error) {
    console.error('Failed to create field', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 }
    );
  }
}
