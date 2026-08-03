import type { ReactNode } from 'react';

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function StatCard({
  label, value, icon: Icon, accent = 'brand',
}: {
  label: string;
  value: ReactNode;
  icon: typeof import('lucide-react').Youtube;
  accent?: 'brand' | 'success' | 'warning' | 'danger' | 'accent';
}) {
  const colorMap = {
    brand: 'text-brand-400 bg-brand-500/10',
    success: 'text-success-400 bg-success-500/10',
    warning: 'text-warning-400 bg-warning-500/10',
    danger: 'text-danger-400 bg-danger-500/10',
    accent: 'text-accent-500 bg-accent-500/10',
  };
  return (
    <div className="card card-hover p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-slate-500 uppercase tracking-wider font-medium">{label}</span>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${colorMap[accent]}`}>
          <Icon className="w-[18px] h-[18px]" />
        </div>
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
    </div>
  );
}

export function EmptyState({ icon: Icon, title, hint }: { icon: typeof import('lucide-react').Youtube; title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-14 h-14 rounded-2xl bg-ink-800 flex items-center justify-center mb-4">
        <Icon className="w-7 h-7 text-slate-600" />
      </div>
      <p className="text-sm font-medium text-slate-300">{title}</p>
      {hint && <p className="text-xs text-slate-600 mt-1 max-w-sm">{hint}</p>}
    </div>
  );
}

export function Spinner({ className = '' }: { className?: string }) {
  return (
    <div className={`inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin ${className}`} />
  );
}

export function Toast({ message, type = 'info' }: { message: string; type?: 'info' | 'success' | 'error' }) {
  const styles = {
    info: 'bg-brand-500/15 text-brand-200 border-brand-500/25',
    success: 'bg-success-500/15 text-success-400 border-success-500/25',
    error: 'bg-danger-500/15 text-danger-400 border-danger-500/25',
  };
  return (
    <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl border text-sm animate-slide-up ${styles[type]}`}>
      {message}
    </div>
  );
}
