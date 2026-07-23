// Socket.IO event types

import type { Job, JobStatus, JobStage, QueueStats, TodayStats, LogEntry } from './job';

// Server -> Client events
export interface ServerToClientEvents {
  // Job events
  'job:created': (job: Job) => void;
  'job:updated': (job: Partial<Job> & { id: string }) => void;
  'job:completed': (job: Job) => void;
  'job:failed': (job: Job) => void;
  'job:progress': (data: { id: string; progress: number; stage: JobStage }) => void;

  // Queue events
  'queue:updated': (stats: QueueStats) => void;
  'queue:paused': () => void;
  'queue:resumed': () => void;

  // Browser events
  'browser:status': (status: BrowserStatus) => void;
  'browser:screenshot': (data: { base64: string; timestamp: number }) => void;

  // Log events
  'log:new': (log: LogEntry) => void;

  // System events
  'system:status': (status: SystemStatus) => void;

  // Watcher events
  'watcher:status': (status: WatcherStatus) => void;
  'watcher:new-file': (data: { fileName: string; filePath: string }) => void;
}

// Client -> Server events
export interface ClientToServerEvents {
  // Queue controls
  'queue:pause': () => void;
  'queue:resume': () => void;

  // Browser controls
  'browser:launch': () => void;
  'browser:close': () => void;

  // Job controls
  'job:retry': (jobId: string) => void;
  'job:cancel': (jobId: string) => void;

  // Request current state
  'state:request': () => void;
}

export interface BrowserStatus {
  connected: boolean;
  sessionValid: boolean;
  currentUrl: string | null;
  headless: boolean;
}

export interface SystemStatus {
  state: 'running' | 'stopped' | 'paused';
  uptime: number;
  browserConnected: boolean;
  watcherActive: boolean;
  queueStats: QueueStats;
  todayStats: TodayStats;
}

export interface WatcherStatus {
  active: boolean;
  watchPath: string;
  filesDetected: number;
}
