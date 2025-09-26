import { NextResponse } from 'next/server';

import { reindexKnowledge } from '@/lib/knowledge/vectorStore';

export async function POST() {
  try {
    const result = await reindexKnowledge();
    return NextResponse.json({
      message: 'Повна перебудова бази знань запущена',
      result,
    });
  } catch (error) {
    console.error('Failed to reindex knowledge', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
