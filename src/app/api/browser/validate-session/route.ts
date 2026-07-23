import { NextResponse } from 'next/server';
import { sessionManager } from '../../../../../server/automation/session-manager';
import { browserManager } from '../../../../../server/automation/browser-manager';

export async function POST() {
  try {
    if (!browserManager.isConnected()) {
      await browserManager.launch();
    }
    const isValid = await sessionManager.validateSession();
    return NextResponse.json({ valid: isValid });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Session validation failed' },
      { status: 500 }
    );
  }
}
