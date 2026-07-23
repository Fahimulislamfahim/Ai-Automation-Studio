import { NextResponse } from 'next/server';
import prisma from '../../../../../server/database/db';

export async function GET() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [imagesProcessed, videosGenerated, errors, allCompleted] = await Promise.all([
      prisma.job.count({
        where: {
          createdAt: { gte: today },
          generatedImage: { not: null },
        },
      }),
      prisma.job.count({
        where: {
          createdAt: { gte: today },
          generatedVideo: { not: null },
        },
      }),
      prisma.job.count({
        where: {
          createdAt: { gte: today },
          status: 'failed',
        },
      }),
      prisma.job.findMany({
        where: {
          createdAt: { gte: today },
          status: 'completed',
          processingTime: { not: null },
        },
        select: { processingTime: true },
      }),
    ]);

    const avgTime =
      allCompleted.length > 0
        ? allCompleted.reduce(
            (sum: number, j: { processingTime: number | null }) => sum + (j.processingTime || 0),
            0
          ) / allCompleted.length
        : 0;

    return NextResponse.json({
      imagesProcessed,
      videosGenerated,
      averageProcessingTime: Math.round(avgTime),
      errors,
      downloads: imagesProcessed + videosGenerated,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}
