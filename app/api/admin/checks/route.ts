import { NextRequest, NextResponse } from 'next/server';

import { connectToDatabase } from '@/lib/mongoose';
import { Check } from '@/models/Check';
import { serializeDocument } from '@/app/api/admin/utils';

export async function GET() {
  await connectToDatabase();
  const checks = await Check.find().sort({ createdAt: -1 }).lean();
  return NextResponse.json(checks.map(serializeDocument));
}

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    const payload = await request.json();
    const check = await Check.create(payload);
    return NextResponse.json(serializeDocument(check.toObject()));
  } catch (error) {
    console.error('Failed to create check', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 }
    );
  }
}
