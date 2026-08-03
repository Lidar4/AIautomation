import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { fetchApiKeys, getYouTubeStatus } from '@/lib/api';
import { PageHeader, StatCard, EmptyState } from '@/components/ui';
import type { ApiKey } from '@/lib/types';
import {
  Video, CheckCircle2, CalendarClock, Plug, Sparkles, AlertTriangle, TrendingUp, Youtube, ArrowRight,
} from 'lucide-react';
import type { Page } from '@/components/DashboardLayout';

export function DashboardPage({ onNavigate }: { onNavigate: (p: Page) => void }) {
  const { config } = useAuth();
  const [stats, setStats] = useState({
    uploaded: 0, scheduled: 0, draft: 0, failed: 0, media: 0, aiGenerations: 0, tasks: 0,
  });
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [ytStatus, setYtStatus] = useState<{ connected: boolean; channelTitle: string | null }>({
    connected: false, channelTitle: null,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [videos, media, aiGen, tasks, keys, yt] = await Promise.all([
          supabase.from('videos').select('status'),
          supabase.from('media').select('id', { count: 'exact', head: true }),
          supabase.from('ai_generations').select('id', { count: 'exact', head: true }),
          supabase.from('scheduled_tasks').select('status'),
          fetchApiKeys().catch(() => []),
          getYouTubeStatus().catch(() => ({ connected: false, channelId: null, channelTitle: null })),
        ]);

        const vStatus = (videos.data ?? []) as { status: string }[];
        const tStatus = (tasks.data ?? []) as { status: string }[];

        setStats({
          uploaded: vStatus.filter((v) => v.status === 'uploaded').length,
          scheduled: vStatus.filter((v) => v.status === 'scheduled').length,
          draft: vStatus.filter((v) => v.status === 'draft' || v.status === 'ready').length,
          failed: vStatus.filter((v) => v.status === 'failed').length,
          media: media.count ?? 0,
          aiGenerations: aiGen.count ?? 0,
          tasks: tStatus.filter((t) => t.status === 'pending').length,
        });
        setApiKeys(keys);
        setYtStatus({ connected: yt.connected, channelTitle: yt.channelTitle });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const connectedApis = apiKeys.filter((k) => k.enabled && k.status === 'connected').length;
  const totalApis = apiKeys.length;

  return (
    <>
      <PageHeader title="Dashboard" subtitle="Overview of your YouTube automation platform" />

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Uploaded" value={loading ? '—' : stats.uploaded} icon={CheckCircle2} accent="success" />
        <StatCard label="Scheduled" value={loading ? '—' : stats.scheduled} icon={CalendarClock} accent="brand" />
        <StatCard label="In Progress" value={loading ? '—' : stats.draft} icon={Video} accent="warning" />
        <StatCard label="Failed" value={loading ? '—' : stats.failed} icon={AlertTriangle} accent="danger" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <StatCard label="Media Assets" value={loading ? '—' : stats.media} icon={Video} accent="accent" />
        <StatCard label="AI Generations" value={loading ? '—' : stats.aiGenerations} icon={Sparkles} accent="brand" />
        <StatCard label="Pending Tasks" value={loading ? '—' : stats.tasks} icon={CalendarClock} accent="warning" />
      </div>

      {/* Status panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Connected APIs */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Plug className="w-4 h-4 text-brand-400" /> Connected APIs
            </h3>
            <button onClick={() => onNavigate('settings')} className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1">
              Manage <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          {totalApis === 0 ? (
            <EmptyState icon={Plug} title="No APIs configured" hint="Add your API keys in the API Manager to enable AI features." />
          ) : (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Connected</span>
                <span className="text-white font-medium">{connectedApis} / {totalApis}</span>
              </div>
              <div className="h-2 bg-ink-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-brand-500 to-brand-400 rounded-full transition-all duration-500"
                  style={{ width: `${totalApis ? (connectedApis / totalApis) * 100 : 0}%` }}
                />
              </div>
              <div className="flex flex-wrap gap-1.5 pt-2">
                {apiKeys.slice(0, 6).map((k) => (
                  <span key={k.id} className={k.enabled && k.status === 'connected' ? 'badge-success' : 'badge-neutral'}>
                    {k.provider.replace(/_/g, ' ')}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* YouTube connection */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Youtube className="w-4 h-4 text-danger-400" /> YouTube Channel
            </h3>
            <button onClick={() => onNavigate('youtube')} className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1">
              Open <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          {ytStatus.connected ? (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-danger-500/15 flex items-center justify-center">
                <Youtube className="w-5 h-5 text-danger-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">{ytStatus.channelTitle ?? 'Connected'}</p>
                <p className="text-xs text-success-400">Channel connected</p>
              </div>
            </div>
          ) : (
            <EmptyState icon={Youtube} title="YouTube not connected" hint="Connect your channel in YouTube Automation to enable uploads." />
          )}
        </div>

        {/* AI modules */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-4">
            <Sparkles className="w-4 h-4 text-brand-400" /> AI Modules
          </h3>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {['Script Gen', 'Title Gen', 'Description', 'Hashtags', 'Tags', 'Thumbnails'].map((m) => {
              const aiReady = apiKeys.some((k) => k.enabled && ['openai', 'google_gemini', 'openrouter'].includes(k.provider));
              return (
                <div key={m} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-ink-850">
                  <span className={`w-2 h-2 rounded-full ${aiReady ? 'bg-success-400 animate-pulse-soft' : 'bg-slate-600'}`} />
                  <span className={aiReady ? 'text-slate-200' : 'text-slate-500'}>{m}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick actions */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-brand-400" /> Quick Actions
          </h3>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => onNavigate('ai-pipeline')} className="btn-secondary text-xs justify-start">
              <Sparkles className="w-3.5 h-3.5" /> Generate Content
            </button>
            <button onClick={() => onNavigate('trending')} className="btn-secondary text-xs justify-start">
              <TrendingUp className="w-3.5 h-3.5" /> Find Trends
            </button>
            <button onClick={() => onNavigate('youtube')} className="btn-secondary text-xs justify-start">
              <Video className="w-3.5 h-3.5" /> Upload Video
            </button>
            <button onClick={() => onNavigate('scheduler')} className="btn-secondary text-xs justify-start">
              <CalendarClock className="w-3.5 h-3.5" /> Schedule
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
