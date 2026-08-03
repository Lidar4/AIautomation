import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { Youtube, ShieldCheck, Lock, Mail, User, Eye, EyeOff, ArrowRight, Sparkles } from 'lucide-react';

export function AuthScreen() {
  const { needsSetup, signIn, signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (needsSetup) {
        if (password.length < 8) throw new Error('Password must be at least 8 characters.');
        if (password !== confirm) throw new Error('Passwords do not match.');
        await signUp(email, password);
      } else {
        await signIn(email, password);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 animate-fade-in">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center mb-4 shadow-lg shadow-brand-500/30">
            <Youtube className="w-9 h-9 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">TubePilot AI</h1>
          <p className="text-sm text-slate-500 mt-1">AI YouTube Automation Platform</p>
        </div>

        <div className="card p-8 animate-slide-up">
          <div className="flex items-center gap-2 mb-6">
            {needsSetup ? (
              <>
                <Sparkles className="w-5 h-5 text-brand-400" />
                <h2 className="text-lg font-semibold text-white">Admin Setup Wizard</h2>
              </>
            ) : (
              <>
                <Lock className="w-5 h-5 text-brand-400" />
                <h2 className="text-lg font-semibold text-white">Admin Login</h2>
              </>
            )}
          </div>

          {needsSetup && (
            <div className="mb-6 p-3.5 rounded-xl bg-brand-500/10 border border-brand-500/20 text-sm text-brand-200">
              This is the first launch. Create your admin account to get started. After setup, this wizard is hidden permanently.
            </div>
          )}

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="label">Admin Email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@example.com"
                  className="input pl-11"
                  autoComplete="email"
                />
              </div>
            </div>

            <div>
              <label className="label">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type={showPw ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={needsSetup ? 'At least 8 characters' : 'Enter password'}
                  className="input pl-11 pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((s) => !s)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {needsSetup && (
              <div>
                <label className="label">Confirm Password</label>
                <div className="relative">
                  <ShieldCheck className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type={showPw ? 'text' : 'password'}
                    required
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="Re-enter password"
                    className="input pl-11"
                  />
                </div>
              </div>
            )}

            {error && (
              <div className="text-sm text-danger-400 bg-danger-500/10 border border-danger-500/20 rounded-xl px-4 py-3 animate-scale-in">
                {error}
              </div>
            )}

            <button type="submit" disabled={busy} className="btn-primary w-full">
              {busy ? 'Please wait…' : needsSetup ? 'Create Admin Account' : 'Sign In'}
              {!busy && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>

          <p className="text-xs text-slate-600 mt-6 text-center flex items-center justify-center gap-1.5">
            <User className="w-3 h-3" />
            Admin-only access. Sessions are securely managed.
          </p>
        </div>
      </div>
    </div>
  );
}
