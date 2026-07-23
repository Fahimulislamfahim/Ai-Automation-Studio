import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { ensureDir } from '../../../../server/utils/file-utils';
import { DEFAULT_SETTINGS } from '../../../types/settings';
import prisma from '../../../../server/database/db';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Resolve input folder
    const inputFolderSetting = await prisma.setting.findUnique({
      where: { key: 'inputFolder' },
    });
    const inputFolder = inputFolderSetting?.value || DEFAULT_SETTINGS.inputFolder;
    const resolvedInputFolder = path.resolve(process.cwd(), inputFolder);

    ensureDir(resolvedInputFolder);

    const filePath = path.join(resolvedInputFolder, file.name);
    fs.writeFileSync(filePath, buffer);

    return NextResponse.json({
      success: true,
      fileName: file.name,
      filePath,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: `Upload failed: ${message}` },
      { status: 500 }
    );
  }
}
