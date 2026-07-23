import { createServer } from 'http';
import next from 'next';
import { initSocketIO } from './socket/index';
import { setLoggerSocketIO, logger } from './logger/logger';
import { browserManager } from './automation/browser-manager';
import { queueManager } from './queue/queue-manager';
import { folderWatcher } from './watcher/folder-watcher';
import { ensureDir } from './utils/file-utils';

const port = parseInt(process.env.PORT || '3000', 10);
const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOSTNAME || 'localhost';

// Initialize Next.js
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// Ensure data directories exist
const DATA_DIRS = [
  'data/input',
  'data/generated-images',
  'data/generated-videos',
  'data/completed',
  'data/failed',
  'data/temp',
  'data/downloads',
  'data/browser-data',
  'logs',
];

async function main() {
  try {
    // Create data directories
    DATA_DIRS.forEach((dir) => ensureDir(dir));

    // Prepare Next.js
    await app.prepare();

    // Create HTTP server
    const httpServer = createServer((req, res) => {
      handle(req, res);
    });

    // Initialize Socket.IO
    const io = initSocketIO(httpServer);

    // Connect Socket.IO to logger
    setLoggerSocketIO(io);

    // Connect Socket.IO to services
    browserManager.setSocketIO(io);
    queueManager.setSocketIO(io);
    folderWatcher.setSocketIO(io);

    // Start folder watcher
    await folderWatcher.start();

    // Start listening
    httpServer.listen(port, () => {
      logger.info(`AI Automation Studio running at http://${hostname}:${port}`, {
        action: 'server_start',
      });
      logger.info(`Environment: ${dev ? 'development' : 'production'}`, {
        action: 'server_start',
      });
    });

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info(`${signal} received, shutting down...`, { action: 'server_shutdown' });

      await folderWatcher.stop();
      await browserManager.close();
      httpServer.close();

      process.exit(0);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

main();
