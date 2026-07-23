'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSocket } from './use-socket';
import type { Job, QueueStats, TodayStats } from '@/types/job';
import type { BrowserStatus, WatcherStatus, SystemStatus } from '@/types/events';

/**
 * Hook for live job and system state from Socket.IO
 */
export function useAppState() {
  const { on, emit, connected } = useSocket();

  const [queueStats, setQueueStats] = useState<QueueStats>({
    pending: 0,
    waiting: 0,
    running: 0,
    completed: 0,
    failed: 0,
    total: 0,
  });

  const [browserStatus, setBrowserStatus] = useState<BrowserStatus>({
    connected: false,
    sessionValid: false,
    currentUrl: null,
    headless: false,
  });

  const [paused, setPaused] = useState(false);

  const [watcherStatus, setWatcherStatus] = useState<WatcherStatus>({
    active: false,
    watchPath: '',
    filesDetected: 0,
  });

  const [recentJobs, setRecentJobs] = useState<Job[]>([]);
  const [activityLog, setActivityLog] = useState<
    Array<{ id: string; message: string; action: string; level: string; createdAt: Date }>
  >([]);

  useEffect(() => {
    const unsubs = [
      on('queue:updated', (stats) => setQueueStats(stats)),
      on('queue:paused', () => setPaused(true)),
      on('queue:resumed', () => setPaused(false)),
      on('browser:status', (status) => setBrowserStatus(status)),
      on('watcher:status', (status) => setWatcherStatus(status)),
      on('job:created', (job) => {
        setRecentJobs((prev) => [job, ...prev].slice(0, 50));
      }),
      on('job:updated', (update) => {
        setRecentJobs((prev) =>
          prev.map((j) => (j.id === update.id ? { ...j, ...update } : j))
        );
      }),
      on('job:completed', (job) => {
        setRecentJobs((prev) =>
          prev.map((j) => (j.id === job.id ? job : j))
        );
      }),
      on('job:failed', (job) => {
        setRecentJobs((prev) =>
          prev.map((j) => (j.id === job.id ? job : j))
        );
      }),
      on('log:new', (log) => {
        setActivityLog((prev) => [log, ...prev].slice(0, 200));
      }),
    ];

    // Request initial state
    emit('state:request');

    return () => {
      unsubs.forEach((unsub) => unsub());
    };
  }, [on, emit]);

  // Actions
  const pauseQueue = useCallback(() => emit('queue:pause'), [emit]);
  const resumeQueue = useCallback(() => emit('queue:resume'), [emit]);
  const launchBrowser = useCallback(() => emit('browser:launch'), [emit]);
  const closeBrowser = useCallback(() => emit('browser:close'), [emit]);
  const retryJob = useCallback((id: string) => emit('job:retry', id), [emit]);
  const cancelJob = useCallback((id: string) => emit('job:cancel', id), [emit]);

  const systemState: 'running' | 'stopped' | 'paused' = paused
    ? 'paused'
    : browserStatus.connected && queueStats.running > 0
    ? 'running'
    : 'stopped';

  return {
    connected,
    systemState,
    queueStats,
    browserStatus,
    watcherStatus,
    recentJobs,
    activityLog,
    pauseQueue,
    resumeQueue,
    launchBrowser,
    closeBrowser,
    retryJob,
    cancelJob,
  };
}
