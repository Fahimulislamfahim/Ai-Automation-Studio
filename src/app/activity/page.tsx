'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Activity,
  Search,
  Filter,
  Download,
  Trash2,
  RefreshCw,
  Clock,
  Terminal,
} from 'lucide-react';
import { useAppState } from '@/hooks/use-app-state';
import { cn, formatTime, formatDate, formatDuration } from '@/lib/utils';

export default function ActivityPage() {
  const { activityLog, connected } = useAppState();

  const [logs, setLogs] = useState<any[]>([]);
  const [filterLevel, setFilterLevel] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [totalLogs, setTotalLogs] = useState(0);
  const [autoScroll, setAutoScroll] = useState(true);

  const logsEndRef = useRef<HTMLDivElement>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const levelParam = filterLevel !== 'all' ? `&level=${filterLevel}` : '';
      const searchParam = searchQuery ? `&search=${encodeURIComponent(searchQuery)}` : '';
      const response = await fetch(`/api/logs?page=${page}&limit=50${levelParam}${searchParam}`);
      const data = await response.json();
      
      setLogs(data.logs || []);
      setTotalLogs(data.total || 0);
    } catch (error) {
      console.error('Error fetching logs:', error);
    } finally {
      setLoading(false);
    }
  }, [page, filterLevel, searchQuery]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Sync new real-time log entries to logs list
  useEffect(() => {
    if (activityLog.length > 0) {
      const latestLog = activityLog[0];
      setLogs((prev) => {
        // Prevent duplicate logs if they match already retrieved logs
        if (prev.some((l) => l.id === latestLog.id)) {
          return prev;
        }

        // Apply filters
        const matchesLevel = filterLevel === 'all' || latestLog.level === filterLevel;
        const matchesSearch =
          !searchQuery ||
          latestLog.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
          latestLog.action.toLowerCase().includes(searchQuery.toLowerCase());

        if (matchesLevel && matchesSearch) {
          const updated = [latestLog, ...prev];
          return updated.slice(0, 100); // Caps screen list to 100 items
        }
        return prev;
      });
    }
  }, [activityLog, filterLevel, searchQuery]);

  // Auto scroll effect
  useEffect(() => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

  // Log level colors
  const getLevelColor = (level: string) => {
    const colors: Record<string, string> = {
      info: 'text-blue-400 border-blue-400/20 bg-blue-400/5',
      warn: 'text-amber-400 border-amber-400/20 bg-amber-400/5',
      error: 'text-red-400 border-red-400/20 bg-red-400/5',
      debug: 'text-gray-400 border-white/[0.06] bg-white/[0.02]',
    };
    return colors[level] || 'text-gray-400';
  };

  const handleExport = (format: 'csv' | 'json') => {
    const dataStr =
      format === 'json'
        ? JSON.stringify(logs, null, 2)
        : 'Timestamp,Level,Action,Message,Duration(ms)\n' +
          logs
            .map(
              (l) =>
                `"${l.createdAt}","${l.level}","${l.action}","${l.message.replace(
                  /"/g,
                  '""'
                )}",${l.duration || ''}`
            )
            .join('\n');

    const dataUri =
      'data:text/' +
      (format === 'json' ? 'json' : 'csv') +
      ';charset=utf-8,' +
      encodeURIComponent(dataStr);

    const exportFileDefaultName = `activity_logs_${Date.now()}.${format}`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold gradient-text">Activity Logs</h1>
          <p className="text-sm text-white/40 mt-0.5">Audit trail and runtime executions</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className={cn(
              'px-3 py-2 rounded-xl text-xs font-semibold border transition-all',
              autoScroll
                ? 'bg-brand-500/10 text-brand-400 border-brand-400/20'
                : 'bg-white/[0.02] text-white/40 border-white/[0.06]'
            )}
          >
            {autoScroll ? 'Auto-scroll ON' : 'Auto-scroll OFF'}
          </button>

          <button
            onClick={fetchLogs}
            className="p-2 rounded-xl border border-white/[0.06] bg-white/[0.02] text-white/60 hover:text-white transition-colors"
            title="Refresh logs"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <div className="flex items-center rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
            <button
              onClick={() => handleExport('csv')}
              className="px-3 py-2 text-xs text-white/60 hover:text-white border-r border-white/[0.06] transition-colors flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" /> CSV
            </button>
            <button
              onClick={() => handleExport('json')}
              className="px-3 py-2 text-xs text-white/60 hover:text-white transition-colors flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" /> JSON
            </button>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        {/* Search */}
        <div className="sm:col-span-2 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input
            type="text"
            placeholder="Search action or message..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-white/[0.08] bg-surface-1 focus:border-brand-400 focus:outline-none text-sm transition-all"
          />
        </div>

        {/* Level Filter */}
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <select
            value={filterLevel}
            onChange={(e) => setFilterLevel(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-white/[0.08] bg-surface-1 focus:border-brand-400 focus:outline-none text-sm transition-all appearance-none cursor-pointer"
          >
            <option value="all">All Levels</option>
            <option value="info">Info</option>
            <option value="warn">Warning</option>
            <option value="error">Error</option>
            <option value="debug">Debug</option>
          </select>
        </div>
      </div>

      {/* Console/Terminal View */}
      <div className="glass-card overflow-hidden border border-white/[0.06] bg-black/60 shadow-2xl">
        {/* Window Chrome Header */}
        <div className="flex items-center justify-between px-4 py-2 bg-surface-1 border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-white/40" />
            <span className="text-[11px] font-semibold text-white/45 tracking-wider font-mono">
              SYSTEM CONSOLE ({totalLogs} LOGS)
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
            <div className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
          </div>
        </div>

        {/* Logs Stream */}
        <div className="p-4 h-[500px] overflow-y-auto font-mono text-xs space-y-2 select-text">
          {loading && logs.length === 0 ? (
            <div className="flex items-center justify-center h-full text-white/30">
              <span className="animate-spin mr-2">⌛</span> Loading log history...
            </div>
          ) : logs.length === 0 ? (
            <div className="flex items-center justify-center h-full text-white/20">
              No activity logs matched query
            </div>
          ) : (
            <div className="space-y-1.5">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start gap-3 py-0.5 hover:bg-white/[0.02] rounded px-2 transition-colors"
                >
                  <span className="text-white/20 flex-shrink-0 select-none">
                    [{formatDate(log.createdAt)} {formatTime(log.createdAt)}]
                  </span>
                  
                  <span
                    className={cn(
                      'px-1.5 py-0.5 rounded text-[10px] font-bold uppercase border flex-shrink-0 select-none w-14 text-center',
                      getLevelColor(log.level)
                    )}
                  >
                    {log.level}
                  </span>

                  <span className="text-brand-300 font-semibold flex-shrink-0 select-none">
                    {log.action}:
                  </span>

                  <span className="text-white/80 break-all">{log.message}</span>

                  {log.duration && (
                    <span className="text-white/20 flex-shrink-0 text-[10px] flex items-center gap-1 ml-auto select-none">
                      <Clock className="w-3 h-3" /> {formatDuration(log.duration)}
                    </span>
                  )}
                </div>
              ))}
              <div ref={logsEndRef} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
