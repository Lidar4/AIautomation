import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { processSchedulerQueue } from '@/lib/api';
import { PageHeader, Spinner, Toast, EmptyState, StatCard } from '@/components/ui';
import type { ScheduledTask, Video } from '@/lib/types';
import {
  CalendarClock, Play, CheckCircle2, Clock, AlertTriangle, Trash2, Zap, Video as VideoIcon, Loader2,
} from 'lucide-react';

export function SchedulerPage() {
  const [tasks, setTasks] = useState<ScheduledTask[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'info' | 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'info' | 'success' | 'error' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const load = useCallback(async () => {
    try {
      const [tRes, vRes] = await Promise.all([
        supabase.from('scheduled_tasks').select('*').order('scheduled_for', { ascending: false }),
        supabase.from('videos').select('*').order('created_at', { ascending: false }),
      ]);
      setTasks((tRes.data ?? []) as ScheduledTask[]);
      setVideos((vRes.data ?? []) as Video[]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleProcess = async () => {
    setProcessing(true);
    try {
      const result = await processSchedulerQueue();
      showToast(`Processed ${result.processed} task(s)`, 'success');
      await load();
    } catch (err) {
      showToast((err as Error).message, 'error');
    } finally {
      setProcessing(false);
    }
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case 'completed': return <span className="badge-success"><CheckCircle2 className="w-3 h-3" /> Completed</span>;
      case 'running': return <span className="badge-warning"><Loader2 className="w-3 h-3 animate-spin" /> Running</span>;
      case 'pending': return <span className="badge-brand"><Clock className="w-3 h-3" /> Pending</span>;
      case 'failed': return <span className="badge-danger"><AlertTriangle className="w-3 h-3" /> Failed</span>;
      default: return <span className="badge-neutral">{status}</span>;
    }
  };

  const pending = tasks.filter((t) => t.status === 'pending').length;
  const completed = tasks.filter((t) => t.status === 'completed').length;
  const failed = tasks.filter((t) => t.status === 'failed').length;
  const scheduledVideos = videos.filter((v) => v.status === 'scheduled').length;

  return (
    <>
      <PageHeader
        title="Scheduler"
        subtitle="Manage your upload queue and background jobs"
        action={
          <button onClick={handleProcess} disabled={processing} className="btn-primary">
            {processing ? <Spinner /> : <Play className="w-4 h-4" />} Process Queue Now
          </button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Pending" value={loading ? '—' : pending} icon={Clock} accent="brand" />
        <StatCard label="Completed" value={loading ? '—' : completed} icon={CheckCircle2} accent="success" />
        <StatCard label="Failed" value={loading ? '—' : failed} icon={AlertTriangle} accent="danger" />
        <StatCard label="Scheduled Videos" value={loading ? '—' : scheduledVideos} icon={CalendarClock} accent="warning" />
      </div>

      {/* Task queue */}
      <div className="card p-5 mb-6">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-4">
          <Zap className="w-4 h-4 text-brand-400" /> Task Queue
        </h3>
        {loading ? (
          <div className="flex justify-center py-10"><Spinner className="w-6 h-6 text-brand-400" /></div>
        ) : tasks.length === 0 ? (
          <EmptyState icon={CalendarClock} title="No tasks queued" hint="Schedule a video upload to create a task." />
        ) : (
          <div className="space-y-2">
            {tasks.map((t) => {
              const video = videos.find((v) => v.id === t.video_id);
              return (
                <div key={t.id} className="flex items-center gap-3 px-3 py-3 rounded-lg bg-ink-850">
                  <div className="w-9 h-9 rounded-lg bg-ink-800 flex items-center justify-center shrink-0">
                    <VideoIcon className="w-4 h-4 text-slate-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-200 truncate">
                      {video?.title ?? `${t.type} task`}
                    </p>
                    <p className="text-xs text-slate-500">
                      Scheduled: {new Date(t.scheduled_for).toLocaleString()}
                      {t.error_message && <span className="text-danger-400 ml-2">· {t.error_message}</span>}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {statusBadge(t.status)}
                    <button
                      onClick={async () => { await supabase.from('scheduled_tasks').delete().eq('id', t.id); load(); }}
                      className="btn-ghost p-1.5 text-danger-400"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Scheduled videos */}
      <div className="card p-5">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-4">
          <CalendarClock className="w-4 h-4 text-brand-400" /> Scheduled Videos
        </h3>
        {videos.filter((v) => v.status === 'scheduled').length === 0 ? (
          <EmptyState icon={CalendarClock} title="No scheduled videos" hint="Create a video with a schedule in YouTube Automation." />
        ) : (
          <div className="space-y-2">
            {videos.filter((v) => v.status === 'scheduled').map((v) => (
              <div key={v.id} className="flex items-center gap-3 px-3 py-3 rounded-lg bg-ink-850">
                <CalendarClock className="w-4 h-4 text-brand-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-200 truncate">{v.title}</p>
                  <p className="text-xs text-slate-500">{new Date(v.scheduled_at!).toLocaleString()}</p>
                </div>
                <span className="badge-brand">Scheduled</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {toast && <Toast message={toast.message} type={toast.type} />}
    </>
  );
}
