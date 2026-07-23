'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Globe,
  Play,
  Square,
  KeyRound,
  CheckCircle,
  AlertTriangle,
  ExternalLink,
  Info,
  Layers,
} from 'lucide-react';
import { useAppState } from '@/hooks/use-app-state';
import { cn } from '@/lib/utils';

export default function BrowserPage() {
  const {
    browserStatus,
    launchBrowser,
    closeBrowser,
  } = useAppState();

  const [checkingSession, setCheckingSession] = useState(false);
  const [sessionStatus, setSessionStatus] = useState<'valid' | 'invalid' | null>(null);

  const checkSession = async () => {
    setCheckingSession(true);
    try {
      const res = await fetch('/api/settings'); // Or session specific API
      // Since it launches the browser to validate, we'll hit our settings/status or trigger standard validation
      const validateRes = await fetch('/api/browser/validate-session', { method: 'POST' });
      const data = await validateRes.json();
      setSessionStatus(data.valid ? 'valid' : 'invalid');
    } catch {
      setSessionStatus('invalid');
    } finally {
      setCheckingSession(false);
    }
  };

  useEffect(() => {
    if (browserStatus.connected) {
      setSessionStatus(browserStatus.sessionValid ? 'valid' : 'invalid');
    } else {
      setSessionStatus(null);
    }
  }, [browserStatus.connected, browserStatus.sessionValid]);

  const handleLaunchLogin = async () => {
    try {
      await fetch('/api/browser/login-helper', { method: 'POST' });
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold gradient-text">Browser Controller</h1>
        <p className="text-sm text-white/40 mt-0.5">Control the underlying Playwright browser session</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Control Column */}
        <div className="md:col-span-2 space-y-6">
          {/* Main Controls Card */}
          <div className="glass-card p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white/90">Session Controller</h2>
              <span
                className={cn(
                  'px-3 py-1 rounded-full text-xs font-semibold border flex items-center gap-1.5',
                  browserStatus.connected
                    ? 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20'
                    : 'bg-red-400/10 text-red-400 border-red-400/20'
                )}
              >
                <Globe className="w-3.5 h-3.5" />
                {browserStatus.connected ? 'ACTIVE' : 'INACTIVE'}
              </span>
            </div>

            <div className="space-y-4">
              <p className="text-sm text-white/60 leading-relaxed">
                The automation platform operates inside a dedicated Chrome browser instance. Since you opted for a 
                <strong> separate visible window</strong>, launching the browser will open Chrome on your desktop, 
                allowing you to see all file uploads, prompts, and generations in real-time.
              </p>

              <div className="flex gap-4">
                {!browserStatus.connected ? (
                  <button
                    onClick={launchBrowser}
                    className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold shadow-lg shadow-cyan-500/10 transition-all"
                  >
                    <Play className="w-4 h-4" /> Start Browser
                  </button>
                ) : (
                  <button
                    onClick={closeBrowser}
                    className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 font-semibold transition-all"
                  >
                    <Square className="w-4 h-4" /> Close Browser
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Session Google Sign-In helper */}
          <div className="glass-card p-6 space-y-5">
            <h3 className="text-sm font-semibold text-white/80 flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-brand-400" />
              Google Authentication
            </h3>

            <p className="text-xs text-white/50 leading-relaxed">
              Google Flow requires a Google account login. The browser reuses session states, cookies, and local data 
              from the persistent context directory. Log in once, and the session persists indefinitely.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={handleLaunchLogin}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] text-xs font-semibold transition-all"
              >
                Launch Google Sign-in Page <ExternalLink className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={checkSession}
                disabled={checkingSession || !browserStatus.connected}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-brand-400/20 bg-brand-500/10 hover:bg-brand-500/20 text-brand-400 text-xs font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {checkingSession ? 'Checking...' : 'Verify Session Validity'}
              </button>
            </div>

            {sessionStatus && (
              <div
                className={cn(
                  'p-3 rounded-xl border text-xs flex items-center gap-2',
                  sessionStatus === 'valid'
                    ? 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20'
                    : 'bg-amber-400/10 text-amber-400 border-amber-400/20'
                )}
              >
                {sessionStatus === 'valid' ? (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Google session verified. Ready to run jobs.
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-4 h-4" />
                    Session invalid or expired. Please use "Launch Google Sign-in Page" to log in.
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Info Sidebar */}
        <div className="space-y-6">
          <div className="glass-card p-5 space-y-4">
            <h4 className="text-xs font-semibold text-white/50 uppercase tracking-wider flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5" /> Specifications
            </h4>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between pb-2 border-b border-white/[0.04]">
                <span className="text-white/40">Browser Engine</span>
                <span className="font-semibold">Playwright (Chromium)</span>
              </div>
              <div className="flex justify-between pb-2 border-b border-white/[0.04]">
                <span className="text-white/40">Headless Mode</span>
                <span className="font-semibold">{browserStatus.headless ? 'Yes' : 'No'}</span>
              </div>
              <div className="flex justify-between pb-2 border-b border-white/[0.04]">
                <span className="text-white/40">Storage state</span>
                <span className="font-semibold">PersistentContext</span>
              </div>
              <div className="flex justify-between pb-2 border-b border-white/[0.04]">
                <span className="text-white/40">Task Parallelism</span>
                <span className="font-semibold">Single-Threaded Profile</span>
              </div>
            </div>
          </div>

          <div className="glass-card p-5 space-y-4">
            <h4 className="text-xs font-semibold text-white/50 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5" /> Runtime Details
            </h4>
            <p className="text-[11px] text-white/45 leading-relaxed">
              When a job is running, the automation agent will control this window, perform the required clicks, 
              generate images, handle downloads, and automatically transition to video creation. 
              <strong> Avoid manually closing the Chrome window while jobs are running.</strong>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
