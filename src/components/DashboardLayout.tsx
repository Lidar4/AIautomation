import { useState, type ReactNode } from 'react';
import { useAuth } from '@/lib/auth';
import {
  Youtube, LayoutDashboard, Settings, Video, Sparkles, TrendingUp, CalendarClock,
  LogOut, Menu, X, ShieldCheck,
} from 'lucide-react';

export type Page = 'dashboard' | 'youtube' | 'ai-pipeline' | 'trending' | 'scheduler' | 'settings';

interface NavItem {
  id: Page;
  label: string;
  icon: typeof LayoutDashboard;
}

const NAV: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'youtube', label: 'YouTube Automation', icon: Video },
  { id: 'ai-pipeline', label: 'AI Content Pipeline', icon: Sparkles },
  { id: 'trending', label: 'Trending System', icon: TrendingUp },
  { id: 'scheduler', label: 'Scheduler', icon: CalendarClock },
  { id: 'settings', label: 'API Manager', icon: Settings },
];

interface Props {
  current: Page;
  onNavigate: (p: Page) => void;
  children: ReactNode;
}

export function DashboardLayout({ current, onNavigate, children }: Props) {
  const { user, config, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const nav = (
    <nav className="flex flex-col gap-1">
      {NAV.map((item) => {
        const Icon = item.icon;
        const active = current === item.id;
        return (
          <button
            key={item.id}
            onClick={() => {
              onNavigate(item.id);
              setMobileOpen(false);
            }}
            className={active ? 'nav-item-active' : 'nav-item'}
          >
            <Icon className={`w-[18px] h-[18px] ${active ? 'text-brand-300' : ''}`} />
            {item.label}
          </button>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen flex">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-64 shrink-0 border-r border-ink-800 bg-ink-900/50 backdrop-blur-sm p-4">
        <div className="flex items-center gap-2.5 px-2 py-3 mb-6">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-lg shadow-brand-500/20">
            <Youtube className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-white leading-tight">TubePilot AI</p>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">Automation Platform</p>
          </div>
        </div>
        {nav}
        <div className="mt-auto pt-4 border-t border-ink-800">
          <div className="flex items-center gap-2.5 px-2 py-2 mb-2">
            <ShieldCheck className="w-4 h-4 text-success-400" />
            <span className="text-xs text-slate-400">Admin session active</span>
          </div>
          <div className="px-2 mb-3">
            <p className="text-xs text-slate-500 truncate">{user?.email}</p>
            {config?.youtube_connected && (
              <p className="text-[10px] text-success-400 mt-0.5">YouTube: {config.youtube_channel_title}</p>
            )}
          </div>
          <button onClick={signOut} className="btn-ghost w-full justify-start text-danger-400 hover:text-danger-300">
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-ink-900/95 backdrop-blur border-b border-ink-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center">
            <Youtube className="w-4.5 h-4.5 text-white" />
          </div>
          <span className="text-sm font-bold text-white">TubePilot AI</span>
        </div>
        <button onClick={() => setMobileOpen(true)} className="btn-ghost p-2">
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 animate-fade-in">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-72 bg-ink-900 border-r border-ink-800 p-4 animate-slide-up">
            <div className="flex justify-end mb-2">
              <button onClick={() => setMobileOpen(false)} className="btn-ghost p-2">
                <X className="w-5 h-5" />
              </button>
            </div>
            {nav}
            <div className="mt-6 pt-4 border-t border-ink-800">
              <p className="text-xs text-slate-500 truncate mb-2">{user?.email}</p>
              <button onClick={signOut} className="btn-ghost w-full justify-start text-danger-400">
                <LogOut className="w-4 h-4" /> Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 min-w-0 pt-16 lg:pt-0">
        <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 animate-fade-in">{children}</div>
      </main>
    </div>
  );
}
