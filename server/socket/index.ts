import { Server as SocketIOServer } from 'socket.io';
import type { Server as HTTPServer } from 'http';
import type { ServerToClientEvents, ClientToServerEvents } from '../../src/types/events';
import { queueManager } from '../queue/queue-manager';
import { browserManager } from '../automation/browser-manager';
import { folderWatcher } from '../watcher/folder-watcher';
import { logger } from '../logger/logger';

let io: SocketIOServer<ClientToServerEvents, ServerToClientEvents>;

export function initSocketIO(httpServer: HTTPServer) {
  io = new SocketIOServer<ClientToServerEvents, ServerToClientEvents>(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
    transports: ['websocket', 'polling'],
  });

  io.on('connection', (socket) => {
    logger.debug('Client connected', { action: 'socket_connect' });

    // Send initial state on connect
    socket.on('state:request', async () => {
      const queueStats = await queueManager.getStats();
      const browserStatus = browserManager.getStatus();
      const watcherStatus = folderWatcher.getStatus();

      socket.emit('queue:updated', queueStats);
      socket.emit('browser:status', browserStatus);
      socket.emit('watcher:status', watcherStatus);
    });

    // Queue controls
    socket.on('queue:pause', () => {
      queueManager.pause();
    });

    socket.on('queue:resume', () => {
      queueManager.resume();
    });

    // Browser controls
    socket.on('browser:launch', async () => {
      try {
        await browserManager.launch();
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logger.error(`Failed to launch browser: ${message}`, {
          action: 'browser_launch',
        });
      }
    });

    socket.on('browser:close', async () => {
      await browserManager.close();
    });

    // Job controls
    socket.on('job:retry', async (jobId: string) => {
      await queueManager.retryJob(jobId);
    });

    socket.on('job:cancel', async (jobId: string) => {
      await queueManager.cancelJob(jobId);
    });

    socket.on('disconnect', () => {
      logger.debug('Client disconnected', { action: 'socket_disconnect' });
    });
  });

  return io;
}

export function getIO() {
  return io;
}
