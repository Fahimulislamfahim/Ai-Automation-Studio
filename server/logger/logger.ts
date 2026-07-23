import winston from 'winston';
import path from 'path';
import fs from 'fs';
import type { Server as SocketIOServer } from 'socket.io';
import type { ServerToClientEvents, ClientToServerEvents } from '../../src/types/events';
import prisma from '../database/db';

const LOG_DIR = path.resolve(process.cwd(), 'logs');

// Ensure log directory exists
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// Custom format for console output
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, action, jobId }) => {
    const prefix = typeof jobId === 'string' ? `[${jobId.slice(0, 8)}]` : '[system]';
    const actionStr = action ? ` (${action})` : '';
    return `${timestamp} ${level} ${prefix}${actionStr}: ${message}`;
  })
);

// Create winston logger
const winstonLogger = winston.createLogger({
  level: 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    // Console transport
    new winston.transports.Console({
      format: consoleFormat,
    }),
    // File transport - all logs
    new winston.transports.File({
      filename: path.join(LOG_DIR, 'combined.log'),
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
    }),
    // File transport - errors only
    new winston.transports.File({
      filename: path.join(LOG_DIR, 'error.log'),
      level: 'error',
      maxsize: 10 * 1024 * 1024,
      maxFiles: 5,
    }),
  ],
});

// Socket.IO reference for emitting log events
let io: SocketIOServer<ClientToServerEvents, ServerToClientEvents> | null = null;

export function setLoggerSocketIO(
  socketIO: SocketIOServer<ClientToServerEvents, ServerToClientEvents>
) {
  io = socketIO;
}

interface LogOptions {
  jobId?: string;
  action: string;
  duration?: number;
  metadata?: Record<string, unknown>;
}

/**
 * Main logger that writes to winston, SQLite, and emits via Socket.IO
 */
export const logger = {
  info(message: string, options: LogOptions) {
    winstonLogger.info(message, {
      action: options.action,
      jobId: options.jobId,
      duration: options.duration,
    });
    persistAndEmit('info', message, options);
  },

  warn(message: string, options: LogOptions) {
    winstonLogger.warn(message, {
      action: options.action,
      jobId: options.jobId,
      duration: options.duration,
    });
    persistAndEmit('warn', message, options);
  },

  error(message: string, options: LogOptions) {
    winstonLogger.error(message, {
      action: options.action,
      jobId: options.jobId,
      duration: options.duration,
    });
    persistAndEmit('error', message, options);
  },

  debug(message: string, options: LogOptions) {
    winstonLogger.debug(message, {
      action: options.action,
      jobId: options.jobId,
      duration: options.duration,
    });
    // Don't persist debug logs to DB (too noisy)
    if (io) {
      io.emit('log:new', {
        id: crypto.randomUUID(),
        jobId: options.jobId || null,
        level: 'debug',
        action: options.action,
        message,
        metadata: options.metadata ? JSON.stringify(options.metadata) : null,
        duration: options.duration || null,
        createdAt: new Date(),
      });
    }
  },
};

async function persistAndEmit(
  level: 'info' | 'warn' | 'error',
  message: string,
  options: LogOptions
) {
  try {
    const logEntry = await prisma.log.create({
      data: {
        jobId: options.jobId || null,
        level,
        action: options.action,
        message,
        metadata: options.metadata ? JSON.stringify(options.metadata) : null,
        duration: options.duration || null,
      },
    });

    // Emit via Socket.IO
    if (io) {
      io.emit('log:new', {
        ...logEntry,
        level: logEntry.level as 'info' | 'warn' | 'error',
      });
    }
  } catch (err) {
    winstonLogger.error('Failed to persist log entry', { error: err });
  }
}

export default logger;
