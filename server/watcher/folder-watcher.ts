import { FSWatcher, watch } from 'chokidar';
import path from 'path';
import type { Server as SocketIOServer } from 'socket.io';
import type { ServerToClientEvents, ClientToServerEvents, WatcherStatus } from '../../src/types/events';
import { queueManager } from '../queue/queue-manager';
import { logger } from '../logger/logger';
import { isSupportedImage, resolvePath, ensureDir } from '../utils/file-utils';
import { DEFAULT_SETTINGS } from '../../src/types/settings';
import prisma from '../database/db';

export class FolderWatcher {
  private watcher: FSWatcher | null = null;
  private io: SocketIOServer<ClientToServerEvents, ServerToClientEvents> | null = null;
  private watchPath: string = '';
  private filesDetected: number = 0;
  private active: boolean = false;

  setSocketIO(io: SocketIOServer<ClientToServerEvents, ServerToClientEvents>) {
    this.io = io;
  }

  /**
   * Start watching the input folder for new images
   */
  async start(): Promise<void> {
    // Load input folder from settings or use default
    const inputFolderSetting = await prisma.setting.findUnique({
      where: { key: 'inputFolder' },
    });
    const inputFolder = inputFolderSetting?.value || DEFAULT_SETTINGS.inputFolder;
    this.watchPath = resolvePath(inputFolder);

    // Ensure the directory exists
    ensureDir(this.watchPath);

    logger.info(`Starting folder watcher: ${this.watchPath}`, {
      action: 'watcher_start',
    });

    // Create watcher
    this.watcher = watch(this.watchPath, {
      ignored: /(^|[\/\\])\../, // Ignore dotfiles
      persistent: true,
      ignoreInitial: true, // Don't process existing files
      awaitWriteFinish: {
        stabilityThreshold: 2000, // Wait 2s after last write
        pollInterval: 100,
      },
    });

    // Handle new files
    this.watcher.on('add', async (filePath: string) => {
      if (!isSupportedImage(filePath)) {
        logger.debug(`Ignoring non-image file: ${path.basename(filePath)}`, {
          action: 'watcher_ignore',
        });
        return;
      }

      this.filesDetected++;
      const fileName = path.basename(filePath);

      logger.info(`New image detected: ${fileName}`, {
        action: 'watcher_detected',
      });

      if (this.io) {
        this.io.emit('watcher:new-file', { fileName, filePath });
      }

      // Create job and add to queue
      await queueManager.addJob(fileName, filePath);
      this.emitStatus();
    });

    this.watcher.on('error', (error: any) => {
      logger.error(`Watcher error: ${error?.message || String(error)}`, {
        action: 'watcher_error',
      });
    });

    this.watcher.on('ready', () => {
      this.active = true;
      logger.info('Folder watcher ready', { action: 'watcher_ready' });
      this.emitStatus();
    });
  }

  /**
   * Stop watching
   */
  async stop(): Promise<void> {
    if (this.watcher) {
      await this.watcher.close();
      this.watcher = null;
    }
    this.active = false;
    logger.info('Folder watcher stopped', { action: 'watcher_stop' });
    this.emitStatus();
  }

  /**
   * Restart the watcher (e.g., after settings change)
   */
  async restart(): Promise<void> {
    await this.stop();
    await this.start();
  }

  /**
   * Get watcher status
   */
  getStatus(): WatcherStatus {
    return {
      active: this.active,
      watchPath: this.watchPath,
      filesDetected: this.filesDetected,
    };
  }

  /**
   * Emit status via Socket.IO
   */
  private emitStatus(): void {
    if (this.io) {
      this.io.emit('watcher:status', this.getStatus());
    }
  }
}

export const folderWatcher = new FolderWatcher();
export default folderWatcher;
