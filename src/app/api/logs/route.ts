import { NextRequest, NextResponse } from 'next/server';
import prisma from '../../../../server/database/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const level = searchParams.get('level');
    const jobId = searchParams.get('jobId');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '100');
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (level) where.level = level;
    if (jobId) where.jobId = jobId;
    if (search) {
      where.OR = [
        { message: { contains: search } },
        { action: { contains: search } },
      ];
    }

    const [logs, total] = await Promise.all([
      prisma.log.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.log.count({ where }),
    ]);

    return NextResponse.json({ logs, total, page, limit });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch logs' },
      { status: 500 }
    );
  }
}
