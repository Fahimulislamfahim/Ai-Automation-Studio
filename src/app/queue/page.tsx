'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ListTodo,
  Play,
  Pause,
  RefreshCw,
  XCircle,
  FileImage,
  UploadCloud,
  CheckCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Clock,
  ExternalLink,
  Trash2,
} from 'lucide-react';
import { useAppState } from '@/hooks/use-app-state';
import { cn, formatDuration, formatTime, getStatusBgColor } from '@/lib/utils';

const getBasename = (filePath: string | null) => {
  if (!filePath) return '';
  const parts = filePath.split(/[/\\]/);
  return parts[parts.length - 1];
};

export default function QueuePage() {
  const {
    connected,
    queueStats,
    recentJobs,
    pauseQueue,
    resumeQueue,
    retryJob,
    cancelJob,
  } = useAppState();

  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'running' | 'completed' | 'failed'>('all');
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);
  
  // Drag and drop state
  const [dragActive, setDragActive] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{ type: 'success' | 'error' | 'uploading' | null; message: string }>({
    type: null,
    message: '',
  });

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      const statusParam = activeTab !== 'all' ? `?status=${activeTab === 'pending' ? 'pending,waiting' : activeTab}` : '';
      const response = await fetch(`/api/jobs${statusParam}`);
      const data = await response.json();
      setJobs(data.jobs || []);
    } catch (error) {
      console.error('Error fetching jobs:', error);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  // Sync state updates from socket to page-level jobs state
  useEffect(() => {
    setJobs((prevJobs) => {
      // Find running/active jobs and merge updates or keep recent logs
      return prevJobs.map((job) => {
        const socketJob = recentJobs.find((j) => j.id === job.id);
        return socketJob ? { ...job, ...socketJob } : job;
      });
    });
  }, [recentJobs]);

  // Drag and drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const files = Array.from(e.dataTransfer.files);
      setUploadStatus({ type: 'uploading', message: `Uploading ${files.length} file(s)...` });

      try {
        for (const file of files) {
          const formData = new FormData();
          formData.append('file', file);

          const res = await fetch('/api/upload', {
            method: 'POST',
            body: formData,
          });

          if (!res.ok) {
            throw new Error(`Failed to upload ${file.name}`);
          }
        }

        setUploadStatus({
          type: 'success',
          message: 'Files uploaded successfully! Watcher will process them shortly.',
        });
        setTimeout(() => setUploadStatus({ type: null, message: '' }), 5000);
        fetchJobs();
      } catch (error: any) {
        setUploadStatus({
          type: 'error',
          message: error.message || 'Failed to upload files.',
        });
      }
    }
  };

  const triggerFileSelect = () => {
    const fileInput = document.getElementById('file-upload-input') as HTMLInputElement;
    if (fileInput) fileInput.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const files = Array.from(e.target.files);
      setUploadStatus({ type: 'uploading', message: `Uploading ${files.length} file(s)...` });

      try {
        for (const file of files) {
          const formData = new FormData();
          formData.append('file', file);

          const res = await fetch('/api/upload', {
            method: 'POST',
            body: formData,
          });

          if (!res.ok) {
            throw new Error(`Failed to upload ${file.name}`);
          }
        }

        setUploadStatus({
          type: 'success',
          message: 'Files uploaded successfully! Watcher will process them shortly.',
        });
        setTimeout(() => setUploadStatus({ type: null, message: '' }), 5000);
        fetchJobs();
      } catch (error: any) {
        setUploadStatus({
          type: 'error',
          message: error.message || 'Failed to upload files.',
        });
      }
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold gradient-text">Queue Management</h1>
          <p className="text-sm text-white/40 mt-0.5">Monitor and control generation jobs</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={fetchJobs}
            className="p-2.5 rounded-xl border border-white/[0.06] bg-surface-1 text-white/60 hover:text-white hover:bg-white/[0.04] transition-colors"
            title="Refresh list"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          
          <button
            onClick={queueStats.running > 0 ? pauseQueue : resumeQueue}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all border',
              queueStats.running > 0
                ? 'bg-amber-400/10 text-amber-400 border-amber-400/20 hover:bg-amber-400/20'
                : 'bg-brand-500/10 text-brand-400 border-brand-400/20 hover:bg-brand-500/20'
            )}
          >
            {queueStats.running > 0 ? (
              <>
                <Pause className="w-4 h-4" /> Pause Queue
              </>
            ) : (
              <>
                <Play className="w-4 h-4" /> Resume Queue
              </>
            )}
          </button>
        </div>
      </div>

      {/* Tabs Row */}
      <div className="flex border-b border-white/[0.06] overflow-x-auto whitespace-nowrap scrollbar-none">
        {(['all', 'pending', 'running', 'completed', 'failed'] as const).map((tab) => {
          const count =
            tab === 'all'
              ? queueStats.total
              : tab === 'pending'
              ? queueStats.pending + queueStats.waiting
              : queueStats[tab as keyof typeof queueStats] || 0;

          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                'px-4 py-3 text-sm font-medium border-b-2 transition-all relative capitalize',
                activeTab === tab
                  ? 'border-brand-400 text-white'
                  : 'border-transparent text-white/40 hover:text-white/70'
              )}
            >
              {tab}
              <span className="ml-1.5 px-2 py-0.5 rounded-full bg-white/[0.06] text-[10px] text-white/50">
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Drag & Drop Upload Zone */}
      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={triggerFileSelect}
        className={cn(
          'border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all',
          dragActive
            ? 'border-brand-400 bg-brand-500/5'
            : 'border-white/[0.08] hover:border-white/20 hover:bg-white/[0.01]'
        )}
      >
        <input
          id="file-upload-input"
          type="file"
          multiple
          onChange={handleFileChange}
          className="hidden"
          accept="image/*"
        />
        <UploadCloud className="w-8 h-8 text-white/30 mx-auto mb-2" />
        <p className="text-sm font-medium">Drag & drop files here, or click to browse</p>
        <p className="text-xs text-white/30 mt-1">Supports PNG, JPG, JPEG, and WEBP formats</p>
        
        {uploadStatus.type && (
          <div
            className={cn(
              'mt-3 max-w-md mx-auto p-2.5 rounded-xl text-xs flex items-center justify-center gap-2 border',
              {
                'bg-emerald-400/10 text-emerald-400 border-emerald-400/20': uploadStatus.type === 'success',
                'bg-red-400/10 text-red-400 border-red-400/20': uploadStatus.type === 'error',
                'bg-brand-500/10 text-brand-400 border-brand-400/20': uploadStatus.type === 'uploading',
              }
            )}
          >
            {uploadStatus.type === 'success' && <CheckCircle className="w-3.5 h-3.5" />}
            {uploadStatus.type === 'error' && <AlertCircle className="w-3.5 h-3.5" />}
            {uploadStatus.type === 'uploading' && <span className="animate-spin mr-1">⌛</span>}
            {uploadStatus.message}
          </div>
        )}
      </div>

      {/* Jobs Queue Table/List */}
      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-white/40">
            <span className="animate-spin text-2xl mb-3">⌛</span>
            <p className="text-sm">Loading jobs queue...</p>
          </div>
        ) : jobs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-white/30">
            <ListTodo className="w-10 h-10 mb-3" />
            <p className="text-sm font-medium">No jobs found in this category</p>
            <p className="text-xs mt-1">Files dropped in the Watch directory will automatically appear here</p>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.06]">
            {jobs.map((job) => {
              const isExpanded = expandedJobId === job.id;
              
              return (
                <div key={job.id} className="transition-colors hover:bg-white/[0.01]">
                  {/* Job Main Row */}
                  <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2 rounded-lg bg-white/[0.04]">
                        <FileImage className="w-5 h-5 text-brand-400" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold truncate text-white/90">{job.fileName}</p>
                          <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-medium border uppercase', getStatusBgColor(job.status))}>
                            {job.status}
                          </span>
                        </div>
                        <p className="text-xs text-white/30 truncate mt-0.5">ID: {job.id}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-6 flex-wrap">
                      {/* Progress representation */}
                      {['running', 'downloading'].includes(job.status) && (
                        <div className="w-32 flex flex-col">
                          <div className="flex justify-between text-[10px] mb-1">
                            <span className="text-white/40">{job.stage?.replace(/_/g, ' ')}</span>
                            <span className="text-white/60 font-semibold">{job.progress}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                            <div className="h-full bg-cyan-400 progress-bar rounded-full" style={{ width: `${job.progress}%` }} />
                          </div>
                        </div>
                      )}

                      {/* Timestamps */}
                      <div className="text-xs text-white/40 space-y-0.5 text-right hidden md:block">
                        <div className="flex items-center gap-1.5 justify-end">
                          <Clock className="w-3 h-3 text-white/20" />
                          <span>Started: {job.startedAt ? formatTime(job.startedAt) : 'Waiting'}</span>
                        </div>
                        {job.processingTime && (
                          <p className="text-[10px] text-white/30">Took {formatDuration(job.processingTime)}</p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        {job.status === 'failed' && (
                          <button
                            onClick={() => retryJob(job.id)}
                            className="p-1.5 rounded-lg border border-emerald-400/20 bg-emerald-400/10 text-emerald-400 hover:bg-emerald-400/20 transition-colors"
                            title="Retry Job"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {['pending', 'waiting', 'running', 'retrying'].includes(job.status) && (
                          <button
                            onClick={() => cancelJob(job.id)}
                            className="p-1.5 rounded-lg border border-red-400/20 bg-red-400/10 text-red-400 hover:bg-red-400/20 transition-colors"
                            title="Cancel Job"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                          </button>
                        )}

                        <button
                          onClick={() => setExpandedJobId(isExpanded ? null : job.id)}
                          className="p-1.5 rounded-lg border border-white/[0.06] text-white/40 hover:text-white/70 hover:bg-white/[0.04] transition-colors"
                        >
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Section */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden bg-white/[0.01] border-t border-white/[0.04]"
                      >
                        <div className="p-4 space-y-4 text-xs text-white/60">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <p className="font-semibold text-white/80 mb-2">Job Information</p>
                              <div className="space-y-2">
                                <div className="flex justify-between border-b border-white/[0.04] pb-1">
                                  <span>Original Path</span>
                                  <span className="font-mono text-white/40 select-all">{job.filePath}</span>
                                </div>
                                <div className="flex justify-between border-b border-white/[0.04] pb-1">
                                  <span>Retry Count</span>
                                  <span>{job.retryCount} / {job.maxRetries}</span>
                                </div>
                                {job.errorMessage && (
                                  <div className="p-2.5 rounded-xl border border-red-400/20 bg-red-400/5 text-red-400 mt-2">
                                    <p className="font-semibold mb-0.5">Error Message</p>
                                    <p className="font-mono break-all">{job.errorMessage}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            <div>
                              <p className="font-semibold text-white/80 mb-2">Generated Assets</p>
                              <div className="space-y-2">
                                {job.generatedImage ? (
                                  <div className="flex items-center justify-between border-b border-white/[0.04] pb-1">
                                    <span className="flex items-center gap-1.5"><FileImage className="w-3.5 h-3.5 text-cyan-400" /> Image Asset</span>
                                    <a
                                      href={`/api/downloads/file?type=image&name=${encodeURIComponent(getBasename(job.generatedImage))}`}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-cyan-400 hover:underline flex items-center gap-1"
                                    >
                                      Open Image <ExternalLink className="w-3.5 h-3.5" />
                                    </a>
                                  </div>
                                ) : (
                                  <div className="text-white/30 border-b border-white/[0.04] pb-1">Image generation pending</div>
                                )}

                                {job.generatedVideo ? (
                                  <div className="flex items-center justify-between border-b border-white/[0.04] pb-1">
                                    <span className="flex items-center gap-1.5"><FileImage className="w-3.5 h-3.5 text-purple-400" /> Video Asset</span>
                                    <a
                                      href={`/api/downloads/file?type=video&name=${encodeURIComponent(getBasename(job.generatedVideo))}`}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-purple-400 hover:underline flex items-center gap-1"
                                    >
                                      Open Video <ExternalLink className="w-3.5 h-3.5" />
                                    </a>
                                  </div>
                                ) : (
                                  <div className="text-white/30 border-b border-white/[0.04] pb-1">Video generation pending</div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
