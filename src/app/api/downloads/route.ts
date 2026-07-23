import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import prisma from '../../../../server/database/db';
import { DEFAULT_SETTINGS } from '../../../types/settings';
import { isSupportedImage } from '../../../../server/utils/file-utils';

export async function GET(request: NextRequest) {
  try {
    // Load output folder (images) and video folder
    const outputFolderSetting = await prisma.setting.findUnique({
      where: { key: 'outputFolder' },
    });
    const videoFolderSetting = await prisma.setting.findUnique({
      where: { key: 'videoFolder' },
    });

    const outputFolder = outputFolderSetting?.value || DEFAULT_SETTINGS.outputFolder;
    const videoFolder = videoFolderSetting?.value || DEFAULT_SETTINGS.videoFolder;

    const resolvedImagesDir = path.resolve(process.cwd(), outputFolder);
    const resolvedVideosDir = path.resolve(process.cwd(), videoFolder);

    const images: any[] = [];
    const videos: any[] = [];

    // Scan generated images directory
    if (fs.existsSync(resolvedImagesDir)) {
      const files = fs.readdirSync(resolvedImagesDir);
      for (const file of files) {
        if (isSupportedImage(file)) {
          const filePath = path.join(resolvedImagesDir, file);
          const stats = fs.statSync(filePath);
          images.push({
            name: file,
            path: `/api/downloads/file?type=image&name=${encodeURIComponent(file)}`,
            size: stats.size,
            createdAt: stats.birthtime,
          });
        }
      }
    }

    // Scan generated videos directory
    if (fs.existsSync(resolvedVideosDir)) {
      const files = fs.readdirSync(resolvedVideosDir);
      for (const file of files) {
        const ext = path.extname(file).toLowerCase();
        if (['.mp4', '.mkv', '.avi', '.mov', '.webm'].includes(ext)) {
          const filePath = path.join(resolvedVideosDir, file);
          const stats = fs.statSync(filePath);
          videos.push({
            name: file,
            path: `/api/downloads/file?type=video&name=${encodeURIComponent(file)}`,
            size: stats.size,
            createdAt: stats.birthtime,
          });
        }
      }
    }

    // Sort by createdAt descending
    images.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    videos.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return NextResponse.json({ images, videos });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: `Failed to fetch downloads: ${message}` },
      { status: 500 }
    );
  }
}
