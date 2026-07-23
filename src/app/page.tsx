'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Activity,
  Cpu,
  Globe,
  Image,
  Video,
  Clock,
  AlertTriangle,
  Download,
  Pause,
  Play,
  Wifi,
  WifiOff,
  FolderSearch,
  Loader2,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { useAppState } from '@/hooks/use-app-state';
import { cn, formatDuration, formatTime, getStatusColor, getStatusBgColor } from '@/lib/utils';

const staggerChildren = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const fadeInUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

export default function DashboardPage() {
  const {
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
  } = useAppState();

  const [todayStats, setTodayStats] = useState({
    imagesProcessed: 0,
    videosGenerated: 0,
    averageProcessingTime: 0,
    errors: 0,
    downloads: 0,
  });

  useEffect(() => {
    fetch('/api/stats/today')
      .then((r) => r.json())
      .then(setTodayStats)
      .catch(() => {});

    const interval = setInterval(() => {
      fetch('/api/stats/today')
        .then((r) => r.json())
        .then(setTodayStats)
        .catch(() => {});
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const currentJob = recentJobs.find(
    (j) => j.status === 'running' || j.status === 'downloading'
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold gradient-text">Dashboard</h1>
          <p className="text-sm text-white/40 mt-0.5">Real-time automation overview</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Connection indicator */}
          <div
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium',
              connected
                ? 'bg-emerald-400/10 text-emerald-400 border border-emerald-400/20'
                : 'bg-red-400/10 text-red-400 border border-red-400/20'
            )}
          >
            {connected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            {connected ? 'Connected' : 'Disconnected'}
          </div>

          {/* Pause/Resume */}
          <button
            onClick={queueStats.running > 0 ? pauseQueue : resumeQueue}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all',
              'border',
              queueStats.running > 0
                ? 'bg-amber-400/10 text-amber-400 border-amber-400/20 hover:bg-amber-400/20'
                : 'bg-brand-500/10 text-brand-400 border-brand-400/20 hover:bg-brand-500/20'
            )}
          >
            {queueStats.running > 0 ? (
              <>
                <Pause className="w-4 h-4" /> Pause
              </>
            ) : (
              <>
                <Play className="w-4 h-4" /> Resume
              </>
            )}
          </button>
        </div>
      </div>

      {/* Status Cards Row */}
      <motion.div
        variants={staggerChildren}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {/* System Status */}
        <motion.div variants={fadeInUp} className="glass-card p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-white/40 uppercase tracking-wider">
              System
            </span>
            <Cpu className="w-4 h-4 text-white/20" />
          </div>
          <div className="flex items-center gap-3">
            <div
              className={cn('w-3 h-3 rounded-full', {
                'bg-emerald-400 animate-pulse-glow shadow-[0_0_12px_theme(colors.emerald.400)]':
                  systemState === 'running',
                'bg-amber-400 shadow-[0_0_12px_theme(colors.amber.400)]':
                  systemState === 'paused',
                'bg-gray-500': systemState === 'stopped',
              })}
            />
            <span className="text-lg font-semibold capitalize">{systemState}</span>
          </div>
          <p className="text-xs text-white/30 mt-2">
            {watcherStatus.active
              ? `Watching: ${watcherStatus.filesDetected} files detected`
              : 'Watcher inactive'}
          </p>
        </motion.div>

        {/* Browser Status */}
        <motion.div variants={fadeInUp} className="glass-card p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-white/40 uppercase tracking-wider">
              Browser
            </span>
            <Globe className="w-4 h-4 text-white/20" />
          </div>
          <div className="flex items-center gap-3">
            <div
              className={cn('w-3 h-3 rounded-full', {
                'bg-emerald-400 shadow-[0_0_12px_theme(colors.emerald.400)]':
                  browserStatus.connected,
                'bg-red-400': !browserStatus.connected,
              })}
            />
            <span className="text-lg font-semibold">
              {browserStatus.connected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          <button
            onClick={browserStatus.connected ? closeBrowser : launchBrowser}
            className={cn(
              'mt-3 text-xs px-3 py-1 rounded-lg transition-colors',
              browserStatus.connected
                ? 'bg-red-400/10 text-red-400 hover:bg-red-400/20'
                : 'bg-brand-500/10 text-brand-400 hover:bg-brand-500/20'
            )}
          >
            {browserStatus.connected ? 'Close Browser' : 'Launch Browser'}
          </button>
        </motion.div>

        {/* Queue Stats */}
        <motion.div variants={fadeInUp} className="glass-card p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-white/40 uppercase tracking-wider">
              Queue
            </span>
            <Activity className="w-4 h-4 text-white/20" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="text-2xl font-bold text-cyan-400">{queueStats.pending}</div>
              <div className="text-[10px] text-white/30">Pending</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-emerald-400">{queueStats.running}</div>
              <div className="text-[10px] text-white/30">Running</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-400">{queueStats.completed}</div>
              <div className="text-[10px] text-white/30">Completed</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-red-400">{queueStats.failed}</div>
              <div className="text-[10px] text-white/30">Failed</div>
            </div>
          </div>
        </motion.div>

        {/* Today's Stats */}
        <motion.div variants={fadeInUp} className="glass-card p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-white/40 uppercase tracking-wider">
              Today
            </span>
            <Clock className="w-4 h-4 text-white/20" />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-white/50">
                <Image className="w-3 h-3" /> Images
              </div>
              <span className="text-sm font-semibold">{todayStats.imagesProcessed}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-white/50">
                <Video className="w-3 h-3" /> Videos
              </div>
              <span className="text-sm font-semibold">{todayStats.videosGenerated}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-white/50">
                <Clock className="w-3 h-3" /> Avg Time
              </div>
              <span className="text-sm font-semibold">
                {formatDuration(todayStats.averageProcessingTime)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-white/50">
                <AlertTriangle className="w-3 h-3" /> Errors
              </div>
              <span className={cn('text-sm font-semibold', todayStats.errors > 0 && 'text-red-400')}>
                {todayStats.errors}
              </span>
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Bottom Section: Current Job + Activity Log */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Current Job */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card p-5 lg:col-span-1"
        >
          <h2 className="text-sm font-semibold text-white/60 mb-4">Current Job</h2>

          {currentJob ? (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium truncate">{currentJob.fileName}</p>
                <p className="text-xs text-white/30 mt-0.5">
                  ID: {currentJob.id.slice(0, 8)}...
                </p>
              </div>

              {/* Progress bar */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span
                    className={cn(
                      'px-2 py-0.5 rounded-full text-[10px] font-medium border',
                      getStatusBgColor(currentJob.status)
                    )}
                  >
                    {currentJob.stage?.replace(/_/g, ' ') || currentJob.status}
                  </span>
                  <span className="text-white/40">{currentJob.progress}%</span>
                </div>
                <div className="w-full h-2 bg-white/[0.06] rounded-full overflow-hidden">
                  <motion.div
                    className="h-full progress-bar rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${currentJob.progress}%` }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                  />
                </div>
              </div>

              {/* Stage indicator */}
              <div className="space-y-1.5">
                {[
                  'uploading',
                  'generating_image',
                  'downloading_image',
                  'generating_video',
                  'downloading_video',
                ].map((stage) => (
                  <div key={stage} className="flex items-center gap-2 text-xs">
                    {currentJob.stage === stage ? (
                      <Loader2 className="w-3 h-3 text-cyan-400 animate-spin" />
                    ) : (currentJob.progress || 0) >
                      ['uploading', 'generating_image', 'downloading_image', 'generating_video', 'downloading_video'].indexOf(stage) * 20 + 20 ? (
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <div className="w-3 h-3 rounded-full border border-white/20" />
                    )}
                    <span
                      className={cn(
                        'capitalize',
                        currentJob.stage === stage
                          ? 'text-cyan-400 font-medium'
                          : 'text-white/30'
                      )}
                    >
                      {stage.replace(/_/g, ' ')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-white/20">
              <FolderSearch className="w-10 h-10 mb-3" />
              <p className="text-sm">No active job</p>
              <p className="text-xs mt-1">Drop images into the input folder</p>
            </div>
          )}
        </motion.div>

        {/* Live Activity Panel */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass-card p-5 lg:col-span-2"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-white/60">Live Activity</h2>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] text-white/30">LIVE</span>
            </div>
          </div>

          <div className="space-y-1 max-h-[400px] overflow-y-auto pr-2">
            {activityLog.length > 0 ? (
              activityLog.slice(0, 50).map((log, i) => (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-start gap-3 py-1.5 px-2 rounded-lg hover:bg-white/[0.02] transition-colors"
                >
                  <span className="text-[10px] text-white/20 font-mono mt-0.5 flex-shrink-0">
                    {formatTime(log.createdAt)}
                  </span>
                  <span
                    className={cn('text-[10px] font-medium uppercase flex-shrink-0 w-10', {
                      'text-blue-400': log.level === 'info',
                      'text-amber-400': log.level === 'warn',
                      'text-red-400': log.level === 'error',
                      'text-gray-400': log.level === 'debug',
                    })}
                  >
                    {log.level}
                  </span>
                  <span className="text-xs text-white/70 break-all">{log.message}</span>
                </motion.div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-white/20">
                <Activity className="w-8 h-8 mb-2" />
                <p className="text-sm">Waiting for activity...</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
