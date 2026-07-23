import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import prisma from '../../../../../server/database/db';
import { DEFAULT_SETTINGS } from '../../../../types/settings';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // image or video
    const name = searchParams.get('name');

    if (!name || !type) {
      return NextResponse.json({ error: 'Missing name or type parameters' }, { status: 400 });
    }

    // Resolve folders
    const outputFolderSetting = await prisma.setting.findUnique({
      where: { key: 'outputFolder' },
    });
    const videoFolderSetting = await prisma.setting.findUnique({
      where: { key: 'videoFolder' },
    });

    const outputFolder = outputFolderSetting?.value || DEFAULT_SETTINGS.outputFolder;
    const videoFolder = videoFolderSetting?.value || DEFAULT_SETTINGS.videoFolder;

    const targetDir = type === 'video' ? videoFolder : outputFolder;
    const resolvedDir = path.resolve(process.cwd(), targetDir);
    const filePath = path.join(resolvedDir, name);

    // Security check: ensure the file stays inside the target directory
    if (!filePath.startsWith(resolvedDir)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    const fileBuffer = fs.readFileSync(filePath);
    const ext = path.extname(name).toLowerCase();
    
    let contentType = 'application/octet-stream';
    if (type === 'video') {
      if (ext === '.mp4') contentType = 'video/mp4';
      else if (ext === '.webm') contentType = 'video/webm';
    } else {
      if (ext === '.png') contentType = 'image/png';
      else if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
      else if (ext === '.webp') contentType = 'image/webp';
    }

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `inline; filename="${name}"`,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: `Failed to retrieve file: ${message}` },
      { status: 500 }
    );
  }
}
