import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import {
  getYouTubeStatus, getYouTubeOAuthUrl, connectYouTube, disconnectYouTube,
} from '@/lib/api';
import { PageHeader, EmptyState, Spinner, Toast } from '@/components/ui';
import type { MediaAsset, Video } from '@/lib/types';
import {
  Youtube, Upload, Plus, Film, Image as ImageIcon, Calendar, Link2, Unlink,
  CheckCircle2, Clock, AlertTriangle, Trash2, Video as VideoIcon, X,
} from 'lucide-react';

type Tab = 'queue' | 'media' | 'schedule';

export function YouTubePage() {
  const { config } = useAuth();
  const [tab, setTab] = useState<Tab>('queue');
  const [videos, setVideos] = useState<Video[]>([]);
  const [media, setMedia] = useState<MediaAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [ytStatus, setYtStatus] = useState<{ connected: boolean; channelTitle: string | null }>({ connected: false, channelTitle: null });
  const [connecting, setConnecting] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'info' | 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'info' | 'success' | 'error' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const load = useCallback(async () => {
    try {
      const [vRes, mRes, yt] = await Promise.all([
        supabase.from('videos').select('*').order('created_at', { ascending: false }),
        supabase.from('media').select('*').order('created_at', { ascending: false }),
        getYouTubeStatus().catch(() => ({ connected: false, channelId: null, channelTitle: null })),
      ]);
      setVideos((vRes.data ?? []) as Video[]);
      setMedia((mRes.data ?? []) as MediaAsset[]);
      setYtStatus({ connected: yt.connected, channelTitle: yt.channelTitle });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const redirectUri = `${window.location.origin}/youtube/callback`;
      const url = await getYouTubeOAuthUrl(redirectUri);
      window.location.href = url;
    } catch (err) {
      showToast((err as Error).message, 'error');
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnectYouTube();
      showToast('YouTube disconnected', 'success');
      await load();
    } catch (err) {
      showToast((err as Error).message, 'error');
    }
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case 'uploaded': return <span className="badge-success"><CheckCircle2 className="w-3 h-3" /> Uploaded</span>;
      case 'scheduled': return <span className="badge-brand"><Calendar className="w-3 h-3" /> Scheduled</span>;
      case 'uploading': return <span className="badge-warning"><Clock className="w-3 h-3" /> Uploading</span>;
      case 'failed': return <span className="badge-danger"><AlertTriangle className="w-3 h-3" /> Failed</span>;
      default: return <span className="badge-neutral">{status}</span>;
    }
  };

  return (
    <>
      <PageHeader
        title="YouTube Automation"
        subtitle="Manage your channel, media library, video queue, and upload schedule"
        action={
          <div className="flex gap-2">
            <button onClick={() => setShowUpload(true)} className="btn-secondary text-sm">
              <Upload className="w-4 h-4" /> Upload Media
            </button>
            <button onClick={() => setShowCreate(true)} className="btn-primary text-sm">
              <Plus className="w-4 h-4" /> New Video
            </button>
          </div>
        }
      />

      {/* Channel connection */}
      <div className="card p-5 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${ytStatus.connected ? 'bg-danger-500/15' : 'bg-ink-800'}`}>
              <Youtube className={`w-6 h-6 ${ytStatus.connected ? 'text-danger-400' : 'text-slate-600'}`} />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">
                {ytStatus.connected ? (ytStatus.channelTitle ?? 'YouTube Channel') : 'No channel connected'}
              </p>
              <p className="text-xs text-slate-500">
                {ytStatus.connected ? 'Your YouTube channel is connected and ready for uploads.' : 'Connect your YouTube channel to enable uploads.'}
              </p>
            </div>
          </div>
          {ytStatus.connected ? (
            <button onClick={handleDisconnect} className="btn-danger text-sm">
              <Unlink className="w-4 h-4" /> Disconnect
            </button>
          ) : (
            <button onClick={handleConnect} disabled={connecting} className="btn-primary text-sm">
              {connecting ? <Spinner /> : <Link2 className="w-4 h-4" />} Connect YouTube
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 p-1 bg-ink-850 rounded-xl w-fit">
        {([['queue', 'Video Queue', VideoIcon], ['media', 'Media Library', Film], ['schedule', 'Scheduled', Calendar]] as const).map(([id, label, Icon]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={tab === id ? 'nav-item-active' : 'nav-item'}
          >
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Spinner className="w-8 h-8 text-brand-400" /></div>
      ) : tab === 'queue' ? (
        <div className="space-y-3">
          {videos.length === 0 ? (
            <div className="card p-6"><EmptyState icon={VideoIcon} title="No videos yet" hint="Create a new video to start building your upload queue." /></div>
          ) : (
            videos.map((v) => (
              <div key={v.id} className="card p-4 flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-ink-800 flex items-center justify-center shrink-0">
                  <VideoIcon className="w-5 h-5 text-slate-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{v.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {v.privacy_status} · {v.tags.length} tags · {v.hashtags.length} hashtags
                  </p>
                  {v.error_message && <p className="text-xs text-danger-400 mt-1">{v.error_message}</p>}
                </div>
                <div className="flex items-center gap-3">
                  {statusBadge(v.status)}
                  <button
                    onClick={async () => { await supabase.from('videos').delete().eq('id', v.id); load(); }}
                    className="btn-ghost p-2 text-danger-400"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      ) : tab === 'media' ? (
        <div>
          {media.length === 0 ? (
            <div className="card p-6"><EmptyState icon={Film} title="No media uploaded" hint="Upload videos, thumbnails, and images to your media library." /></div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {media.map((m) => (
                <div key={m.id} className="card card-hover p-3">
                  <div className="aspect-video rounded-lg bg-ink-850 flex items-center justify-center mb-2 overflow-hidden">
                    {m.type === 'image' && m.file_url ? (
                      <img src={m.file_url} alt={m.title} className="w-full h-full object-cover" />
                    ) : (
                      <Film className="w-8 h-8 text-slate-600" />
                    )}
                  </div>
                  <p className="text-xs font-medium text-white truncate">{m.title}</p>
                  <p className="text-[10px] text-slate-500 uppercase">{m.type}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {videos.filter((v) => v.status === 'scheduled' && v.scheduled_at).length === 0 ? (
            <div className="card p-6"><EmptyState icon={Calendar} title="No scheduled uploads" hint="Schedule videos for automatic publishing." /></div>
          ) : (
            videos.filter((v) => v.status === 'scheduled' && v.scheduled_at).map((v) => (
              <div key={v.id} className="card p-4 flex items-center gap-4">
                <Calendar className="w-5 h-5 text-brand-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{v.title}</p>
                  <p className="text-xs text-slate-500">{new Date(v.scheduled_at!).toLocaleString()}</p>
                </div>
                <span className="badge-brand">Scheduled</span>
              </div>
            ))
          )}
        </div>
      )}

      {/* Upload modal */}
      {showUpload && (
        <UploadModal onClose={() => setShowUpload(false)} onDone={() => { setShowUpload(false); load(); }} showToast={showToast} />
      )}

      {/* Create video modal */}
      {showCreate && (
        <CreateVideoModal
          media={media}
          onClose={() => setShowCreate(false)}
          onDone={() => { setShowCreate(false); load(); }}
          showToast={showToast}
        />
      )}

      {toast && <Toast message={toast.message} type={toast.type} />}
    </>
  );
}

function UploadModal({ onClose, onDone, showToast }: { onClose: () => void; onDone: () => void; showToast: (m: string, t?: 'info' | 'success' | 'error') => void }) {
  const [title, setTitle] = useState('');
  const [type, setType] = useState<'video' | 'image' | 'thumbnail'>('video');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const handleUpload = async () => {
    if (!file || !title) { showToast('Title and file are required', 'error'); return; }
    setBusy(true);
    try {
      const ext = file.name.split('.').pop() ?? 'bin';
      const path = `media/${type}s/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: upErr } = await supabase.storage.from('media').upload(path, file);
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from('media').getPublicUrl(path);
      const { error: dbErr } = await supabase.from('media').insert({
        title, type, file_path: path, file_url: urlData.publicUrl, mime_type: file.type, size_bytes: file.size,
      });
      if (dbErr) throw dbErr;
      showToast('Media uploaded', 'success');
      onDone();
    } catch (err) {
      showToast((err as Error).message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title="Upload Media" onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className="label">Title</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} className="input" placeholder="My video" />
        </div>
        <div>
          <label className="label">Type</label>
          <select value={type} onChange={(e) => setType(e.target.value as 'video' | 'image' | 'thumbnail')} className="input">
            <option value="video">Video</option>
            <option value="image">Image</option>
            <option value="thumbnail">Thumbnail</option>
          </select>
        </div>
        <div>
          <label className="label">File</label>
          <input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="input" />
        </div>
        <button onClick={handleUpload} disabled={busy} className="btn-primary w-full">
          {busy ? <Spinner /> : <Upload className="w-4 h-4" />} Upload
        </button>
      </div>
    </Modal>
  );
}

function CreateVideoModal({
  media, onClose, onDone, showToast,
}: {
  media: MediaAsset[];
  onClose: () => void;
  onDone: () => void;
  showToast: (m: string, t?: 'info' | 'success' | 'error') => void;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [hashtags, setHashtags] = useState('');
  const [mediaId, setMediaId] = useState('');
  const [privacy, setPrivacy] = useState<'public' | 'unlisted' | 'private'>('private');
  const [scheduledAt, setScheduledAt] = useState('');
  const [busy, setBusy] = useState(false);

  const handleCreate = async () => {
    if (!title) { showToast('Title is required', 'error'); return; }
    setBusy(true);
    try {
      const tagArr = tags.split(',').map((t) => t.trim()).filter(Boolean);
      const hashArr = hashtags.split(',').map((t) => t.trim().replace(/^#/, '')).filter(Boolean);
      const status = scheduledAt ? 'scheduled' : 'draft';
      const { error } = await supabase.from('videos').insert({
        title, description, tags: tagArr, hashtags: hashArr,
        media_id: mediaId || null, privacy_status: privacy,
        scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : null,
        status,
      });
      if (error) throw error;

      if (status === 'scheduled') {
        await supabase.from('scheduled_tasks').insert({
          type: 'upload',
          status: 'pending',
          payload: {},
          scheduled_for: new Date(scheduledAt).toISOString(),
        });
      }

      showToast('Video created', 'success');
      onDone();
    } catch (err) {
      showToast((err as Error).message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const videoMedia = media.filter((m) => m.type === 'video');

  return (
    <Modal title="Create New Video" onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className="label">Title</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} className="input" placeholder="Video title" />
        </div>
        <div>
          <label className="label">Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="input min-h-[80px]" placeholder="Video description" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Tags (comma separated)</label>
            <input value={tags} onChange={(e) => setTags(e.target.value)} className="input" placeholder="tag1, tag2" />
          </div>
          <div>
            <label className="label">Hashtags (comma separated)</label>
            <input value={hashtags} onChange={(e) => setHashtags(e.target.value)} className="input" placeholder="fun, viral" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Media File</label>
            <select value={mediaId} onChange={(e) => setMediaId(e.target.value)} className="input">
              <option value="">— None —</option>
              {videoMedia.map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Privacy</label>
            <select value={privacy} onChange={(e) => setPrivacy(e.target.value as 'public' | 'unlisted' | 'private')} className="input">
              <option value="private">Private</option>
              <option value="unlisted">Unlisted</option>
              <option value="public">Public</option>
            </select>
          </div>
        </div>
        <div>
          <label className="label">Schedule (optional)</label>
          <input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} className="input" />
        </div>
        <button onClick={handleCreate} disabled={busy} className="btn-primary w-full">
          {busy ? <Spinner /> : <Plus className="w-4 h-4" />} Create Video
        </button>
      </div>
    </Modal>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative card p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto animate-scale-in">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">{title}</h2>
          <button onClick={onClose} className="btn-ghost p-2"><X className="w-5 h-5" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}
