import { chromium, type Browser, type BrowserContext, type Page } from 'playwright';
import path from 'path';
import type { Server as SocketIOServer } from 'socket.io';
import type { ServerToClientEvents, ClientToServerEvents, BrowserStatus } from '../../src/types/events';
import { logger } from '../logger/logger';
import { ensureDir } from '../utils/file-utils';

const BROWSER_DATA_DIR = path.resolve(process.cwd(), 'data/browser-data');

export class BrowserManager {
  private context: BrowserContext | null = null;
  private io: SocketIOServer<ClientToServerEvents, ServerToClientEvents> | null = null;
  private headless: boolean = false;
  private slowMotion: number = 0;
  private autoRestart: boolean = true;
  private isClosing: boolean = false;

  constructor() {
    ensureDir(BROWSER_DATA_DIR);
  }

  setSocketIO(io: SocketIOServer<ClientToServerEvents, ServerToClientEvents>) {
    this.io = io;
  }

  configure(options: { headless?: boolean; slowMotion?: number; autoRestart?: boolean }) {
    if (options.headless !== undefined) this.headless = options.headless;
    if (options.slowMotion !== undefined) this.slowMotion = options.slowMotion;
    if (options.autoRestart !== undefined) this.autoRestart = options.autoRestart;
  }

  private launchPromise: Promise<BrowserContext> | null = null;

  /**
   * Launch a persistent browser context.
   * This reuses the same user data directory so Google login is preserved.
   */
  async launch(): Promise<BrowserContext> {
    if (this.context) {
      return this.context;
    }

    if (this.launchPromise) {
      logger.info('Browser launch already in progress, awaiting existing launch...', {
        action: 'browser_launch',
      });
      return this.launchPromise;
    }

    this.launchPromise = this.performLaunch();

    try {
      const context = await this.launchPromise;
      return context;
    } finally {
      this.launchPromise = null;
    }
  }

  private async performLaunch(retryCount = 0): Promise<BrowserContext> {
    logger.info('Launching browser...', { action: 'browser_launch' });

    try {
      this.context = await chromium.launchPersistentContext(BROWSER_DATA_DIR, {
        headless: this.headless,
        slowMo: this.slowMotion,
        viewport: { width: 1440, height: 900 },
        args: [
          '--disable-blink-features=AutomationControlled',
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
        ],
        ignoreDefaultArgs: ['--enable-automation'],
        acceptDownloads: true,
      });

      // Listen for context close (crash, manual close, etc.)
      this.context.on('close', () => {
        if (!this.isClosing) {
          logger.warn('Browser closed unexpectedly', { action: 'browser_crash' });
          this.context = null;
          this.emitStatus();

          if (this.autoRestart) {
            logger.info('Auto-restarting browser in 3s...', { action: 'browser_restart' });
            setTimeout(() => this.launch(), 3000);
          }
        }
      });

      this.emitStatus();
      logger.info('Browser launched successfully', { action: 'browser_launch' });
      return this.context;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      
      // If profile is locked and we haven't retried yet, wait 2s and try again
      if (
        (message.includes('existing browser session') || message.includes('profile is already in use')) &&
        retryCount < 2
      ) {
        logger.warn(`Browser profile locked (attempt ${retryCount + 1}). Retrying in 2s...`, {
          action: 'browser_launch_retry',
        });
        await new Promise((resolve) => setTimeout(resolve, 2000));
        return this.performLaunch(retryCount + 1);
      }

      logger.error(`Failed to launch browser: ${message}`, { action: 'browser_launch' });
      throw error;
    }
  }

  /**
   * Get a new page from the browser context
   */
  async getPage(): Promise<Page> {
    const context = await this.launch();
    const page = await context.newPage();
    return page;
  }

  /**
   * Close the browser
   */
  async close(): Promise<void> {
    if (!this.context) return;

    this.isClosing = true;
    logger.info('Closing browser...', { action: 'browser_close' });

    try {
      await this.context.close();
    } catch (error) {
      // Context may already be closed
    }

    this.context = null;
    this.isClosing = false;
    this.emitStatus();
    logger.info('Browser closed', { action: 'browser_close' });
  }

  /**
   * Check if the browser is connected and running
   */
  isConnected(): boolean {
    return this.context !== null;
  }

  /**
   * Get the current browser status
   */
  getStatus(): BrowserStatus {
    return {
      connected: this.isConnected(),
      sessionValid: this.isConnected(), // Will be enhanced by SessionManager
      currentUrl: null,
      headless: this.headless,
    };
  }

  /**
   * Emit browser status via Socket.IO
   */
  private emitStatus() {
    if (this.io) {
      this.io.emit('browser:status', this.getStatus());
    }
  }

  /**
   * Get the browser context (null if not launched)
   */
  getContext(): BrowserContext | null {
    return this.context;
  }
}

// Singleton instance
export const browserManager = new BrowserManager();
export default browserManager;
