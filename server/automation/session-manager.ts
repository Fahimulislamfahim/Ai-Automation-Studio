import type { Page } from 'playwright';
import { browserManager } from './browser-manager';
import { logger } from '../logger/logger';

const GOOGLE_ACCOUNTS_URL = 'https://accounts.google.com';
const GOOGLE_FLOW_URL = 'https://labs.google/fx/tools/flow';
const GOOGLE_VALIDATION_URL = 'https://myaccount.google.com';

export class SessionManager {
  private sessionValid: boolean = false;

  /**
   * Check if the user is logged into Google by navigating to a lightweight page
   * and checking if we are redirected to a login screen.
   */
  async validateSession(): Promise<boolean> {
    if (!browserManager.isConnected()) {
      this.sessionValid = false;
      return false;
    }

    try {
      const page = await browserManager.getPage();

      // Navigate to lightweight Google account page
      logger.info('Validating Google login session...', { action: 'session_validate' });
      await page.goto(GOOGLE_VALIDATION_URL, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await page.waitForTimeout(2000);

      // Check if we are on the account page or redirected to sign-in page
      const currentUrl = page.url();
      const isLoggedIn =
        currentUrl.includes('myaccount.google.com') &&
        !currentUrl.includes('accounts.google.com/v3/signin') &&
        !currentUrl.includes('accounts.google.com/ServiceLogin') &&
        !currentUrl.includes('accounts.google.com/signin');

      await page.close();

      this.sessionValid = isLoggedIn;

      if (isLoggedIn) {
        logger.info('Google session verified: Logged in successfully', { action: 'session_validate' });
      } else {
        logger.warn('Google session invalid: Redirected to sign-in page', {
          action: 'session_validate',
        });
      }

      return isLoggedIn;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`Session validation failed: ${message}`, {
        action: 'session_validate',
      });
      this.sessionValid = false;
      return false;
    }
  }

  /**
   * Open the Google login page for the user to log in manually.
   * The persistent context will automatically save the session.
   */
  async openLoginPage(): Promise<void> {
    if (!browserManager.isConnected()) {
      await browserManager.launch();
    }

    const page = await browserManager.getPage();
    await page.goto(GOOGLE_ACCOUNTS_URL, { waitUntil: 'domcontentloaded' });
    logger.info('Opened Google login page - please log in manually', {
      action: 'session_login',
    });
  }

  /**
   * Wait for the user to complete the login process.
   * Polls the current URL to detect when login is complete.
   */
  async waitForLogin(page: Page, timeoutMs: number = 300000): Promise<boolean> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      const url = page.url();
      // Check if user has navigated away from login pages
      if (
        !url.includes('accounts.google.com') &&
        !url.includes('signin')
      ) {
        this.sessionValid = true;
        logger.info('Login completed successfully', { action: 'session_login' });
        return true;
      }
      await page.waitForTimeout(2000);
    }

    logger.warn('Login timed out', { action: 'session_login' });
    return false;
  }

  isSessionValid(): boolean {
    return this.sessionValid;
  }
}

export const sessionManager = new SessionManager();
export default sessionManager;
