import { useEffect, useState, useCallback } from 'react';
import {
  fetchApiKeys, saveApiKey, toggleApiKey, deleteApiKey, testApiKey,
} from '@/lib/api';
import { API_PROVIDER_GROUPS, type ApiKey } from '@/lib/types';
import { PageHeader, Spinner, Toast } from '@/components/ui';
import {
  Plus, KeyRound, Trash2, Power, Zap, CheckCircle2, XCircle, Eye, EyeOff, ShieldCheck, Pencil,
} from 'lucide-react';

export function SettingsPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [showValue, setShowValue] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'info' | 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'info' | 'success' | 'error' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const load = useCallback(async () => {
    try {
      const data = await fetchApiKeys();
      setKeys(data);
    } catch (err) {
      showToast((err as Error).message, 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const getKey = (provider: string) => keys.find((k) => k.provider === provider);

  const handleSave = async (provider: string) => {
    if (!editValue.trim()) { showToast('Please enter a key value', 'error'); return; }
    try {
      await saveApiKey(provider, editValue.trim(), false);
      setEditing(null);
      setEditValue('');
      showToast(`${provider.replace(/_/g, ' ')} key saved`, 'success');
      await load();
    } catch (err) {
      showToast((err as Error).message, 'error');
    }
  };

  const handleToggle = async (provider: string, enabled: boolean) => {
    try {
      await toggleApiKey(provider, enabled);
      setKeys((ks) => ks.map((k) => k.provider === provider ? { ...k, enabled } : k));
      showToast(`${provider.replace(/_/g, ' ')} ${enabled ? 'enabled' : 'disabled'}`, 'success');
    } catch (err) {
      showToast((err as Error).message, 'error');
    }
  };

  const handleDelete = async (provider: string) => {
    if (!confirm(`Delete the key for ${provider.replace(/_/g, ' ')}?`)) return;
    try {
      await deleteApiKey(provider);
      showToast('Key deleted', 'success');
      await load();
    } catch (err) {
      showToast((err as Error).message, 'error');
    }
  };

  const handleTest = async (provider: string) => {
    setTesting(provider);
    try {
      const result = await testApiKey(provider);
      showToast(result.message, result.ok ? 'success' : 'error');
      await load();
    } catch (err) {
      showToast((err as Error).message, 'error');
    } finally {
      setTesting(null);
    }
  };

  return (
    <>
      <PageHeader
        title="API Manager"
        subtitle="Securely manage all your API keys. Keys are stored server-side and never exposed to the frontend."
      />

      {/* Security banner */}
      <div className="card p-4 mb-6 flex items-start gap-3 border-success-500/20">
        <ShieldCheck className="w-5 h-5 text-success-400 shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="text-slate-200 font-medium">All keys are encrypted at rest and stored server-side.</p>
          <p className="text-slate-500 text-xs mt-0.5">The frontend only sees masked previews. Enable a key after adding it to activate its features.</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Spinner className="w-8 h-8 text-brand-400" /></div>
      ) : (
        <div className="space-y-8">
          {API_PROVIDER_GROUPS.map((group) => (
            <div key={group.label}>
              <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-3">{group.label}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {group.providers.map((p) => {
                  const key = getKey(p.id);
                  const connected = key?.enabled && key?.status === 'connected';
                  const isEditing = editing === p.id;
                  return (
                    <div key={p.id} className="card p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-white truncate">{p.label}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{p.description}</p>
                        </div>
                        {key ? (
                          connected ? <span className="badge-success shrink-0"><CheckCircle2 className="w-3 h-3" /> Connected</span>
                          : key.enabled ? <span className="badge-warning shrink-0"><Zap className="w-3 h-3" /> Enabled</span>
                          : <span className="badge-neutral shrink-0">Not Connected</span>
                        ) : <span className="badge-neutral shrink-0">Not Connected</span>}
                      </div>

                      {key && (
                        <div className="flex items-center gap-2 mb-3 mt-2 px-3 py-2 rounded-lg bg-ink-850 border border-ink-700/50">
                          <KeyRound className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          <code className="text-xs text-slate-400 font-mono truncate flex-1">{key.key_preview}</code>
                          {key.last_tested_at && (
                            <span className={`text-[10px] ${key.last_test_ok ? 'text-success-400' : 'text-danger-400'}`}>
                              {key.last_test_ok ? 'tested OK' : 'test failed'}
                            </span>
                          )}
                        </div>
                      )}

                      {isEditing ? (
                        <div className="space-y-2">
                          <div className="relative">
                            <input
                              type={showValue ? 'text' : 'password'}
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              placeholder="Paste API key…"
                              className="input pr-10 text-sm"
                              autoFocus
                            />
                            <button
                              onClick={() => setShowValue((s) => !s)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                            >
                              {showValue ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => handleSave(p.id)} className="btn-primary text-xs flex-1">Save</button>
                            <button onClick={() => { setEditing(null); setEditValue(''); }} className="btn-secondary text-xs">Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {key ? (
                            <>
                              <button onClick={() => { setEditing(p.id); setEditValue(''); setShowValue(false); }} className="btn-secondary text-xs">
                                <Pencil className="w-3.5 h-3.5" /> Update
                              </button>
                              <button
                                onClick={() => handleToggle(p.id, !key.enabled)}
                                className={key.enabled ? 'btn-danger text-xs' : 'btn-secondary text-xs'}
                              >
                                <Power className="w-3.5 h-3.5" /> {key.enabled ? 'Disable' : 'Enable'}
                              </button>
                              <button onClick={() => handleTest(p.id)} disabled={testing === p.id} className="btn-secondary text-xs">
                                {testing === p.id ? <Spinner /> : <Zap className="w-3.5 h-3.5" />} Test
                              </button>
                              <button onClick={() => handleDelete(p.id)} className="btn-ghost text-xs text-danger-400">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          ) : (
                            <button onClick={() => { setEditing(p.id); setEditValue(''); setShowValue(false); }} className="btn-primary text-xs">
                              <Plus className="w-3.5 h-3.5" /> Add Key
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} />}
    </>
  );
}
