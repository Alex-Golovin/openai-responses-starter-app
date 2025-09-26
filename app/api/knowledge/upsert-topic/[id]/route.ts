import { NextRequest, NextResponse } from 'next/server';

import { upsertTopicKnowledge } from '@/lib/knowledge/vectorStore';

type RouteContext = {
  params: Promise<{ id: string | string[] | undefined }>;
};

export async function POST(_request: NextRequest, context: RouteContext) {
  try {
    const params = await context.params;
    const idParam = params?.id;
    const id = Array.isArray(idParam) ? idParam[0] : idParam;
    if (!id) {
      return NextResponse.json(
        { error: 'Topic id is required' },
        { status: 400 }
      );
    }

    const result = await upsertTopicKnowledge(id);
    return NextResponse.json({
      message: 'Тему відправлено на оновлення у Vector Store',
      result,
    });
  } catch (error) {
    console.error('Failed to upsert topic knowledge', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
