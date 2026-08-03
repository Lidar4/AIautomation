import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { fetchTrending } from '@/lib/api';
import { PageHeader, Spinner, Toast, EmptyState } from '@/components/ui';
import type { TrendingSearch } from '@/lib/types';
import { TrendingUp, Globe, Search, Clock, Eye, ThumbsUp, Flame } from 'lucide-react';

const COUNTRIES = ['USA', 'UK', 'Canada', 'Australia', 'Global'] as const;
const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Spanish' },
  { code: 'fr', label: 'French' },
  { code: 'de', label: 'German' },
  { code: 'pt', label: 'Portuguese' },
  { code: 'hi', label: 'Hindi' },
  { code: 'ar', label: 'Arabic' },
  { code: 'ja', label: 'Japanese' },
];
const AUDIENCES = ['General', 'Kids', 'Teens', 'Young Adults', 'Adults', 'Gamers', 'Tech', 'Lifestyle', 'Education', 'Entertainment'];

interface TrendingVideo {
  title: string;
  channel: string;
  views: string;
  likes: string;
  thumbnail: string;
  publishedAt: string;
}

export function TrendingPage() {
  const [country, setCountry] = useState<string>('Global');
  const [language, setLanguage] = useState('en');
  const [audience, setAudience] = useState('General');
  const [niche, setNiche] = useState('');
  const [topicIdeas, setTopicIdeas] = useState<string[]>([]);
  const [trendingVideos, setTrendingVideos] = useState<TrendingVideo[]>([]);
  const [history, setHistory] = useState<TrendingSearch[]>([]);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'info' | 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'info' | 'success' | 'error' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    supabase.from('trending_searches').select('*').order('created_at', { ascending: false }).limit(10)
      .then(({ data }) => setHistory((data ?? []) as TrendingSearch[]));
  }, []);

  const handleSearch = async () => {
    setBusy(true);
    try {
      const result = await fetchTrending({ country, language, audience, niche });
      setTopicIdeas(result.topicIdeas);
      setTrendingVideos(result.trendingVideos as TrendingVideo[]);
      const { data } = await supabase.from('trending_searches').select('*').order('created_at', { ascending: false }).limit(10);
      setHistory((data ?? []) as TrendingSearch[]);
      showToast('Trending topics loaded', 'success');
    } catch (err) {
      showToast((err as Error).message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader title="Trending System" subtitle="Discover trending topics across countries, languages, and audiences" />

      {/* Filters */}
      <div className="card p-5 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="label">Country</label>
            <select value={country} onChange={(e) => setCountry(e.target.value)} className="input">
              {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Language</label>
            <select value={language} onChange={(e) => setLanguage(e.target.value)} className="input">
              {LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Audience</label>
            <select value={audience} onChange={(e) => setAudience(e.target.value)} className="input">
              {AUDIENCES.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Niche (optional)</label>
            <input value={niche} onChange={(e) => setNiche(e.target.value)} className="input" placeholder="e.g. tech reviews" />
          </div>
        </div>
        <button onClick={handleSearch} disabled={busy} className="btn-primary">
          {busy ? <Spinner /> : <Search className="w-4 h-4" />} Find Trending Topics
        </button>
      </div>

      {/* Results */}
      {(topicIdeas.length > 0 || trendingVideos.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          {/* Topic ideas */}
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-4">
              <Flame className="w-4 h-4 text-accent-500" /> AI Topic Ideas
            </h3>
            {topicIdeas.length === 0 ? (
              <EmptyState icon={TrendingUp} title="No ideas yet" hint="Run a search to generate topic ideas." />
            ) : (
              <div className="space-y-2">
                {topicIdeas.map((idea, i) => (
                  <div key={i} className="flex items-start gap-2.5 px-3 py-2 rounded-lg bg-ink-850 hover:bg-ink-800 transition-colors">
                    <span className="text-xs font-bold text-brand-400 shrink-0 mt-0.5">{i + 1}</span>
                    <p className="text-sm text-slate-200">{idea}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Trending videos */}
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-4">
              <Globe className="w-4 h-4 text-brand-400" /> Trending on YouTube
            </h3>
            {trendingVideos.length === 0 ? (
              <EmptyState icon={Globe} title="No trending videos" hint="Add a YouTube Data API key to see live trending videos." />
            ) : (
              <div className="space-y-3">
                {trendingVideos.map((v, i) => (
                  <div key={i} className="flex gap-3">
                    {v.thumbnail && <img src={v.thumbnail} alt="" className="w-24 h-14 rounded-lg object-cover shrink-0" />}
                    <div className="min-w-0">
                      <p className="text-sm text-slate-200 line-clamp-2">{v.title}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{v.channel}</p>
                      <div className="flex gap-3 text-xs text-slate-600 mt-1">
                        <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {v.views}</span>
                        <span className="flex items-center gap-1"><ThumbsUp className="w-3 h-3" /> {v.likes}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Search history */}
      <div className="card p-5">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-4">
          <Clock className="w-4 h-4 text-slate-500" /> Recent Searches
        </h3>
        {history.length === 0 ? (
          <EmptyState icon={Search} title="No searches yet" />
        ) : (
          <div className="space-y-2">
            {history.map((s) => (
              <button
                key={s.id}
                onClick={() => {
                  setTopicIdeas(s.results.topicIdeas ?? []);
                  setTrendingVideos((s.results.trendingVideos ?? []) as TrendingVideo[]);
                  setCountry(s.country); setLanguage(s.language); setAudience(s.audience ?? 'General');
                }}
                className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg bg-ink-850 hover:bg-ink-800 transition-colors text-left"
              >
                <Globe className="w-4 h-4 text-brand-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-200">{s.query || 'All niches'} · {s.country} · {s.language}</p>
                  <p className="text-xs text-slate-500">{(s.results.topicIdeas ?? []).length} ideas · {new Date(s.created_at).toLocaleString()}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {toast && <Toast message={toast.message} type={toast.type} />}
    </>
  );
}
