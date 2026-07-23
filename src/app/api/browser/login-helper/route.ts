import { NextResponse } from 'next/server';
import { sessionManager } from '../../../../../server/automation/session-manager';

export async function POST() {
  try {
    await sessionManager.openLoginPage();
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to open login page' },
      { status: 500 }
    );
  }
}
