import { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from '@/lib/auth';
import { AuthScreen } from '@/components/AuthScreen';
import { DashboardLayout, type Page } from '@/components/DashboardLayout';
import { DashboardPage } from '@/pages/DashboardPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { YouTubePage } from '@/pages/YouTubePage';
import { AiPipelinePage } from '@/pages/AiPipelinePage';
import { TrendingPage } from '@/pages/TrendingPage';
import { SchedulerPage } from '@/pages/SchedulerPage';
import { Spinner } from '@/components/ui';
import { connectYouTube } from '@/lib/api';

function YouTubeCallback() {
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('');

  useEffect(() => {
    (async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      if (!code) { setStatus('error'); setMessage('No authorization code received.'); return; }
      const redirectUri = `${window.location.origin}/youtube/callback`;
      try {
        await connectYouTube(code, redirectUri);
        setStatus('success');
        setMessage('YouTube channel connected successfully!');
        setTimeout(() => { window.location.href = '/'; }, 2000);
      } catch (err) {
        setStatus('error');
        setMessage((err as Error).message);
      }
    })();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="card p-8 max-w-md text-center">
        {status === 'processing' && <Spinner className="w-8 h-8 text-brand-400 mx-auto" />}
        {status === 'success' && <p className="text-success-400 text-lg font-medium">{message}</p>}
        {status === 'error' && <p className="text-danger-400 text-sm">{message}</p>}
        {status === 'processing' && <p className="text-sm text-slate-400 mt-3">Connecting your YouTube channel…</p>}
      </div>
    </div>
  );
}

function AppInner() {
  const { loading, needsSetup, isAdmin, session } = useAuth();
  const [page, setPage] = useState<Page>('dashboard');

  // Simple hash-based routing for the YouTube callback
  if (window.location.pathname === '/youtube/callback') {
    return <YouTubeCallback />;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner className="w-8 h-8 text-brand-400" />
      </div>
    );
  }

  // If admin not yet created → show setup wizard
  if (needsSetup) return <AuthScreen />;

  // If admin exists but not signed in → show login
  if (!session || !isAdmin) return <AuthScreen />;

  return (
    <DashboardLayout current={page} onNavigate={setPage}>
      {page === 'dashboard' && <DashboardPage onNavigate={setPage} />}
      {page === 'youtube' && <YouTubePage />}
      {page === 'ai-pipeline' && <AiPipelinePage />}
      {page === 'trending' && <TrendingPage />}
      {page === 'scheduler' && <SchedulerPage />}
      {page === 'settings' && <SettingsPage />}
    </DashboardLayout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  );
}
