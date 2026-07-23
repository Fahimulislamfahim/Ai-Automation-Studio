import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}m ${seconds}s`;
}

export function formatTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    pending: 'text-yellow-400',
    waiting: 'text-blue-400',
    running: 'text-cyan-400',
    downloading: 'text-indigo-400',
    completed: 'text-emerald-400',
    failed: 'text-red-400',
    retrying: 'text-amber-400',
    cancelled: 'text-gray-400',
  };
  return colors[status] || 'text-gray-400';
}

export function getStatusBgColor(status: string): string {
  const colors: Record<string, string> = {
    pending: 'bg-yellow-400/10 text-yellow-400 border-yellow-400/20',
    waiting: 'bg-blue-400/10 text-blue-400 border-blue-400/20',
    running: 'bg-cyan-400/10 text-cyan-400 border-cyan-400/20',
    downloading: 'bg-indigo-400/10 text-indigo-400 border-indigo-400/20',
    completed: 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20',
    failed: 'bg-red-400/10 text-red-400 border-red-400/20',
    retrying: 'bg-amber-400/10 text-amber-400 border-amber-400/20',
    cancelled: 'bg-gray-400/10 text-gray-400 border-gray-400/20',
  };
  return colors[status] || 'bg-gray-400/10 text-gray-400 border-gray-400/20';
}

export function formatFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

