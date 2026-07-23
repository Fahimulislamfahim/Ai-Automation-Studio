'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Clock,
  Search,
  Filter,
  RefreshCw,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Info,
  Calendar,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { cn, formatDuration, formatTime, formatDate, getStatusBgColor } from '@/lib/utils';

export default function HistoryPage() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [totalJobs, setTotalJobs] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  
  // Modal details state
  const [selectedJob, setSelectedJob] = useState<any | null>(null);
  const [modalLoading, setModalLoading] = useState(false);

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      const statusParam = statusFilter !== 'all' ? `&status=${statusFilter}` : '';
      const searchParam = searchQuery ? `&search=${encodeURIComponent(searchQuery)}` : '';
      const res = await fetch(`/api/jobs?page=${page}&limit=15${statusParam}${searchParam}`);
      const data = await res.json();
      
      setJobs(data.jobs || []);
      setTotalJobs(data.total || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, searchQuery]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const handleRowClick = async (job: any) => {
    setSelectedJob(job);
    setModalLoading(true);
    try {
      const res = await fetch(`/api/jobs/${job.id}`);
      const detailedJob = await res.json();
      setSelectedJob(detailedJob);
    } catch (err) {
      console.error(err);
    } finally {
      setModalLoading(false);
    }
  };

  const totalPages = Math.ceil(totalJobs / 15) || 1;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold gradient-text">Job History</h1>
          <p className="text-sm text-white/40 mt-0.5">Audit log of all execution runs</p>
        </div>
        <button
          onClick={fetchJobs}
          className="p-2.5 rounded-xl border border-white/[0.06] bg-white/[0.02] text-white/60 hover:text-white transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="sm:col-span-2 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input
            type="text"
            placeholder="Search by file name or job ID..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-white/[0.08] bg-surface-1 focus:border-brand-400 focus:outline-none text-sm transition-all"
          />
        </div>

        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-white/[0.08] bg-surface-1 focus:border-brand-400 focus:outline-none text-sm transition-all appearance-none cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Table Container */}
      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-white/40">
            <span className="animate-spin text-2xl mb-3">⌛</span>
            <p className="text-sm">Retrieving history...</p>
          </div>
        ) : jobs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-white/30">
            <Clock className="w-10 h-10 mb-3" />
            <p className="text-sm font-medium">No past executions found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/[0.06] text-xs font-semibold text-white/40 bg-white/[0.01]">
                  <th className="p-4">Job ID</th>
                  <th className="p-4">File Name</th>
                  <th className="p-4">Date</th>
                  <th className="p-4">Duration</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04] text-xs">
                {jobs.map((job) => (
                  <tr
                    key={job.id}
                    onClick={() => handleRowClick(job)}
                    className="hover:bg-white/[0.01] cursor-pointer transition-colors"
                  >
                    <td className="p-4 font-mono text-white/50">{job.id.slice(0, 8)}...</td>
                    <td className="p-4 font-semibold text-white/80 max-w-[200px] truncate">{job.fileName}</td>
                    <td className="p-4 text-white/40">{formatDate(job.createdAt)} {formatTime(job.createdAt)}</td>
                    <td className="p-4 text-white/50">
                      {job.processingTime ? formatDuration(job.processingTime) : 'N/A'}
                    </td>
                    <td className="p-4">
                      <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-medium border uppercase', getStatusBgColor(job.status))}>
                        {job.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button className="px-2.5 py-1 rounded border border-white/[0.08] hover:border-white/30 hover:bg-white/[0.02] text-white/60 transition-colors">
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination Controls */}
            <div className="flex items-center justify-between p-4 border-t border-white/[0.06] text-xs text-white/40">
              <div>
                Showing {(page - 1) * 15 + 1} - {Math.min(page * 15, totalJobs)} of {totalJobs} jobs
              </div>
              <div className="flex items-center gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="p-1.5 rounded-lg border border-white/[0.06] bg-white/[0.01] hover:bg-white/[0.03] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="font-semibold text-white/70">
                  {page} / {totalPages}
                </span>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="p-1.5 rounded-lg border border-white/[0.06] bg-white/[0.01] hover:bg-white/[0.03] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="glass-card w-full max-w-2xl overflow-hidden border border-white/[0.08] bg-surface-1">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/[0.06]">
              <div>
                <h3 className="text-sm font-semibold truncate text-white/90">{selectedJob.fileName}</h3>
                <p className="text-[10px] text-white/30 font-mono">Job ID: {selectedJob.id}</p>
              </div>
              <button
                onClick={() => setSelectedJob(null)}
                className="text-white/40 hover:text-white text-xs border border-white/[0.06] px-2.5 py-1 rounded-lg bg-white/[0.02]"
              >
                Close
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-5 max-h-[450px] overflow-y-auto space-y-4">
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="space-y-2">
                  <div className="flex justify-between border-b border-white/[0.04] pb-1">
                    <span className="text-white/40">Status</span>
                    <span className="font-semibold uppercase">{selectedJob.status}</span>
                  </div>
                  <div className="flex justify-between border-b border-white/[0.04] pb-1">
                    <span className="text-white/40">Created At</span>
                    <span>{formatDate(selectedJob.createdAt)} {formatTime(selectedJob.createdAt)}</span>
                  </div>
                  <div className="flex justify-between border-b border-white/[0.04] pb-1">
                    <span className="text-white/40">Processing Time</span>
                    <span>{selectedJob.processingTime ? formatDuration(selectedJob.processingTime) : 'N/A'}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between border-b border-white/[0.04] pb-1">
                    <span className="text-white/40">Retry count</span>
                    <span>{selectedJob.retryCount} / {selectedJob.maxRetries}</span>
                  </div>
                  <div className="flex justify-between border-b border-white/[0.04] pb-1">
                    <span className="text-white/40">Source path</span>
                    <span className="truncate text-white/30 max-w-[120px]" title={selectedJob.filePath}>{selectedJob.filePath}</span>
                  </div>
                </div>
              </div>

              {/* Error block */}
              {selectedJob.errorMessage && (
                <div className="p-3 rounded-xl border border-red-500/20 bg-red-500/5 text-xs text-red-400 flex gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <div>
                    <p className="font-semibold">Execution Failure Message</p>
                    <p className="font-mono mt-1 whitespace-pre-wrap">{selectedJob.errorMessage}</p>
                  </div>
                </div>
              )}

              {/* Log Timeline block */}
              <div className="space-y-2.5 pt-2">
                <p className="text-xs font-semibold text-white/70 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-brand-400" />
                  Execution Step Timeline
                </p>

                {modalLoading ? (
                  <div className="text-xs text-white/30 py-4 text-center">Loading timelines...</div>
                ) : selectedJob.logs && selectedJob.logs.length > 0 ? (
                  <div className="relative pl-4 space-y-3.5 before:absolute before:left-[4px] before:top-2 before:bottom-2 before:w-[1.5px] before:bg-white/[0.06]">
                    {selectedJob.logs.map((log: any) => (
                      <div key={log.id} className="relative text-xs">
                        {/* Node circle */}
                        <div className="absolute -left-[16px] top-1.5 w-2 h-2 rounded-full bg-brand-400" />
                        <div className="flex justify-between">
                          <span className="font-semibold text-white/80">{log.action}</span>
                          <span className="text-[10px] text-white/30 font-mono">{formatTime(log.createdAt)}</span>
                        </div>
                        <p className="text-white/50 mt-0.5">{log.message}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-white/20 py-4 text-center">No timeline events found for this job</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
