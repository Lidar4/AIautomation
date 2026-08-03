import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { fetchApiKeys, generateAiContent } from '@/lib/api';
import { PageHeader, Spinner, Toast, EmptyState } from '@/components/ui';
import type { ApiKey, AiGeneration } from '@/lib/types';
import {
  Sparkles, FileText, Type, AlignLeft, Hash, Tag, Image as ImageIcon, Mic, Video,
  Copy, Wand2, Clock,
} from 'lucide-react';

const TOOLS = [
  { id: 'script', label: 'Script Generator', icon: FileText, desc: 'Write engaging video scripts' },
  { id: 'title', label: 'Title Generator', icon: Type, desc: 'SEO-optimized video titles' },
  { id: 'description', label: 'Description Generator', icon: AlignLeft, desc: 'Full video descriptions' },
  { id: 'hashtag', label: 'Hashtag Generator', icon: Hash, desc: 'Trending hashtags for reach' },
  { id: 'tag', label: 'Tag Generator', icon: Tag, desc: 'Discoverability tags' },
  { id: 'thumbnail', label: 'Thumbnail Generator', icon: ImageIcon, desc: 'AI thumbnail concepts' },
  { id: 'voice', label: 'Voice Generation', icon: Mic, desc: 'AI voiceover from text' },
  { id: 'video', label: 'Video Generation', icon: Video, desc: 'AI video generation' },
] as const;

export function AiPipelinePage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [history, setHistory] = useState<AiGeneration[]>([]);
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [topic, setTopic] = useState('');
  const [tone, setTone] = useState('engaging');
  const [length, setLength] = useState('medium');
  const [provider, setProvider] = useState('openai');
  const [output, setOutput] = useState('');
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'info' | 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'info' | 'success' | 'error' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    (async () => {
      try {
        const [k, h] = await Promise.all([
          fetchApiKeys(),
          supabase.from('ai_generations').select('*').order('created_at', { ascending: false }).limit(20),
        ]);
        setKeys(k);
        setHistory((h.data ?? []) as AiGeneration[]);
      } catch {}
    })();
  }, []);

  const aiReady = keys.some((k) => k.enabled && ['openai', 'google_gemini', 'openrouter'].includes(k.provider));
  const enabledProviders = keys.filter((k) => k.enabled && ['openai', 'google_gemini', 'openrouter'].includes(k.provider));

  useEffect(() => {
    if (enabledProviders.length > 0 && !enabledProviders.find((k) => k.provider === provider)) {
      setProvider(enabledProviders[0].provider);
    }
  }, [enabledProviders, provider]);

  const handleGenerate = async () => {
    if (!activeTool) return;
    if (!prompt && !topic) { showToast('Enter a prompt or topic', 'error'); return; }
    setBusy(true);
    setOutput('');
    try {
      const result = await generateAiContent({
        type: activeTool, provider, prompt, topic, tone, length,
      });
      setOutput(result.output);
      showToast('Content generated', 'success');
      // Refresh history
      const { data } = await supabase.from('ai_generations').select('*').order('created_at', { ascending: false }).limit(20);
      setHistory((data ?? []) as AiGeneration[]);
    } catch (err) {
      showToast((err as Error).message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader title="AI Content Pipeline" subtitle="Generate scripts, titles, descriptions, hashtags, tags, thumbnails, and more" />

      {!aiReady && (
        <div className="card p-4 mb-6 border-warning-500/20">
          <div className="flex items-start gap-3">
            <Wand2 className="w-5 h-5 text-warning-400 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="text-slate-200 font-medium">No AI provider enabled.</p>
              <p className="text-slate-500 text-xs mt-0.5">Add and enable an OpenAI, Google Gemini, or OpenRouter key in the API Manager to use AI tools.</p>
            </div>
          </div>
        </div>
      )}

      {/* Tool grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-6">
        {TOOLS.map((tool) => {
          const Icon = tool.icon;
          const active = activeTool === tool.id;
          return (
            <button
              key={tool.id}
              onClick={() => { setActiveTool(tool.id); setOutput(''); }}
              disabled={!aiReady}
              className={`card p-4 text-left ${active ? 'border-brand-500/50 bg-brand-500/5' : 'card-hover'} disabled:opacity-40 disabled:cursor-not-allowed`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${active ? 'bg-brand-500/20' : 'bg-ink-800'}`}>
                <Icon className={`w-5 h-5 ${active ? 'text-brand-300' : 'text-slate-400'}`} />
              </div>
              <p className="text-sm font-medium text-white">{tool.label}</p>
              <p className="text-xs text-slate-500 mt-0.5">{tool.desc}</p>
            </button>
          );
        })}
      </div>

      {/* Active tool panel */}
      {activeTool && (
        <div className="card p-6 mb-6 animate-slide-up">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-brand-400" />
            <h2 className="text-lg font-semibold text-white">{TOOLS.find((t) => t.id === activeTool)?.label}</h2>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="label">Topic</label>
              <input value={topic} onChange={(e) => setTopic(e.target.value)} className="input" placeholder="e.g. How to start a YouTube channel" />
            </div>
            <div>
              <label className="label">Additional Instructions</label>
              <input value={prompt} onChange={(e) => setPrompt(e.target.value)} className="input" placeholder="Any extra guidance…" />
            </div>
            <div>
              <label className="label">Provider</label>
              <select value={provider} onChange={(e) => setProvider(e.target.value)} className="input">
                {enabledProviders.map((p) => (
                  <option key={p.provider} value={p.provider}>{p.provider.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Tone</label>
                <select value={tone} onChange={(e) => setTone(e.target.value)} className="input">
                  <option value="engaging">Engaging</option>
                  <option value="professional">Professional</option>
                  <option value="casual">Casual</option>
                  <option value="educational">Educational</option>
                  <option value="entertaining">Entertaining</option>
                </select>
              </div>
              <div>
                <label className="label">Length</label>
                <select value={length} onChange={(e) => setLength(e.target.value)} className="input">
                  <option value="short">Short</option>
                  <option value="medium">Medium</option>
                  <option value="long">Long</option>
                </select>
              </div>
            </div>
          </div>
          <button onClick={handleGenerate} disabled={busy || !aiReady} className="btn-primary">
            {busy ? <Spinner /> : <Wand2 className="w-4 h-4" />} Generate
          </button>

          {output && (
            <div className="mt-6">
              <div className="flex items-center justify-between mb-2">
                <label className="label mb-0">Output</label>
                <button
                  onClick={() => { navigator.clipboard.writeText(output); showToast('Copied to clipboard', 'success'); }}
                  className="btn-ghost text-xs"
                >
                  <Copy className="w-3.5 h-3.5" /> Copy
                </button>
              </div>
              <pre className="bg-ink-850 border border-ink-700 rounded-xl p-4 text-sm text-slate-200 whitespace-pre-wrap font-sans max-h-96 overflow-y-auto animate-fade-in">
                {output}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* History */}
      <div className="card p-5">
        <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
          <Clock className="w-4 h-4 text-slate-500" /> Recent Generations
        </h3>
        {history.length === 0 ? (
          <EmptyState icon={Sparkles} title="No generations yet" hint="Use a tool above to create AI content." />
        ) : (
          <div className="space-y-2">
            {history.map((g) => (
              <div key={g.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-ink-850">
                <Sparkles className="w-4 h-4 text-brand-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-200 capitalize">{g.type} · {g.provider}</p>
                  <p className="text-xs text-slate-500 truncate">{g.prompt || 'No prompt'}</p>
                </div>
                <span className="text-xs text-slate-600 shrink-0">{new Date(g.created_at).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {toast && <Toast message={toast.message} type={toast.type} />}
    </>
  );
}
