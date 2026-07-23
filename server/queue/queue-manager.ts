import path from 'path';
import type { Server as SocketIOServer } from 'socket.io';
import type { ServerToClientEvents, ClientToServerEvents } from '../../src/types/events';
import type { Job, JobStatus, JobStage, QueueStats } from '../../src/types/job';
import type { AIProvider } from '../../src/types/provider';
import prisma from '../database/db';
import { browserManager } from '../automation/browser-manager';
import { googleFlowProvider } from '../automation/providers/google-flow';
import { logger } from '../logger/logger';
import { resolvePath, moveFile, ensureDir } from '../utils/file-utils';
import { DEFAULT_SETTINGS } from '../../src/types/settings';

export class QueueManager {
  private io: SocketIOServer<ClientToServerEvents, ServerToClientEvents> | null = null;
  private processing: boolean = false;
  private paused: boolean = false;
  private maxConcurrent: number = 1;
  private activeJobs: number = 0;
  private retryAttempts: number = 3;
  private retryDelay: number = 5000;
  private jobTimeout: number = 300000;
  private provider: AIProvider = googleFlowProvider;

  setSocketIO(io: SocketIOServer<ClientToServerEvents, ServerToClientEvents>) {
    this.io = io;
  }

  configure(options: {
    maxConcurrent?: number;
    retryAttempts?: number;
    retryDelay?: number;
    jobTimeout?: number;
  }) {
    if (options.maxConcurrent !== undefined) this.maxConcurrent = options.maxConcurrent;
    if (options.retryAttempts !== undefined) this.retryAttempts = options.retryAttempts;
    if (options.retryDelay !== undefined) this.retryDelay = options.retryDelay;
    if (options.jobTimeout !== undefined) this.jobTimeout = options.jobTimeout;
  }

  /**
   * Add a new job to the queue
   */
  async addJob(fileName: string, filePath: string): Promise<Job> {
    const job = await prisma.job.create({
      data: {
        fileName,
        filePath,
        status: 'pending',
        maxRetries: this.retryAttempts,
      },
    });

    logger.info(`Job created: ${fileName}`, {
      action: 'job_created',
      jobId: job.id,
    });

    if (this.io) {
      this.io.emit('job:created', job as unknown as Job);
      this.emitQueueStats();
    }

    // Try to process next job
    this.processNext();

    return job as unknown as Job;
  }

  /**
   * Process the next available job in the queue
   */
  async processNext(): Promise<void> {
    if (this.paused || this.activeJobs >= this.maxConcurrent || this.processing) {
      return;
    }

    this.processing = true;

    try {
      // Find the next pending job
      const job = await prisma.job.findFirst({
        where: { status: { in: ['pending', 'retrying'] } },
        orderBy: { createdAt: 'asc' },
      });

      if (!job) {
        this.processing = false;
        return;
      }

      this.activeJobs++;
      await this.processJob(job as unknown as Job);
      this.activeJobs--;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`Queue processing error: ${message}`, { action: 'queue_error' });
    }

    this.processing = false;

    // Check for more jobs
    setTimeout(() => this.processNext(), 1000);
  }

  /**
   * Process a single job through the entire pipeline
   */
  private async processJob(job: Job): Promise<void> {
    const startTime = Date.now();

    try {
      // Update status to running
      await this.updateJob(job.id, { status: 'running', startedAt: new Date() });

      // Load settings for prompts
      const imagePromptSetting = await prisma.setting.findUnique({ where: { key: 'imagePrompt' } });
      const videoPromptSetting = await prisma.setting.findUnique({ where: { key: 'videoPrompt' } });
      const imagePrompt = imagePromptSetting?.value || DEFAULT_SETTINGS.imagePrompt;
      const videoPrompt = videoPromptSetting?.value || DEFAULT_SETTINGS.videoPrompt;

      // Load folder settings
      const outputFolderSetting = await prisma.setting.findUnique({ where: { key: 'outputFolder' } });
      const videoFolderSetting = await prisma.setting.findUnique({ where: { key: 'videoFolder' } });
      const completedFolderSetting = await prisma.setting.findUnique({ where: { key: 'completedFolder' } });

      const outputFolder = resolvePath(outputFolderSetting?.value || DEFAULT_SETTINGS.outputFolder);
      const videoFolder = resolvePath(videoFolderSetting?.value || DEFAULT_SETTINGS.videoFolder);
      const completedFolder = resolvePath(completedFolderSetting?.value || DEFAULT_SETTINGS.completedFolder);

      ensureDir(outputFolder);
      ensureDir(videoFolder);
      ensureDir(completedFolder);

      // Ensure browser is running
      await browserManager.launch();

      // Get a page for this job
      const page = await browserManager.getPage();

      try {
        // --- STEP 1: IMAGE GENERATION ---
        await this.updateJob(job.id, { stage: 'uploading', progress: 10 });

        // Open the image generator
        await this.provider.openImageGenerator(page);
        await this.updateJob(job.id, { progress: 15 });

        // Upload the original image
        await this.provider.uploadImage(page, job.filePath);
        await this.updateJob(job.id, { stage: 'generating_image', progress: 25 });

        // Submit the image prompt
        await this.provider.submitImagePrompt(page, imagePrompt);
        await this.updateJob(job.id, { progress: 35 });

        // Wait for generation
        await this.provider.waitForImageGeneration(page, this.jobTimeout);
        await this.updateJob(job.id, { stage: 'downloading_image', progress: 50 });

        // Download generated image
        const generatedImagePath = await this.provider.downloadGeneratedImage(page, outputFolder);
        await this.updateJob(job.id, { generatedImage: generatedImagePath, progress: 55 });

        logger.info(`Image generated: ${path.basename(generatedImagePath)}`, {
          action: 'image_generated',
          jobId: job.id,
        });

        // --- STEP 2: VIDEO GENERATION ---
        await this.updateJob(job.id, { stage: 'generating_video', progress: 60 });

        // Open video generator
        await this.provider.openVideoGenerator(page);
        await this.updateJob(job.id, { progress: 65 });

        // Upload generated image for video
        await this.provider.uploadImageForVideo(page, generatedImagePath);
        await this.updateJob(job.id, { progress: 70 });

        // Submit video prompt
        await this.provider.submitVideoPrompt(page, videoPrompt);
        await this.updateJob(job.id, { progress: 75 });

        // Wait for video generation
        await this.provider.waitForVideoGeneration(page, this.jobTimeout);
        await this.updateJob(job.id, { stage: 'downloading_video', progress: 85 });

        // Download generated video
        const generatedVideoPath = await this.provider.downloadGeneratedVideo(page, videoFolder);
        await this.updateJob(job.id, { generatedVideo: generatedVideoPath, progress: 90 });

        logger.info(`Video generated: ${path.basename(generatedVideoPath)}`, {
          action: 'video_generated',
          jobId: job.id,
        });

        // --- STEP 3: CLEANUP ---
        await this.updateJob(job.id, { progress: 95 });

        // Move original file to completed folder
        const completedPath = path.join(completedFolder, job.fileName);
        await moveFile(job.filePath, completedPath);

        // Mark job completed
        const processingTime = Date.now() - startTime;
        await this.updateJob(job.id, {
          status: 'completed',
          stage: null,
          progress: 100,
          processingTime,
          completedAt: new Date(),
        });

        logger.info(`Job completed in ${(processingTime / 1000).toFixed(1)}s: ${job.fileName}`, {
          action: 'job_completed',
          jobId: job.id,
          duration: processingTime,
        });

        if (this.io) {
          const completedJob = await prisma.job.findUnique({ where: { id: job.id } });
          if (completedJob) {
            this.io.emit('job:completed', completedJob as unknown as Job);
          }
        }
      } finally {
        // Always close the tab
        await page.close().catch(() => {});
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const processingTime = Date.now() - startTime;

      logger.error(`Job failed: ${message}`, {
        action: 'job_failed',
        jobId: job.id,
        duration: processingTime,
      });

      // Check if we should retry
      const currentJob = await prisma.job.findUnique({ where: { id: job.id } });
      const retryCount = (currentJob?.retryCount || 0) + 1;

      if (retryCount < this.retryAttempts) {
        await this.updateJob(job.id, {
          status: 'retrying',
          stage: null,
          progress: 0,
          retryCount,
          errorMessage: message,
        });

        logger.info(`Retrying job (attempt ${retryCount}/${this.retryAttempts}) in ${this.retryDelay / 1000}s`, {
          action: 'job_retry',
          jobId: job.id,
        });

        // Schedule retry
        setTimeout(() => this.processNext(), this.retryDelay);
      } else {
        // Move to failed folder
        const failedFolderSetting = await prisma.setting.findUnique({ where: { key: 'failedFolder' } });
        const failedFolder = resolvePath(failedFolderSetting?.value || DEFAULT_SETTINGS.failedFolder);
        ensureDir(failedFolder);

        try {
          const failedPath = path.join(failedFolder, job.fileName);
          await moveFile(job.filePath, failedPath);
        } catch {
          // File may have been moved already
        }

        await this.updateJob(job.id, {
          status: 'failed',
          stage: null,
          progress: 0,
          retryCount,
          errorMessage: message,
          processingTime,
          completedAt: new Date(),
        });

        if (this.io) {
          const failedJob = await prisma.job.findUnique({ where: { id: job.id } });
          if (failedJob) {
            this.io.emit('job:failed', failedJob as unknown as Job);
          }
        }
      }
    }

    this.emitQueueStats();
  }

  /**
   * Update a job and emit the update via Socket.IO
   */
  private async updateJob(id: string, data: Record<string, unknown>): Promise<void> {
    await prisma.job.update({ where: { id }, data });

    if (this.io) {
      this.io.emit('job:updated', { id, ...data } as Partial<Job> & { id: string });

      if (data.progress !== undefined || data.stage !== undefined) {
        this.io.emit('job:progress', {
          id,
          progress: data.progress as number,
          stage: (data.stage as JobStage) || null,
        });
      }
    }
  }

  /**
   * Retry a specific failed job
   */
  async retryJob(jobId: string): Promise<void> {
    await prisma.job.update({
      where: { id: jobId },
      data: { status: 'retrying', retryCount: 0, errorMessage: null, progress: 0 },
    });

    logger.info('Manual retry requested', { action: 'job_retry', jobId });
    this.emitQueueStats();
    this.processNext();
  }

  /**
   * Cancel a specific job
   */
  async cancelJob(jobId: string): Promise<void> {
    await prisma.job.update({
      where: { id: jobId },
      data: { status: 'cancelled', completedAt: new Date() },
    });

    logger.info('Job cancelled', { action: 'job_cancel', jobId });
    this.emitQueueStats();
  }

  /**
   * Pause the queue
   */
  pause(): void {
    this.paused = true;
    logger.info('Queue paused', { action: 'queue_pause' });
    if (this.io) {
      this.io.emit('queue:paused');
    }
  }

  /**
   * Resume the queue
   */
  resume(): void {
    this.paused = false;
    logger.info('Queue resumed', { action: 'queue_resume' });
    if (this.io) {
      this.io.emit('queue:resumed');
    }
    this.processNext();
  }

  isPaused(): boolean {
    return this.paused;
  }

  /**
   * Get current queue statistics
   */
  async getStats(): Promise<QueueStats> {
    const [pending, waiting, running, completed, failed] = await Promise.all([
      prisma.job.count({ where: { status: 'pending' } }),
      prisma.job.count({ where: { status: 'waiting' } }),
      prisma.job.count({ where: { status: { in: ['running', 'downloading', 'retrying'] } } }),
      prisma.job.count({ where: { status: 'completed' } }),
      prisma.job.count({ where: { status: 'failed' } }),
    ]);

    return {
      pending,
      waiting,
      running,
      completed,
      failed,
      total: pending + waiting + running + completed + failed,
    };
  }

  /**
   * Emit queue stats via Socket.IO
   */
  async emitQueueStats(): Promise<void> {
    if (this.io) {
      const stats = await this.getStats();
      this.io.emit('queue:updated', stats);
    }
  }
}

export const queueManager = new QueueManager();
export default queueManager;
