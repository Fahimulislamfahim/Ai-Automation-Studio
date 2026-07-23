// Job-related types

export type JobStatus =
  | 'pending'
  | 'waiting'
  | 'running'
  | 'downloading'
  | 'completed'
  | 'failed'
  | 'retrying'
  | 'cancelled';

export type JobStage =
  | 'uploading'
  | 'generating_image'
  | 'downloading_image'
  | 'generating_video'
  | 'downloading_video'
  | null;

export interface Job {
  id: string;
  fileName: string;
  filePath: string;
  status: JobStatus;
  stage: JobStage;
  progress: number;
  retryCount: number;
  maxRetries: number;
  errorMessage: string | null;
  generatedImage: string | null;
  generatedVideo: string | null;
  processingTime: number | null;
  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface JobWithLogs extends Job {
  logs: LogEntry[];
}

export interface LogEntry {
  id: string;
  jobId: string | null;
  level: 'info' | 'warn' | 'error' | 'debug';
  action: string;
  message: string;
  metadata: string | null;
  duration: number | null;
  createdAt: Date;
}

export interface QueueStats {
  pending: number;
  waiting: number;
  running: number;
  completed: number;
  failed: number;
  total: number;
}

export interface TodayStats {
  imagesProcessed: number;
  videosGenerated: number;
  averageProcessingTime: number;
  errors: number;
  downloads: number;
}
