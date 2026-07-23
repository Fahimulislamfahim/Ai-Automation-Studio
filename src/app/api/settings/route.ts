import { NextRequest, NextResponse } from 'next/server';
import prisma from '../../../../server/database/db';
import { DEFAULT_SETTINGS } from '../../../types/settings';

export async function GET() {
  try {
    const settings = await prisma.setting.findMany();
    const settingsMap: Record<string, string> = {};

    for (const setting of settings) {
      settingsMap[setting.key] = setting.value;
    }

    // Merge with defaults
    const result: Record<string, unknown> = {};
    for (const [key, defaultValue] of Object.entries(DEFAULT_SETTINGS)) {
      result[key] = settingsMap[key] !== undefined ? settingsMap[key] : defaultValue;
    }

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    // Upsert each setting
    for (const [key, value] of Object.entries(body)) {
      await prisma.setting.upsert({
        where: { key },
        update: { value: String(value) },
        create: { key, value: String(value) },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    );
  }
}
