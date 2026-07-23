'use client';

import React, { useState, useEffect } from 'react';
import {
  Download,
  Image as ImageIcon,
  Video as VideoIcon,
  Search,
  ExternalLink,
  Trash2,
  RefreshCw,
  FolderOpen,
} from 'lucide-react';
import { cn, formatFileSize, formatDate } from '@/lib/utils';

export default function DownloadsPage() {
  const [activeTab, setActiveTab] = useState<'all' | 'images' | 'videos'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [downloads, setDownloads] = useState<{ images: any[]; videos: any[] }>({
    images: [],
    videos: [],
  });
  const [loading, setLoading] = useState(true);

  const fetchDownloads = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/downloads');
      const data = await res.json();
      setDownloads(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDownloads();
  }, []);

  const allFiles = [
    ...downloads.images.map((img) => ({ ...img, type: 'image' })),
    ...downloads.videos.map((vid) => ({ ...vid, type: 'video' })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const filteredFiles = allFiles.filter((file) => {
    const matchesTab =
      activeTab === 'all' ||
      (activeTab === 'images' && file.type === 'image') ||
      (activeTab === 'videos' && file.type === 'video');

    const matchesSearch = file.name.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesTab && matchesSearch;
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold gradient-text">Downloaded Outputs</h1>
          <p className="text-sm text-white/40 mt-0.5">Access generated images and videos</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchDownloads}
            className="p-2.5 rounded-xl border border-white/[0.06] bg-white/[0.02] text-white/60 hover:text-white transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tabs & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex border-b border-white/[0.06] overflow-x-auto whitespace-nowrap">
          {(['all', 'images', 'videos'] as const).map((tab) => {
            const count =
              tab === 'all'
                ? allFiles.length
                : tab === 'images'
                ? downloads.images.length
                : downloads.videos.length;

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

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input
            type="text"
            placeholder="Search downloads..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-white/[0.08] bg-surface-1 focus:border-brand-400 focus:outline-none text-sm transition-all"
          />
        </div>
      </div>

      {/* Gallery Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-white/40">
          <span className="animate-spin text-2xl mb-3">⌛</span>
          <p className="text-sm">Scanning folders...</p>
        </div>
      ) : filteredFiles.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-white/30 border border-dashed border-white/[0.08] rounded-2xl">
          <FolderOpen className="w-10 h-10 mb-3" />
          <p className="text-sm font-medium">No outputs generated yet</p>
          <p className="text-xs mt-1">Once a job finishes, the results will display here</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredFiles.map((file) => (
            <div
              key={file.name}
              className="glass-card glass-card-hover overflow-hidden flex flex-col group"
            >
              {/* Media Preview Container */}
              <div className="aspect-video w-full bg-black/40 relative flex items-center justify-center overflow-hidden border-b border-white/[0.06]">
                {file.type === 'video' ? (
                  <video
                    src={file.path}
                    className="w-full h-full object-cover"
                    preload="metadata"
                  />
                ) : (
                  <img
                    src={file.path}
                    alt={file.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                )}

                {/* Media Icon Overlay */}
                <div className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 backdrop-blur-md border border-white/[0.08] text-white/70">
                  {file.type === 'video' ? (
                    <VideoIcon className="w-4 h-4" />
                  ) : (
                    <ImageIcon className="w-4 h-4" />
                  )}
                </div>
              </div>

              {/* Info & Download footer */}
              <div className="p-4 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-semibold truncate text-white/90" title={file.name}>
                    {file.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-1 text-[11px] text-white/40">
                    <span>{formatFileSize(file.size)}</span>
                    <span>•</span>
                    <span>{formatDate(file.createdAt)}</span>
                  </div>
                </div>

                <div className="flex gap-2 mt-4 pt-3 border-t border-white/[0.04]">
                  <a
                    href={file.path}
                    download={file.name}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-brand-500/10 hover:bg-brand-500/20 text-brand-400 text-xs font-semibold transition-all border border-brand-500/20"
                  >
                    <Download className="w-3.5 h-3.5" /> Download
                  </a>
                  <a
                    href={file.path}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 rounded-lg border border-white/[0.08] bg-white/[0.01] hover:bg-white/[0.04] text-white/60 hover:text-white transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
