'use client';

import React, { useState, useEffect } from 'react';
import {
  Save,
  RotateCcw,
  Sliders,
  FolderOpen,
  Globe,
  MessageSquare,
  ListTodo,
  Download,
  CheckCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { DEFAULT_SETTINGS } from '@/types/settings';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'general' | 'browser' | 'prompts' | 'queue' | 'downloads'>('general');
  const [settings, setSettings] = useState<any>({ ...DEFAULT_SETTINGS });
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({
    type: null,
    message: '',
  });

  useEffect(() => {
    fetch('/api/settings')
      .then((res) => res.json())
      .then((data) => {
        // Normalize strings to boolean/number types from settings map
        const normalized: any = {};
        for (const [key, val] of Object.entries(data)) {
          if (val === 'true') normalized[key] = true;
          else if (val === 'false') normalized[key] = false;
          else if (!isNaN(Number(val)) && typeof DEFAULT_SETTINGS[key as keyof typeof DEFAULT_SETTINGS] === 'number') {
            normalized[key] = Number(val);
          } else {
            normalized[key] = val;
          }
        }
        setSettings({ ...DEFAULT_SETTINGS, ...normalized });
      })
      .catch((err) => console.error('Error fetching settings:', err))
      .finally(() => setLoading(false));
  }, []);

  const handleInputChange = (key: string, value: any) => {
    setSettings((prev: any) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaveStatus({ type: null, message: '' });
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      if (!res.ok) throw new Error('Failed to update settings');

      setSaveStatus({ type: 'success', message: 'Settings saved and applied successfully!' });
      setTimeout(() => setSaveStatus({ type: null, message: '' }), 4000);
    } catch (err: any) {
      setSaveStatus({ type: 'error', message: err.message || 'Error saving settings' });
    }
  };

  const handleReset = (tab: typeof activeTab) => {
    const keysMap: Record<typeof activeTab, string[]> = {
      general: ['inputFolder', 'outputFolder', 'videoFolder', 'downloadFolder', 'completedFolder', 'failedFolder'],
      browser: ['browserType', 'headless', 'slowMotion', 'autoRestartBrowser'],
      prompts: ['imagePrompt', 'videoPrompt'],
      queue: ['maxConcurrentJobs', 'retryAttempts', 'retryDelay', 'jobTimeout'],
      downloads: ['autoRename', 'overwriteExisting', 'keepOriginalFile', 'deleteTemporaryFiles'],
    };

    const targetKeys = keysMap[tab];
    setSettings((prev: any) => {
      const resetObj = { ...prev };
      targetKeys.forEach((k) => {
        resetObj[k] = DEFAULT_SETTINGS[k as keyof typeof DEFAULT_SETTINGS];
      });
      return resetObj;
    });
  };

  const tabItems = [
    { id: 'general', label: 'Folders', icon: FolderOpen },
    { id: 'browser', label: 'Browser', icon: Globe },
    { id: 'prompts', label: 'AI Prompts', icon: MessageSquare },
    { id: 'queue', label: 'Queue', icon: ListTodo },
    { id: 'downloads', label: 'Downloads', icon: Download },
  ] as const;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold gradient-text">System Settings</h1>
          <p className="text-sm text-white/40 mt-0.5">Configure folders, browser contexts, and AI parameters</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleReset(activeTab)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-white/[0.06] bg-white/[0.02] text-white/60 hover:text-white transition-colors text-xs font-semibold"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reset Current Tab
          </button>
          
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-semibold shadow-lg shadow-cyan-500/10 transition-all"
          >
            <Save className="w-3.5 h-3.5" /> Save Changes
          </button>
        </div>
      </div>

      {saveStatus.type && (
        <div
          className={cn(
            'p-3.5 rounded-xl border text-xs flex items-center gap-2',
            saveStatus.type === 'success'
              ? 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20'
              : 'bg-red-400/10 text-red-400 border-red-400/20'
          )}
        >
          <CheckCircle className="w-4 h-4" />
          {saveStatus.message}
        </div>
      )}

      {/* Tabs Layout */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Navigation Sidebar */}
        <div className="md:col-span-1 flex md:flex-col overflow-x-auto gap-1 border-b md:border-b-0 md:border-r border-white/[0.06] pb-2 md:pb-0 md:pr-4">
          {tabItems.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-2 px-3 py-2.5 rounded-xl transition-all text-xs font-semibold whitespace-nowrap',
                  isActive
                    ? 'bg-brand-500/10 text-brand-400 border border-brand-400/10'
                    : 'text-white/40 hover:text-white/70 hover:bg-white/[0.02]'
                )}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content Pane */}
        <div className="md:col-span-3">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-white/40">
              <span className="animate-spin text-2xl mb-3">⌛</span>
              <p className="text-sm">Loading config parameters...</p>
            </div>
          ) : (
            <div className="glass-card p-6 space-y-6">
              {/* Folders Tab */}
              {activeTab === 'general' && (
                <div className="space-y-4">
                  <h2 className="text-sm font-bold text-white/80 uppercase tracking-wider mb-2">Folder Configuration</h2>
                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-white/60">Input Watch Folder</label>
                      <input
                        type="text"
                        value={settings.inputFolder}
                        onChange={(e) => handleInputChange('inputFolder', e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-white/[0.08] bg-surface-1 focus:border-brand-400 focus:outline-none text-xs"
                      />
                      <p className="text-[10px] text-white/30">Chokidar watches this folder for newly dropped images.</p>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-white/60">Output Generated Image Folder</label>
                      <input
                        type="text"
                        value={settings.outputFolder}
                        onChange={(e) => handleInputChange('outputFolder', e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-white/[0.08] bg-surface-1 focus:border-brand-400 focus:outline-none text-xs"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-white/60">Output Generated Video Folder</label>
                      <input
                        type="text"
                        value={settings.videoFolder}
                        onChange={(e) => handleInputChange('videoFolder', e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-white/[0.08] bg-surface-1 focus:border-brand-400 focus:outline-none text-xs"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-white/60">Completed Jobs Original File Archive</label>
                      <input
                        type="text"
                        value={settings.completedFolder}
                        onChange={(e) => handleInputChange('completedFolder', e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-white/[0.08] bg-surface-1 focus:border-brand-400 focus:outline-none text-xs"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-white/60">Failed Jobs Archive</label>
                      <input
                        type="text"
                        value={settings.failedFolder}
                        onChange={(e) => handleInputChange('failedFolder', e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-white/[0.08] bg-surface-1 focus:border-brand-400 focus:outline-none text-xs"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Browser Tab */}
              {activeTab === 'browser' && (
                <div className="space-y-4">
                  <h2 className="text-sm font-bold text-white/80 uppercase tracking-wider mb-2">Browser Options</h2>
                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-white/60">Browser Engine</label>
                      <select
                        value={settings.browserType}
                        onChange={(e) => handleInputChange('browserType', e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-white/[0.08] bg-surface-1 focus:border-brand-400 focus:outline-none text-xs"
                      >
                        <option value="chromium">Chromium (Chrome)</option>
                        <option value="firefox">Firefox</option>
                        <option value="webkit">WebKit (Safari)</option>
                      </select>
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-xl border border-white/[0.04] bg-white/[0.01]">
                      <div className="space-y-0.5">
                        <label className="text-xs font-semibold">Headless Mode</label>
                        <p className="text-[10px] text-white/30">Run browser without a visible window.</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={settings.headless}
                        onChange={(e) => handleInputChange('headless', e.target.checked)}
                        className="w-4 h-4 rounded text-brand-500 accent-brand-500 cursor-pointer"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-white/60">Slow Motion (ms)</label>
                      <input
                        type="number"
                        value={settings.slowMotion}
                        onChange={(e) => handleInputChange('slowMotion', Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-xl border border-white/[0.08] bg-surface-1 focus:border-brand-400 focus:outline-none text-xs"
                        min="0"
                        step="50"
                      />
                      <p className="text-[10px] text-white/30">Forces a delay between automation actions to simulate human speed.</p>
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-xl border border-white/[0.04] bg-white/[0.01]">
                      <div className="space-y-0.5">
                        <label className="text-xs font-semibold">Auto Restart Browser</label>
                        <p className="text-[10px] text-white/30">Relaunch browser context if it crashes.</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={settings.autoRestartBrowser}
                        onChange={(e) => handleInputChange('autoRestartBrowser', e.target.checked)}
                        className="w-4 h-4 rounded text-brand-500 accent-brand-500 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Prompts Tab */}
              {activeTab === 'prompts' && (
                <div className="space-y-4">
                  <h2 className="text-sm font-bold text-white/80 uppercase tracking-wider mb-2">Universal Prompts</h2>
                  
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-white/60">Universal Image Prompt</label>
                    <textarea
                      value={settings.imagePrompt}
                      onChange={(e) => handleInputChange('imagePrompt', e.target.value)}
                      rows={5}
                      className="w-full px-3 py-2 rounded-xl border border-white/[0.08] bg-surface-1 focus:border-brand-400 focus:outline-none text-xs font-sans leading-relaxed resize-y"
                    />
                    <p className="text-[10px] text-white/30">Prompt injected to generate the AI modified image asset.</p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-white/60">Universal Video Prompt</label>
                    <textarea
                      value={settings.videoPrompt}
                      onChange={(e) => handleInputChange('videoPrompt', e.target.value)}
                      rows={5}
                      className="w-full px-3 py-2 rounded-xl border border-white/[0.08] bg-surface-1 focus:border-brand-400 focus:outline-none text-xs font-sans leading-relaxed resize-y"
                    />
                    <p className="text-[10px] text-white/30">Prompt injected to generate the subsequent video from the image asset.</p>
                  </div>
                </div>
              )}

              {/* Queue Tab */}
              {activeTab === 'queue' && (
                <div className="space-y-4">
                  <h2 className="text-sm font-bold text-white/80 uppercase tracking-wider mb-2">Queue Behavior</h2>
                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-white/60">Maximum Concurrent Jobs</label>
                      <input
                        type="number"
                        value={settings.maxConcurrentJobs}
                        onChange={(e) => handleInputChange('maxConcurrentJobs', Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-xl border border-white/[0.08] bg-surface-1 focus:border-brand-400 focus:outline-none text-xs"
                        min="1"
                        max="5"
                      />
                      <p className="text-[10px] text-white/30">How many jobs run concurrently. Note: single user login profile forces this to 1.</p>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-white/60">Retry Attempts</label>
                      <input
                        type="number"
                        value={settings.retryAttempts}
                        onChange={(e) => handleInputChange('retryAttempts', Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-xl border border-white/[0.08] bg-surface-1 focus:border-brand-400 focus:outline-none text-xs"
                        min="0"
                        max="5"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-white/60">Retry Delay (ms)</label>
                      <input
                        type="number"
                        value={settings.retryDelay}
                        onChange={(e) => handleInputChange('retryDelay', Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-xl border border-white/[0.08] bg-surface-1 focus:border-brand-400 focus:outline-none text-xs"
                        min="500"
                        step="500"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-white/60">Job Step Timeout (ms)</label>
                      <input
                        type="number"
                        value={settings.jobTimeout}
                        onChange={(e) => handleInputChange('jobTimeout', Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-xl border border-white/[0.08] bg-surface-1 focus:border-brand-400 focus:outline-none text-xs"
                        min="30000"
                        step="10000"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Downloads Tab */}
              {activeTab === 'downloads' && (
                <div className="space-y-4">
                  <h2 className="text-sm font-bold text-white/80 uppercase tracking-wider mb-2">Download Handler</h2>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 rounded-xl border border-white/[0.04] bg-white/[0.01]">
                      <div className="space-y-0.5">
                        <label className="text-xs font-semibold">Auto Rename Conflicts</label>
                        <p className="text-[10px] text-white/30">Append counters to duplicate filenames instead of failing.</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={settings.autoRename}
                        onChange={(e) => handleInputChange('autoRename', e.target.checked)}
                        className="w-4 h-4 rounded text-brand-500 accent-brand-500 cursor-pointer"
                      />
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-xl border border-white/[0.04] bg-white/[0.01]">
                      <div className="space-y-0.5">
                        <label className="text-xs font-semibold">Overwrite Existing Files</label>
                        <p className="text-[10px] text-white/30">Overwrite if file already exists in output folder.</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={settings.overwriteExisting}
                        onChange={(e) => handleInputChange('overwriteExisting', e.target.checked)}
                        className="w-4 h-4 rounded text-brand-500 accent-brand-500 cursor-pointer"
                      />
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-xl border border-white/[0.04] bg-white/[0.01]">
                      <div className="space-y-0.5">
                        <label className="text-xs font-semibold">Keep Original Watch File</label>
                        <p className="text-[10px] text-white/30">Retain copy of original watched image inside Watch directory.</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={settings.keepOriginalFile}
                        onChange={(e) => handleInputChange('keepOriginalFile', e.target.checked)}
                        className="w-4 h-4 rounded text-brand-500 accent-brand-500 cursor-pointer"
                      />
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-xl border border-white/[0.04] bg-white/[0.01]">
                      <div className="space-y-0.5">
                        <label className="text-xs font-semibold">Delete Temporary Files</label>
                        <p className="text-[10px] text-white/30">Purge intermediates and temp browser cache files on completion.</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={settings.deleteTemporaryFiles}
                        onChange={(e) => handleInputChange('deleteTemporaryFiles', e.target.checked)}
                        className="w-4 h-4 rounded text-brand-500 accent-brand-500 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
